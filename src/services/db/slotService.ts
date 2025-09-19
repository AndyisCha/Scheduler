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
      
      // Delete existing teachers
      await supabase
        .from('slot_teachers')
        .delete()
        .eq('slot_id', slotId)
      
      // Insert new teachers
      const teachersToInsert = [
        ...teachers.homeroomKoreanPool.map(name => ({
          slot_id: slotId,
          teacher_name: name,
          kind: 'homeroomKorean' as const
        })),
        ...teachers.foreignPool.map(name => ({
          slot_id: slotId,
          teacher_name: name,
          kind: 'foreign' as const
        }))
      ]
      
      if (teachersToInsert.length > 0) {
        const { error } = await supabase
          .from('slot_teachers')
          .insert(teachersToInsert)
        
        if (error) {
          throw error
        }
      }
    } catch (error) {
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
    userId: string
  ): Promise<void> {
    try {
      ensureSupabaseConfigured()
      const supabase = getSupabaseClient()
      
      const { data, error } = await supabase
        .from('generated_schedules')
        .insert({
          slot_id: slotId,
          day_group: dayGroup,
          created_by: userId,
          generation_batch_id: payload.generationBatchId,
          result: payload.result,
          warnings: payload.warnings || []
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
}

// Export singleton instance
export const slotService = new SlotService()