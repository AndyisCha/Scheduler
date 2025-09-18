// User header component showing user info and sign out
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../Toast'

export function UserHeader() {
  const { user, profile, signOut } = useAuth()
  const toast = useToast()

  const handleSignOut = async () => {
    try {
      await signOut()
      toast.success('로그아웃되었습니다.')
    } catch (error) {
      toast.error('로그아웃 중 오류가 발생했습니다.')
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'bg-purple-100 text-purple-800'
      case 'ADMIN':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return '슈퍼 관리자'
      case 'ADMIN':
        return '관리자'
      default:
        return '사용자'
    }
  }

  if (!user || !profile) {
    return null
  }

  return (
    <div className="flex items-center space-x-4 bg-white px-6 py-3 border-b border-gray-200">
      <div className="flex-1">
        <div className="flex items-center space-x-3">
          <div>
            <p className="text-sm font-medium text-gray-900">
              {profile.display_name || user.email}
            </p>
            <p className="text-xs text-gray-500">{user.email}</p>
          </div>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(profile.role)}`}>
            {getRoleDisplayName(profile.role)}
          </span>
        </div>
      </div>
      
      <button
        onClick={handleSignOut}
        className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        로그아웃
      </button>
    </div>
  )
}


