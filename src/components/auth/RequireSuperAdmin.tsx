// Super admin guard component
import { RequireAuth } from './RequireAuth'
import { useAuthStore } from '../../store/auth'

interface RequireSuperAdminProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

function SuperAdminContent({ children, fallback }: RequireSuperAdminProps) {
  const profile = useAuthStore(state => state.profile)

  // Check if user has SUPER_ADMIN role
  if (profile?.role !== 'SUPER_ADMIN') {
    return fallback || <UnauthorizedPage />
  }

  return <>{children}</>
}

function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <div className="text-6xl mb-4">🚫</div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            접근 권한 없음
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            이 페이지는 SUPER_ADMIN 권한이 필요합니다.
          </p>
          <p className="mt-4 text-xs text-gray-500">
            현재 권한: {useAuthStore.getState().profile?.role || '알 수 없음'}
          </p>
        </div>
        
        <div className="mt-8">
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            이전 페이지로 돌아가기
          </button>
        </div>
      </div>
    </div>
  )
}

export function RequireSuperAdmin({ children, fallback }: RequireSuperAdminProps) {
  return (
    <RequireAuth>
      <SuperAdminContent fallback={fallback}>
        {children}
      </SuperAdminContent>
    </RequireAuth>
  )
}