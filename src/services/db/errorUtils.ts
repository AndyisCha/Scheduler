// Database error handling utilities
import { PostgrestError } from '@supabase/supabase-js'
import type { DbError } from './types'

/**
 * Normalize Supabase PostgREST errors into a consistent format
 */
export function toDbError(error: PostgrestError | Error | unknown): DbError {
  if (error && typeof error === 'object') {
    // Supabase PostgREST error
    if ('code' in error && 'message' in error && 'details' in error) {
      const pgError = error as PostgrestError
      return {
        message: pgError.message || 'Database error occurred',
        code: pgError.code || 'UNKNOWN',
        details: pgError.details || undefined
      }
    }
    
    // Generic Error
    if ('message' in error) {
      return {
        message: (error as Error).message,
        code: 'GENERIC_ERROR'
      }
    }
  }
  
  // Unknown error type
  return {
    message: 'An unexpected error occurred',
    code: 'UNKNOWN_ERROR'
  }
}

/**
 * Check if error is a specific Supabase error
 */
export function isSupabaseError(error: unknown): error is PostgrestError {
  return (
    error !== null &&
    typeof error === 'object' &&
    'code' in error &&
    'message' in error &&
    'details' in error
  )
}

/**
 * Check if error indicates missing permissions (RLS violation)
 */
export function isPermissionError(error: unknown): boolean {
  if (isSupabaseError(error)) {
    return error.code === 'PGRST301' || // Row Level Security violation
           error.message.includes('permission denied') ||
           error.message.includes('insufficient_privilege')
  }
  return false
}

/**
 * Check if error indicates missing record
 */
export function isNotFoundError(error: unknown): boolean {
  if (isSupabaseError(error)) {
    return error.code === 'PGRST116' // No rows found
  }
  return false
}

/**
 * Create a user-friendly error message
 */
export function getUserFriendlyErrorMessage(error: unknown): string {
  const dbError = toDbError(error)
  
  if (isPermissionError(error)) {
    return '접근 권한이 없습니다. 관리자에게 문의하세요.'
  }
  
  if (isNotFoundError(error)) {
    return '요청한 데이터를 찾을 수 없습니다.'
  }
  
  // Map common error codes to user-friendly messages
  switch (dbError.code) {
    case '23505': // Unique constraint violation
      return '이미 존재하는 데이터입니다.'
    case '23503': // Foreign key constraint violation
      return '관련된 데이터가 있어서 삭제할 수 없습니다.'
    case '23502': // Not null constraint violation
      return '필수 정보가 누락되었습니다.'
    case 'PGRST301': // RLS violation
      return '접근 권한이 없습니다.'
    case 'PGRST116': // No rows found
      return '데이터를 찾을 수 없습니다.'
    default:
      return dbError.message || '알 수 없는 오류가 발생했습니다.'
  }
}


