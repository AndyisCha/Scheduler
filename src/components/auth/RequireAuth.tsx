// Authentication guard component
import { useEffect } from 'react'
import { useAuthStore } from '../../store/auth'
import { SignIn } from './SignIn'
import { LoadingState } from '../ErrorStates'

interface RequireAuthProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function RequireAuth({ children, fallback }: RequireAuthProps) {
  const { user, profile, isLoading, isInitialized, status, initialize } = useAuthStore()

  useEffect(() => {
    if (!isInitialized) {
      initialize()
    }
  }, [isInitialized, initialize])

  // If Supabase is disabled, skip authentication
  if (status === 'disabled') {
    return <>{children}</>
  }

  // Show loading while initializing
  if (!isInitialized || isLoading || status === 'initializing') {
    return fallback || <LoadingState message="인증 확인 중..." />
  }

  // Show sign in if not authenticated
  if (!user) {
    return <SignIn />
  }

  // Show loading while profile is being loaded
  if (!profile) {
    return <LoadingState message="프로필 로딩 중..." />
  }

  // Show children if authenticated and profile loaded
  return <>{children}</>
}