// Slot database service
import { ensureSupabaseConfigured, getSupabaseClient } from '../../lib/supabase'
import { getUserFriendlyErrorMessage } from './errorUtils'
import type { 
  DbSlot, 
  DbSlotTeacher, 
  DbTeacherConstraint, 
  DbFixedHomeroom, 
  DbGlobalOption,
  SlotConfig,
  SlotListItem,
  SlotScope,
} from './types'

export class SlotService {
  /**
   * List slots with minimal data for dropdowns
   */
  async listSlots(scope: SlotScope = 'mine', userId?: string): Promise<SlotListItem[]> {
    try {
      ensureSupabaseConfigured()
      const supabase = getSupabaseClient()
      
      let query = supabase
        .from('slots')
        .select('id, name, day_group, created_at, updated_at, created_by')
        .order('updated_at', { ascending: false })
      
      // Apply scope-based filtering
      if (scope === 'mine' && userId) {
        query = query.eq('created_by', userId)
      }
      // 'all' scope relies on RLS policies
      
      const { data, error } = await query
      
      if (error) {
        throw error
      }
      
      return (data || []).map((row: any) => ({
        id: row.id,
        name: row.name,
        dayGroup: row.day_group,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        createdBy: row.owner_id
      }))
    } catch (error) {
      throw new Error(getUserFriendlyErrorMessage(error))
    }
  }

  /**
   * Get full slot configuration for scheduling
   */
  async getSlotConfig(slotId: string): Promise<SlotConfig> {
    try {
      ensureSupabaseConfigured()
      const supabase = getSupabaseClient()
      
      // Parallel fetch of all related data
      const [
        { data: slot, error: slotError },
        { data: slotTeachers, error: teachersError },
        { data: constraints, error: constraintsError },
        { data: fixedHomerooms, error: homeroomsError },
        { data: globalOptions, error: optionsError }
      ] = await Promise.all([
        supabase
          .from('slots')
          .select('*')
          .eq('id', slotId)
          .single(),
        
        supabase
          .from('slot_teachers')
          .select('*')
          .eq('slot_id', slotId),
        
        supabase
          .from('teacher_constraints')
          .select('*')
          .eq('slot_id', slotId),
        
        supabase
          .from('fixed_homerooms')
          .select('*')
          .eq('slot_id', slotId),
        
        supabase
          .from('global_options')
          .select('*')
          .eq('slot_id', slotId)
      ])
      
      // Check for errors
      const errors = [slotError, teachersError, constraintsError, homeroomsError, optionsError]
      const firstError = errors.find(error => error)
      
      if (firstError) {
        console.error('getSlotConfig database errors:', {
          slotError,
          teachersError,
          constraintsError,
          homeroomsError,
          optionsError
        })
        throw firstError
      }
      
      if (!slot) {
        throw new Error('Slot not found')
      }
      
      // Map database rows to engine input format
      return this.mapDbToSlotConfig(
        slot as DbSlot,
        (slotTeachers || []) as DbSlotTeacher[],
        (constraints || []) as DbTeacherConstraint[],
        (fixedHomerooms || []) as DbFixedHomeroom[],
        (globalOptions || []) as DbGlobalOption[]
      )
    } catch (error) {
      throw new Error(getUserFriendlyErrorMessage(error))
    }
  }

  /**
   * Map database rows to engine input format
   */
  private mapDbToSlotConfig(
    slot: DbSlot,
    slotTeachers: DbSlotTeacher[],
    constraints: DbTeacherConstraint[],
    fixedHomerooms: DbFixedHomeroom[],
    globalOptions: DbGlobalOption[]
  ): SlotConfig {
    // Group teachers by kind
    const homeroomKoreanPool: string[] = []
    const foreignPool: string[] = []
    
    slotTeachers.forEach(st => {
      if (st.kind === 'H_K_POOL') {
        homeroomKoreanPool.push(st.teacher_name)
      } else if (st.kind === 'FOREIGN') {
        foreignPool.push(st.teacher_name)
      }
    })
    
    // Map teacher constraints
    const teacherConstraints: Record<string, {
      unavailable: string[]
      homeroomDisabled: boolean
      maxHomerooms?: number
    }> = {}
    
    constraints.forEach(constraint => {
      teacherConstraints[constraint.teacher_name] = {
        unavailable: constraint.unavailable || [],
        homeroomDisabled: constraint.homeroom_disabled,
        maxHomerooms: constraint.max_homerooms
      }
    })
    
    // Map fixed homerooms
    const fixedHomeroomsMap: Record<string, string> = {}
    fixedHomerooms.forEach(fh => {
      fixedHomeroomsMap[fh.teacher_name] = fh.class_id
    })
    
    // Get global options (should be single row)
    const globalOptionsData = globalOptions[0] || {
      include_h_in_k: true,
      prefer_other_h_for_k: false,
      disallow_own_h_as_k: true,
      round_class_counts: { '1': 3, '2': 3, '3': 3, '4': 3 }
    }
    
    return {
      id: slot.id,
      name: slot.name,
      description: slot.description,
      dayGroup: (slot.day_group as 'MWF' | 'TT') || 'MWF',
      createdBy: slot.created_by || slot.owner_id,
      createdAt: slot.created_at,
      updatedAt: slot.updated_at,
      teachers: {
        homeroomKoreanPool,
        foreignPool
      },
      teacherConstraints,
      fixedHomerooms: fixedHomeroomsMap,
      globalOptions: {
        includeHInK: globalOptionsData.include_h_in_k ?? true,
        preferOtherHForK: globalOptionsData.prefer_other_h_for_k ?? true,
        disallowOwnHAsK: globalOptionsData.disallow_own_h_as_k ?? true,
        roundClassCounts: globalOptionsData.round_class_counts ?? { 1: 2, 2: 2, 3: 2, 4: 2 }
      }
    }
  }

  /**
   * Get slots by day group (MWF or TT)
   */
  async getSlotsByDayGroup(dayGroup: 'MWF' | 'TT', userId: string, userRole: 'ADMIN' | 'SUPER_ADMIN'): Promise<SlotConfig[]> {
    try {
      ensureSupabaseConfigured()
      const supabase = getSupabaseClient()
      
      // 먼저 테이블 구조를 확인하기 위해 간단한 쿼리 실행
      console.log('🔍 Checking slots table structure...')
      const { data: testData, error: testError } = await supabase
        .from('slots')
        .select('*')
        .limit(1)
      
      if (testData && testData.length > 0) {
        console.log('🔍 Current slots table columns:', Object.keys(testData[0]))
        console.log('🔍 Available columns:', Object.keys(testData[0]).join(', '))
        
        // Check if slot_data column exists
        const hasSlotData = 'slot_data' in testData[0]
        console.log('🔍 Has slot_data column:', hasSlotData)
        
        if (!hasSlotData) {
          console.error('❌ slot_data column does not exist in slots table!')
          console.log('🔍 Available columns:', Object.keys(testData[0]))
        }
      }
      
      if (testError) {
        console.error('❌ Error accessing slots table:', testError)
        throw testError
      }
      
      console.log('✅ Slots table accessible. Sample data:', testData)
      
      // 실제 컬럼명을 확인하고 적절한 쿼리 실행
      let query = supabase
        .from('slots')
        .select('*')
        .order('updated_at', { ascending: false })
      
      // Apply RLS filtering based on user role
      if (userRole === 'ADMIN') {
        query = query.eq('created_by', userId)
      }
      // SUPER_ADMIN can see all slots (relies on RLS policies)
      
      const { data, error } = await query
      
      if (error) {
        console.error('❌ Error querying slots:', error)
        throw error
      }
      
      console.log('📦 All slots data:', data)
      console.log('📋 Sample slot structure:', data[0])
      console.log('📋 Sample slot_data raw:', data[0]?.slot_data)
      console.log('📋 Sample slot_data type:', typeof data[0]?.slot_data)
      if (data[0]?.slot_data) {
        try {
          const parsedData = typeof data[0].slot_data === 'string' ? JSON.parse(data[0].slot_data) : data[0].slot_data
          console.log('📋 Sample slot_data parsed:', parsedData)
          console.log('📋 Sample teachers from parsed:', parsedData.teachers)
          console.log('📋 Sample teachers structure:', {
            homeroomKoreanPool: parsedData.teachers?.homeroomKoreanPool,
            foreignPool: parsedData.teachers?.foreignPool,
            homeroomKoreanPoolType: typeof parsedData.teachers?.homeroomKoreanPool,
            foreignPoolType: typeof parsedData.teachers?.foreignPool
          })
        } catch (error) {
          console.error('❌ Error parsing slot_data:', error)
        }
      }
      
      // 현재 데이터베이스에 슬롯이 없으면 Mock 데이터 사용
      if (!data || data.length === 0) {
        console.log('🔄 No slots in database, using mock data')
        return this.getMockSlotsByDayGroup(dayGroup)
      }
      
      // day_group 컬럼이 없을 경우 slot_data에서 추출하거나 기본값 사용
      const filteredSlots = (data || []).filter((row: any) => {
        // day_group 컬럼이 있으면 사용, 없으면 slot_data에서 추출하거나 기본값 사용
        const rowDayGroup = row.day_group || row.slot_data?.dayGroup || 'MWF'
        return rowDayGroup === dayGroup
      })
      
      console.log(`🎯 Filtered ${dayGroup} slots:`, filteredSlots)
      
      // 실제 데이터가 있으면 실제 데이터 사용, 없으면 Mock 데이터 사용
      if (filteredSlots.length === 0) {
        console.log('🔄 No matching slots found, using mock data')
        return this.getMockSlotsByDayGroup(dayGroup)
      }
      
      // Convert to SlotConfig format with actual data
      return filteredSlots.map((row: any) => {
        // slot_data가 JSON 문자열인 경우 파싱
        let slotData: any = {}
        try {
          if (typeof row.slot_data === 'string') {
            slotData = JSON.parse(row.slot_data)
          } else if (typeof row.slot_data === 'object') {
            slotData = row.slot_data
          }
        } catch (error) {
          console.error('❌ Error parsing slot_data:', error)
          slotData = {}
        }
        
        const teachers = slotData.teachers || {}
        
        console.log('🔄 Processing slot:', row.name, 'slotData:', slotData, 'teachers:', teachers)
        
        return {
          id: row.id,
          name: row.name,
          description: row.description,
          dayGroup: row.day_group || slotData.dayGroup || dayGroup,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          createdBy: row.created_by,
          teachers: {
            homeroomKoreanPool: teachers.homeroomKoreanPool || [],
            foreignPool: teachers.foreignPool || []
          },
          teacherConstraints: slotData.teacherConstraints || {},
          fixedHomerooms: slotData.fixedHomerooms || {},
          globalOptions: slotData.globalOptions || {
            includeHInK: true,
            preferOtherHForK: false,
            disallowOwnHAsK: true,
            roundClassCounts: { 1: 3, 2: 3, 3: 3, 4: 3 }
          }
        }
      })
    } catch (error) {
      console.error('❌ Error in getSlotsByDayGroup:', error)
      throw new Error(getUserFriendlyErrorMessage(error))
    }
  }

  /**
   * Get mock slots by day group (fallback when DB is empty)
   */
  private getMockSlotsByDayGroup(dayGroup: 'MWF' | 'TT'): SlotConfig[] {
    const mockSlots: SlotConfig[] = [
      {
        id: 'mwf-slot-1',
        name: 'MWF 기본 슬롯',
        description: '월수금 기본 스케줄 슬롯',
        dayGroup: 'MWF',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        createdBy: 'mock-user',
        teachers: {
          homeroomKoreanPool: ['김선생', '이선생', '박선생', '최선생'],
          foreignPool: ['John', 'Sarah']
        },
        teacherConstraints: {
          '김선생': { maxHomerooms: 2 },
          '이선생': { maxHomerooms: 2 },
          '박선생': { maxHomerooms: 2 },
          '최선생': { maxHomerooms: 2 },
          'John': {},
          'Sarah': {}
        },
        fixedHomerooms: {},
        globalOptions: {
          includeHInK: true,
          preferOtherHForK: true,
          disallowOwnHAsK: false,
          roundClassCounts: { 1: 2, 2: 2, 3: 2, 4: 2 }
        }
      },
      {
        id: 'mwf-slot-2',
        name: 'MWF 대형 슬롯',
        description: '월수금 대형 스케줄 슬롯',
        dayGroup: 'MWF',
        createdAt: '2024-01-02T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
        createdBy: 'mock-user',
        teachers: {
          homeroomKoreanPool: ['김선생', '이선생', '박선생', '최선생', '정선생', '한선생'],
          foreignPool: ['John', 'Sarah', 'Mike', 'Lisa']
        },
        teacherConstraints: {
          '김선생': { maxHomerooms: 3 },
          '이선생': { maxHomerooms: 3 },
          '박선생': { maxHomerooms: 3 },
          '최선생': { maxHomerooms: 3 },
          '정선생': { maxHomerooms: 3 },
          '한선생': { maxHomerooms: 3 },
          'John': {},
          'Sarah': {},
          'Mike': {},
          'Lisa': {}
        },
        fixedHomerooms: {},
        globalOptions: {
          includeHInK: true,
          preferOtherHForK: true,
          disallowOwnHAsK: false,
          roundClassCounts: { 1: 3, 2: 3, 3: 3, 4: 3 }
        }
      },
      {
        id: 'tt-slot-1',
        name: 'TT 기본 슬롯',
        description: '화목 기본 스케줄 슬롯',
        dayGroup: 'TT',
        createdAt: '2024-01-03T00:00:00Z',
        updatedAt: '2024-01-03T00:00:00Z',
        createdBy: 'mock-user',
        teachers: {
          homeroomKoreanPool: ['김선생', '이선생', '박선생'],
          foreignPool: ['John', 'Sarah']
        },
        teacherConstraints: {
          '김선생': { maxHomerooms: 2 },
          '이선생': { maxHomerooms: 2 },
          '박선생': { maxHomerooms: 2 },
          'John': {},
          'Sarah': {}
        },
        fixedHomerooms: {},
        globalOptions: {
          includeHInK: true,
          preferOtherHForK: true,
          disallowOwnHAsK: false,
          roundClassCounts: { 1: 2, 2: 2, 3: 2, 4: 2 }
        }
      }
    ]
    
    return mockSlots.filter(slot => slot.dayGroup === dayGroup)
  }

  /**
   * Create a new slot
   */
  async createSlot(
    slotData: {
      name: string
      description?: string
      dayGroup: 'MWF' | 'TT'
      userId: string
    }
  ): Promise<SlotConfig> {
    try {
      ensureSupabaseConfigured()
      const supabase = getSupabaseClient()
      
      // Create slot
      const { data: slot, error: slotError } = await supabase
        .from('slots')
        .insert({
          name: slotData.name,
          description: slotData.description,
          day_group: slotData.dayGroup,
          created_by: slotData.userId
        })
        .select()
        .single()
      
      if (slotError) {
        throw slotError
      }
      
      // Create default global options
      const { error: optionsError } = await supabase
        .from('global_options')
        .insert({
          slot_id: slot.id,
          include_h_in_k: true,
          prefer_other_h_for_k: false,
          disallow_own_h_as_k: true,
          round_class_counts: { '1': 3, '2': 3, '3': 3, '4': 3 }
        })
      
      if (optionsError) {
        console.error('Error creating default global options:', optionsError)
        throw optionsError
      }
      
      // Return slot config with empty data
      return {
        id: slot.id,
        name: slot.name,
        description: slot.description,
        dayGroup: slot.day_group,
        createdBy: slot.created_by,
        createdAt: slot.created_at,
        updatedAt: slot.updated_at,
        teachers: {
          homeroomKoreanPool: [],
          foreignPool: []
        },
        teacherConstraints: {},
        fixedHomerooms: {},
        globalOptions: {
          includeHInK: true,
          preferOtherHForK: false,
          disallowOwnHAsK: true,
          roundClassCounts: { 1: 3, 2: 3, 3: 3, 4: 3 }
        }
      }
    } catch (error) {
      throw new Error(getUserFriendlyErrorMessage(error))
    }
  }

  /**
   * Update slot basic info
   */
  async updateSlot(
    slotId: string,
    updates: {
      name?: string
      description?: string
    }
  ): Promise<void> {
    try {
      ensureSupabaseConfigured()
      const supabase = getSupabaseClient()
      
      const { error } = await supabase
        .from('slots')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', slotId)
      
      if (error) {
        throw error
      }
    } catch (error) {
      throw new Error(getUserFriendlyErrorMessage(error))
    }
  }

  /**
   * Update slot teachers
   */
  async updateSlotTeachers(
    slotId: string,
    teachers: {
      homeroomKoreanPool: string[]
      foreignPool: string[]
    }
  ): Promise<void> {
    try {
      ensureSupabaseConfigured()
      const supabase = getSupabaseClient()
      
      console.log('🔄 Updating slot teachers:', { slotId, teachers })
      
      // Get current slot data - check available columns first
      const { data: currentSlot, error: fetchError } = await supabase
        .from('slots')
        .select('*')
        .eq('id', slotId)
        .single()
      
      if (fetchError) {
        throw fetchError
      }
      
      console.log('🔍 Current slot columns:', Object.keys(currentSlot))
      
      // Parse current slot_data or use alternative approach
      let slotData: any = {}
      if ('slot_data' in currentSlot) {
        try {
          if (typeof currentSlot.slot_data === 'string') {
            slotData = JSON.parse(currentSlot.slot_data)
          } else if (typeof currentSlot.slot_data === 'object') {
            slotData = currentSlot.slot_data
          }
        } catch (parseError) {
          console.error('❌ Error parsing slot_data:', parseError)
          slotData = {}
        }
      } else {
        console.log('⚠️ slot_data column not found, using alternative approach')
        // If slot_data doesn't exist, we need to create it or use another approach
        slotData = {
          teachers: {
            homeroomKoreanPool: [],
            foreignPool: []
          },
          teacherConstraints: {},
          fixedHomerooms: [],
          globalOptions: {}
        }
      }
      
      // Update teachers in slot_data
      slotData.teachers = {
        homeroomKoreanPool: teachers.homeroomKoreanPool,
        foreignPool: teachers.foreignPool
      }
      
      console.log('📦 Updated slot_data:', slotData)
      
      // Update slot_data in database
      let updatePayload: any = {
        updated_at: new Date().toISOString()
      }
      
      if ('slot_data' in currentSlot) {
        updatePayload.slot_data = slotData
      } else {
        console.log('⚠️ slot_data column not available, cannot update teachers')
        throw new Error('slot_data column does not exist in slots table. Please add the column or use alternative storage method.')
      }
      
      const { error: updateError } = await supabase
        .from('slots')
        .update(updatePayload)
        .eq('id', slotId)
      
      if (updateError) {
        throw updateError
      }
      
      console.log('✅ Slot teachers updated successfully')
    } catch (error) {
      console.error('❌ Error updating slot teachers:', error)
      throw new Error(getUserFriendlyErrorMessage(error))
    }
  }

  /**
   * Update teacher constraints
   */
  async updateTeacherConstraints(
    slotId: string,
    constraints: Record<string, {
      unavailable: string[]
      homeroomDisabled: boolean
      maxHomerooms?: number
    }>
  ): Promise<void> {
    try {
      ensureSupabaseConfigured()
      const supabase = getSupabaseClient()
      
      // Delete existing constraints
      await supabase
        .from('teacher_constraints')
        .delete()
        .eq('slot_id', slotId)
      
      // Insert new constraints
      const constraintsToInsert = Object.entries(constraints).map(([teacherName, constraint]) => ({
        slot_id: slotId,
        teacher_name: teacherName,
        unavailable: constraint.unavailable,
        homeroom_disabled: constraint.homeroomDisabled,
        max_homerooms: constraint.maxHomerooms
      }))
      
      if (constraintsToInsert.length > 0) {
        const { error } = await supabase
          .from('teacher_constraints')
          .insert(constraintsToInsert)
        
        if (error) {
          throw error
        }
      }
    } catch (error) {
      throw new Error(getUserFriendlyErrorMessage(error))
    }
  }

  /**
   * Update fixed homerooms
   */
  async updateFixedHomerooms(
    slotId: string,
    fixedHomerooms: Record<string, string>
  ): Promise<void> {
    try {
      ensureSupabaseConfigured()
      const supabase = getSupabaseClient()
      
      // Delete existing fixed homerooms
      await supabase
        .from('fixed_homerooms')
        .delete()
        .eq('slot_id', slotId)
      
      // Insert new fixed homerooms
      const homeroomsToInsert = Object.entries(fixedHomerooms).map(([teacherName, classId]) => ({
        slot_id: slotId,
        teacher_name: teacherName,
        class_id: classId
      }))
      
      if (homeroomsToInsert.length > 0) {
        const { error } = await supabase
          .from('fixed_homerooms')
          .insert(homeroomsToInsert)
        
        if (error) {
          throw error
        }
      }
    } catch (error) {
      throw new Error(getUserFriendlyErrorMessage(error))
    }
  }

  /**
   * Update global options
   */
  async updateGlobalOptions(
    slotId: string,
    options: {
      include_h_in_k: boolean
      prefer_other_h_for_k: boolean
      disallow_own_h_as_k: boolean
      roundClassCounts: Record<string, number>
    }
  ): Promise<void> {
    try {
      ensureSupabaseConfigured()
      const supabase = getSupabaseClient()
      
      const { error } = await supabase
        .from('global_options')
        .upsert({
          slot_id: slotId,
          include_h_in_k: options.include_h_in_k,
          prefer_other_h_for_k: options.prefer_other_h_for_k,
          disallow_own_h_as_k: options.disallow_own_h_as_k,
          round_class_counts: options.roundClassCounts
        })
      
      if (error) {
        throw error
      }
    } catch (error) {
      throw new Error(getUserFriendlyErrorMessage(error))
    }
  }

  /**
   * Delete slot and all related data
   */
  async deleteSlot(slotId: string): Promise<void> {
    try {
      ensureSupabaseConfigured()
      const supabase = getSupabaseClient()
      
      // Delete slot (cascade will handle related tables)
      const { error } = await supabase
        .from('slots')
        .delete()
        .eq('id', slotId)
      
      if (error) {
        throw error
      }
    } catch (error) {
      throw new Error(getUserFriendlyErrorMessage(error))
    }
  }

  /**
   * Save generated schedule to database
   */
  async saveGenerated(
    slotId: string, 
    dayGroup: 'MWF' | 'TT',
    payload: { 
      result: any
      warnings?: string[]
      generationBatchId?: string
    },
    userId: string,
    algorithmVersion: string = 'v2.0'
  ): Promise<void> {
    try {
      ensureSupabaseConfigured()
      const supabase = getSupabaseClient()
      
      // 교사 일관성 메트릭스 계산
      const teacherConsistencyMetrics = this.calculateTeacherConsistencyMetrics(payload.result);
      
      // 라운드별 통계 계산
      const roundStatistics = this.calculateRoundStatistics(payload.result);
      
      // 검증 상세 정보
      const validationDetails = {
        algorithm_version: algorithmVersion,
        generation_timestamp: new Date().toISOString(),
        total_assignments: this.countTotalAssignments(payload.result),
        teacher_consistency_score: teacherConsistencyMetrics.overall_consistency_score
      };
      
      const { data, error } = await supabase
        .from('generated_schedules')
        .insert({
          slot_id: slotId,
          day_group: dayGroup,
          created_by: userId,
          generation_batch_id: payload.generationBatchId,
          result: payload.result,
          warnings: payload.warnings || [],
          algorithm_version: algorithmVersion,
          teacher_consistency_metrics: teacherConsistencyMetrics,
          round_statistics: roundStatistics,
          validation_details: validationDetails
        })
        .select()
        .single()
      
      if (error) {
        throw error
      }
      
      if (!data) {
        throw new Error('Failed to save generated schedule')
      }
    } catch (error) {
      throw new Error(getUserFriendlyErrorMessage(error))
    }
  }
  
  /**
   * Calculate teacher consistency metrics for database storage
   */
  private calculateTeacherConsistencyMetrics(result: any): any {
    const metrics: any = {
      overall_consistency_score: 1.0
    };
    
    // MWF 일관성 체크
    if (result.mwf) {
      const mwfDays = Object.keys(result.mwf);
      const classConsistency: { [classId: string]: { homeroom: string[], korean: string[], foreign: string[] } } = {};
      
      mwfDays.forEach((day: string) => {
        const dayResult = result.mwf[day];
        if (dayResult.periods) {
          Object.keys(dayResult.periods).forEach(period => {
            const assignments = dayResult.periods[parseInt(period)];
            if (Array.isArray(assignments)) {
              assignments.forEach((assignment: any) => {
                const classId = assignment.classId;
                if (!classConsistency[classId]) {
                  classConsistency[classId] = { homeroom: [], korean: [], foreign: [] };
                }
                const roleKey = assignment.role.toLowerCase() as 'homeroom' | 'korean' | 'foreign';
                if (classConsistency[classId][roleKey]) {
                  classConsistency[classId][roleKey].push(assignment.teacher);
                }
              });
            }
          });
        }
      });
      
      // 일관성 점수 계산
      Object.keys(classConsistency).forEach(classId => {
        const consistency = classConsistency[classId];
        const homeroomConsistent = new Set(consistency.homeroom).size === 1;
        const koreanConsistent = new Set(consistency.korean).size === 1;
        const foreignConsistent = new Set(consistency.foreign).size === 1;
        
        metrics[classId] = {
          homeroom: consistency.homeroom[0] || '미배정',
          korean: consistency.korean[0] || '미배정',
          foreign: consistency.foreign[0] || '미배정',
          consistency: homeroomConsistent && koreanConsistent && foreignConsistent ? '완전 일관' : '부분 일관'
        };
      });
      
      // 전체 일관성 점수 계산
      const totalClasses = Object.keys(classConsistency).length;
      const consistentClasses = Object.values(metrics).filter((m: any) => m.consistency === '완전 일관').length;
      metrics.overall_consistency_score = totalClasses > 0 ? consistentClasses / totalClasses : 1.0;
    }
    
    return metrics;
  }
  
  /**
   * Calculate round statistics for database storage
   */
  private calculateRoundStatistics(result: any): any {
    const stats: any = {};
    
    // MWF 통계
    if (result.mwf) {
      const mwfDays = Object.keys(result.mwf);
      mwfDays.forEach((day: string) => {
        const dayResult = result.mwf[day];
        if (dayResult.periods) {
          Object.keys(dayResult.periods).forEach(period => {
            const assignments = dayResult.periods[parseInt(period)];
            if (Array.isArray(assignments)) {
              assignments.forEach((assignment: any) => {
                const round = `R${assignment.round}`;
                if (!stats[round]) {
                  stats[round] = { homeroom: 0, korean: 0, foreign: 0 };
                }
                const roleKey = assignment.role.toLowerCase() as 'homeroom' | 'korean' | 'foreign';
                if (stats[round][roleKey] !== undefined) {
                  stats[round][roleKey]++;
                }
              });
            }
          });
        }
      });
    }
    
    return stats;
  }
  
  /**
   * Count total assignments in result
   */
  private countTotalAssignments(result: any): number {
    let count = 0;
    
    if (result.mwf) {
      Object.keys(result.mwf).forEach((day: string) => {
        const dayResult = result.mwf[day];
        if (dayResult.periods) {
          Object.keys(dayResult.periods).forEach(period => {
            const assignments = dayResult.periods[parseInt(period)];
            if (Array.isArray(assignments)) {
              count += assignments.length;
            }
          });
        }
      });
    }
    
    if (result.tt) {
      Object.keys(result.tt).forEach((day: string) => {
        const dayResult = result.tt[day];
        if (dayResult.periods) {
          Object.keys(dayResult.periods).forEach(period => {
            const assignments = dayResult.periods[parseInt(period)];
            if (Array.isArray(assignments)) {
              count += assignments.length;
            }
          });
        }
      });
    }
    
    return count;
  }
}

// Export singleton instance
export const slotService = new SlotService()