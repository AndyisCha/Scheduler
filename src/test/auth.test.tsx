// Authentication tests
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SignInForm } from '../components/auth/SignInForm'
import { AuthProvider } from '../contexts/AuthContext'

// Mock Supabase to avoid auth errors
vi.mock('../lib/supabase', () => ({
  isSupabaseConfigured: false,
  supabase: null
}))

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
)

// Simple test without complex mocking
describe('Authentication Components', () => {
  it('should render SignInForm', () => {
    render(
      <TestWrapper>
        <SignInForm />
      </TestWrapper>
    )

    expect(screen.getByText('스케줄러 대시보드')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('이메일 주소')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('비밀번호')).toBeInTheDocument()
    expect(screen.getByText('로그인')).toBeInTheDocument()
  })
})
