// Profile warning component for missing or incomplete profiles
import { useAuth } from '../../contexts/AuthContext'

export function ProfileWarning() {
  const { user, profile, signOut } = useAuth()

  if (!user) {
    return null
  }

  // User is logged in but has no profile
  if (!profile) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">
              프로필이 설정되지 않았습니다
            </h3>
            <div className="mt-2 text-sm text-red-700">
              <p>
                관리자에게 연락하여 프로필을 설정해주세요. 
                현재 계정: <strong>{user.email}</strong>
              </p>
            </div>
            <div className="mt-4">
              <button
                onClick={signOut}
                className="bg-red-100 px-3 py-2 rounded-md text-sm font-medium text-red-800 hover:bg-red-200"
              >
                로그아웃
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // User has profile but role is not recognized
  if (profile.role !== 'ADMIN' && profile.role !== 'SUPER_ADMIN') {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">
              권한이 설정되지 않았습니다
            </h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p>
                관리자에게 연락하여 적절한 권한을 부여받아주세요.
                현재 권한: <strong>{profile.role}</strong>
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return null
}


