// Supabase configuration banner
import { isSupabaseConfigured } from '../lib/supabase'

export function SupabaseConfigBanner() {
  if (isSupabaseConfigured()) {
    return null // Don't show banner if properly configured
  }

  return (
    <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3">
          <p className="text-sm">
            <strong>Supabase 환경 변수가 설정되지 않았습니다.</strong>
            <br />
            <code>.env.local</code> 파일에 <code>VITE_SUPABASE_URL</code>과 <code>VITE_SUPABASE_ANON_KEY</code>를 설정해주세요.
            현재는 Mock 데이터를 사용합니다.
          </p>
        </div>
      </div>
    </div>
  )
}
