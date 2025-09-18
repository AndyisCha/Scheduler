import { useState } from 'react'
import { isSupabaseConfigured } from '../lib/supabase'
import EnvHealth from './dev/EnvHealth'

interface SupabaseBannerProps {
  onClose?: () => void
}

export function SupabaseBanner({ onClose }: SupabaseBannerProps) {
  const [showEnvHealth, setShowEnvHealth] = useState(false)

  // Don't show banner if Supabase is configured
  if (isSupabaseConfigured()) {
    return null
  }

  if (showEnvHealth) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="relative max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <button
            onClick={() => setShowEnvHealth(false)}
            className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-2xl font-bold"
          >
            &times;
          </button>
          <EnvHealth />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-red-600 text-white px-4 py-3 relative">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-200" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium">
              ⚠️ Supabase 환경 변수가 누락되었습니다
            </p>
            <p className="text-sm text-red-200 mt-1">
              <code>VITE_SUPABASE_URL</code>과 <code>VITE_SUPABASE_ANON_KEY</code>를 <code>.env.local</code>에 설정하고 개발 서버를 재시작하세요.
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowEnvHealth(true)}
            className="text-sm bg-red-700 hover:bg-red-800 px-3 py-1 rounded transition-colors"
          >
            설정 가이드
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="text-red-200 hover:text-white"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
