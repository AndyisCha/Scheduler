import { getSupabaseClient } from '../../lib/supabase'
import type { 
  DbSlot, 
  DbSlotTeacher, 
  DbTeacherConstraint, 
  DbFixedHomeroom, 
  DbGlobalOption,
  DbGeneratedSchedule,
  DbError 
} from './types'
import type { SlotConfig } from '../../engine/types'

// Error helper to convert any error to DbError
function toDbError(e: any): DbError {
  if (e?.message) {
    return {
      message: e.message,
      code: e.code,
      details: e.details
    }
  }
  return {
    message: String(e),
    details: e
  }
}

// List slots with optional scope filtering
export async function listSlots(scope: "mine" | "all" = "mine"): Promise<DbSlot[]> {
  try {
    const supabase = getSupabaseClient()
    
    let query = supabase
      .from('slots')
      .select('id, name, created_at, updated_at, owner_id')
      .order('updated_at', { ascending: false })
    
    // Client-side filtering for "mine" scope (server RLS will also enforce this)
    if (scope === "mine") {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('Authentication required')
      }
      query = query.eq('owner_id', user.id)
    }
    
    const { data, error } = await query
    
    if (error) {
      throw toDbError(error)
    }
    
    return data || []
  } catch (error) {
    console.error('listSlots error:', error)
    throw toDbError(error)
  }
}

// Get complete slot configuration for scheduler engine
export async function getSlotConfig(slotId: string): Promise<SlotConfig> {
  try {
    const supabase = getSupabaseClient()
    
    // Parallel fetch of all related data
    const [
      slotResult,
      teachersResult,
      constraintsResult,
      fixedHomeroomsResult,
      globalOptionsResult
    ] = await Promise.all([
      // Get slot basic info
      supabase
        .from('slots')
        .select('id, name, description')
        .eq('id', slotId)
        .single(),
      
      // Get slot teachers
      supabase
        .from('slot_teachers')
        .select('teacher_name, kind')
        .eq('slot_id', slotId),
      
      // Get teacher constraints
      supabase
        .from('teacher_constraints')
        .select('teacher_name, homeroom_disabled, max_homerooms, unavailable')
        .eq('slot_id', slotId),
      
      // Get fixed homerooms
      supabase
        .from('fixed_homerooms')
        .select('teacher_name, class_id')
        .eq('slot_id', slotId),
      
      // Get global options
      supabase
        .from('global_options')
        .select('key, value')
        .eq('slot_id', slotId)
    ])
    
    // Check for errors
    if (slotResult.error) throw toDbError(slotResult.error)
    if (teachersResult.error) throw toDbError(teachersResult.error)
    if (constraintsResult.error) throw toDbError(constraintsResult.error)
    if (fixedHomeroomsResult.error) throw toDbError(fixedHomeroomsResult.error)
    if (globalOptionsResult.error) throw toDbError(globalOptionsResult.error)
    
    const slot = slotResult.data
    const teachers = teachersResult.data || []
    const constraints = constraintsResult.data || []
    const fixedHomerooms = fixedHomeroomsResult.data || []
    const globalOptions = globalOptionsResult.data || []
    
    // Transform data to SlotConfig format
    const homeroomKoreanPool = teachers
      .filter(t => t.kind === 'H_K_POOL')
      .map(t => t.teacher_name)
    
    const foreignPool = teachers
      .filter(t => t.kind === 'FOREIGN')
      .map(t => t.teacher_name)
    
    const teacherConstraints = constraints.reduce((acc, c) => {
      acc[c.teacher_name] = {
        teacherName: c.teacher_name,
        unavailablePeriods: (c.unavailable || []).map(Number),
        homeroomDisabled: c.homeroom_disabled,
        maxHomerooms: c.max_homerooms
      }
      return acc
    }, {} as Record<string, { teacherName: string; unavailablePeriods: number[]; homeroomDisabled: boolean; maxHomerooms: number }>)
    
    const fixedHomeroomsMap = fixedHomerooms.reduce((acc, f) => {
      acc[f.teacher_name] = f.class_id
      return acc
    }, {} as Record<string, string>)
    
    const globalOptionsMap = globalOptions.reduce((acc, g) => {
      acc[g.key] = g.value
      return acc
    }, {} as Record<string, any>)
    
    return {
      id: slot.id,
      name: slot.name,
      description: slot.description || '',
      dayGroup: (slot as any).day_group || 'MWF',
      teachers: {
        homeroomKoreanPool,
        foreignPool
      },
      teacherConstraints,
      fixedHomerooms: fixedHomeroomsMap,
      globalOptions: {
        includeHInK: globalOptionsMap.include_h_in_k ?? true,
        preferOtherHForK: globalOptionsMap.prefer_other_h_for_k ?? true,
        disallowOwnHAsK: globalOptionsMap.disallow_own_h_as_k ?? true,
        roundClassCounts: globalOptionsMap.round_class_counts ?? { 1: 2, 2: 2, 3: 2, 4: 2 }
      }
    }
  } catch (error) {
    console.error('getSlotConfig error:', error)
    throw toDbError(error)
  }
}

// Save generated schedule result
export async function saveGenerated(
  slotId: string, 
  payload: { result: any; warnings: any[] }
): Promise<DbGeneratedSchedule> {
  try {
    const supabase = getSupabaseClient()
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('Authentication required')
    }
    
    const { data, error } = await supabase
      .from('generated_schedules')
      .insert({
        slot_id: slotId,
        created_by: user.id,
        result: payload.result,
        warnings: payload.warnings
      })
      .select()
      .single()
    
    if (error) {
      throw toDbError(error)
    }
    
    return data
  } catch (error) {
    console.error('saveGenerated error:', error)
    throw toDbError(error)
  }
}

// Get generated schedules for a slot (for history)
export async function getGeneratedSchedules(slotId: string): Promise<DbGeneratedSchedule[]> {
  try {
    const supabase = getSupabaseClient()
    
    const { data, error } = await supabase
      .from('generated_schedules')
      .select('id, slot_id, created_by, result, warnings, created_at')
      .eq('slot_id', slotId)
      .order('created_at', { ascending: false })
    
    if (error) {
      throw toDbError(error)
    }
    
    return data || []
  } catch (error) {
    console.error('getGeneratedSchedules error:', error)
    throw toDbError(error)
  }
}

// CRUD operations for slots
export async function createSlot(name: string, description?: string): Promise<DbSlot> {
  try {
    const supabase = getSupabaseClient()
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('Authentication required')
    }
    
    const { data, error } = await supabase
      .from('slots')
      .insert({
        name,
        description: description || '',
        owner_id: user.id
      })
      .select()
      .single()
    
    if (error) {
      throw toDbError(error)
    }
    
    return data
  } catch (error) {
    console.error('createSlot error:', error)
    throw toDbError(error)
  }
}

export async function updateSlot(id: string, updates: Partial<Pick<DbSlot, 'name' | 'description'>>): Promise<DbSlot> {
  try {
    const supabase = getSupabaseClient()
    
    const { data, error } = await supabase
      .from('slots')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) {
      throw toDbError(error)
    }
    
    return data
  } catch (error) {
    console.error('updateSlot error:', error)
    throw toDbError(error)
  }
}

export async function deleteSlot(id: string): Promise<void> {
  try {
    const supabase = getSupabaseClient()
    
    const { error } = await supabase
      .from('slots')
      .delete()
      .eq('id', id)
    
    if (error) {
      throw toDbError(error)
    }
  } catch (error) {
    console.error('deleteSlot error:', error)
    throw toDbError(error)
  }
}

// Slot Teachers CRUD
export async function getSlotTeachers(slotId: string): Promise<DbSlotTeacher[]> {
  try {
    const supabase = getSupabaseClient()
    
    const { data, error } = await supabase
      .from('slot_teachers')
      .select('*')
      .eq('slot_id', slotId)
      .order('kind, teacher_name')
    
    if (error) {
      throw toDbError(error)
    }
    
    return data || []
  } catch (error) {
    console.error('getSlotTeachers error:', error)
    throw toDbError(error)
  }
}

export async function addSlotTeacher(slotId: string, teacherName: string, kind: 'H_K_POOL' | 'FOREIGN'): Promise<DbSlotTeacher> {
  try {
    const supabase = getSupabaseClient()
    
    const { data, error } = await supabase
      .from('slot_teachers')
      .insert({
        slot_id: slotId,
        teacher_name: teacherName,
        kind
      })
      .select()
      .single()
    
    if (error) {
      throw toDbError(error)
    }
    
    return data
  } catch (error) {
    console.error('addSlotTeacher error:', error)
    throw toDbError(error)
  }
}

export async function removeSlotTeacher(id: string): Promise<void> {
  try {
    const supabase = getSupabaseClient()
    
    const { error } = await supabase
      .from('slot_teachers')
      .delete()
      .eq('id', id)
    
    if (error) {
      throw toDbError(error)
    }
  } catch (error) {
    console.error('removeSlotTeacher error:', error)
    throw toDbError(error)
  }
}

// Teacher Constraints CRUD
export async function getTeacherConstraints(slotId: string): Promise<DbTeacherConstraint[]> {
  try {
    const supabase = getSupabaseClient()
    
    const { data, error } = await supabase
      .from('teacher_constraints')
      .select('*')
      .eq('slot_id', slotId)
      .order('teacher_name')
    
    if (error) {
      throw toDbError(error)
    }
    
    return data || []
  } catch (error) {
    console.error('getTeacherConstraints error:', error)
    throw toDbError(error)
  }
}

export async function upsertTeacherConstraint(slotId: string, teacherName: string, constraint: {
  homeroom_disabled: boolean
  max_homerooms: number
  unavailable: string[]
}): Promise<DbTeacherConstraint> {
  try {
    const supabase = getSupabaseClient()
    
    const { data, error } = await supabase
      .from('teacher_constraints')
      .upsert({
        slot_id: slotId,
        teacher_name: teacherName,
        ...constraint
      })
      .select()
      .single()
    
    if (error) {
      throw toDbError(error)
    }
    
    return data
  } catch (error) {
    console.error('upsertTeacherConstraint error:', error)
    throw toDbError(error)
  }
}

export async function deleteTeacherConstraint(id: string): Promise<void> {
  try {
    const supabase = getSupabaseClient()
    
    const { error } = await supabase
      .from('teacher_constraints')
      .delete()
      .eq('id', id)
    
    if (error) {
      throw toDbError(error)
    }
  } catch (error) {
    console.error('deleteTeacherConstraint error:', error)
    throw toDbError(error)
  }
}

// Fixed Homerooms CRUD
export async function getFixedHomerooms(slotId: string): Promise<DbFixedHomeroom[]> {
  try {
    const supabase = getSupabaseClient()
    
    const { data, error } = await supabase
      .from('fixed_homerooms')
      .select('*')
      .eq('slot_id', slotId)
      .order('class_id')
    
    if (error) {
      throw toDbError(error)
    }
    
    return data || []
  } catch (error) {
    console.error('getFixedHomerooms error:', error)
    throw toDbError(error)
  }
}

export async function upsertFixedHomeroom(slotId: string, teacherName: string, classId: string): Promise<DbFixedHomeroom> {
  try {
    const supabase = getSupabaseClient()
    
    const { data, error } = await supabase
      .from('fixed_homerooms')
      .upsert({
        slot_id: slotId,
        teacher_name: teacherName,
        class_id: classId
      })
      .select()
      .single()
    
    if (error) {
      throw toDbError(error)
    }
    
    return data
  } catch (error) {
    console.error('upsertFixedHomeroom error:', error)
    throw toDbError(error)
  }
}

export async function deleteFixedHomeroom(id: string): Promise<void> {
  try {
    const supabase = getSupabaseClient()
    
    const { error } = await supabase
      .from('fixed_homerooms')
      .delete()
      .eq('id', id)
    
    if (error) {
      throw toDbError(error)
    }
  } catch (error) {
    console.error('deleteFixedHomeroom error:', error)
    throw toDbError(error)
  }
}

// Global Options CRUD
export async function getGlobalOptions(slotId: string): Promise<DbGlobalOption[]> {
  try {
    const supabase = getSupabaseClient()
    
    const { data, error } = await supabase
      .from('global_options')
      .select('*')
      .eq('slot_id', slotId)
      .order('key')
    
    if (error) {
      throw toDbError(error)
    }
    
    return data || []
  } catch (error) {
    console.error('getGlobalOptions error:', error)
    throw toDbError(error)
  }
}

export async function upsertGlobalOption(slotId: string, key: string, value: any): Promise<DbGlobalOption> {
  try {
    const supabase = getSupabaseClient()
    
    const { data, error } = await supabase
      .from('global_options')
      .upsert({
        slot_id: slotId,
        key,
        value
      })
      .select()
      .single()
    
    if (error) {
      throw toDbError(error)
    }
    
    return data
  } catch (error) {
    console.error('upsertGlobalOption error:', error)
    throw toDbError(error)
  }
}

export async function deleteGlobalOption(id: string): Promise<void> {
  try {
    const supabase = getSupabaseClient()
    
    const { error } = await supabase
      .from('global_options')
      .delete()
      .eq('id', id)
    
    if (error) {
      throw toDbError(error)
    }
  } catch (error) {
    console.error('deleteGlobalOption error:', error)
    throw toDbError(error)
  }
}
