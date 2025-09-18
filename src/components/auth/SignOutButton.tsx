// Sign out button component
import { useAuthStore } from '../../store/auth'
import { useToast } from '../Toast'

interface SignOutButtonProps {
  className?: string
  variant?: 'button' | 'link'
}

export function SignOutButton({ className = '', variant = 'button' }: SignOutButtonProps) {
  const signOut = useAuthStore(state => state.signOut)
  const isLoading = useAuthStore(state => state.isLoading)
  const toast = useToast()

  const handleSignOut = async () => {
    try {
      await signOut()
      toast.success('로그아웃되었습니다.')
    } catch (error) {
      toast.error('로그아웃 중 오류가 발생했습니다.')
    }
  }

  if (variant === 'link') {
    return (
      <button
        onClick={handleSignOut}
        disabled={isLoading}
        className={`text-gray-500 hover:text-gray-700 text-sm ${className}`}
      >
        {isLoading ? '로그아웃 중...' : '로그아웃'}
      </button>
    )
  }

  return (
    <button
      onClick={handleSignOut}
      disabled={isLoading}
      className={`inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {isLoading ? '로그아웃 중...' : '로그아웃'}
    </button>
  )
}


