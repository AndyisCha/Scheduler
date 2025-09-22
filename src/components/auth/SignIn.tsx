// Sign in component
import { useState } from 'react'
import { useAuthStore } from '../../store/auth'
import { useToast } from '../Toast'

interface SignInProps {
  onSuccess?: () => void
}

export function SignIn({ onSuccess }: SignInProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  
  const signIn = useAuthStore(state => state.signIn)
  const recheckEnv = useAuthStore(state => state.recheckEnv)
  const { status, statusReason } = useAuthStore()
  const toast = useToast()

  const handleRecheckEnv = () => {
    recheckEnv()
    toast.info('환경 변수를 다시 확인했습니다. 콘솔을 확인하세요.')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email || !password) {
      toast.error('이메일과 비밀번호를 입력해주세요.')
      return
    }

    setIsLoading(true)
    
    try {
      const result = await signIn(email, password)
      
      if (result.success) {
        toast.success('로그인되었습니다.')
        onSuccess?.()
      } else {
        toast.error(result.error || '로그인에 실패했습니다.')
      }
    } catch (error) {
      toast.error('로그인 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const containerStyle: React.CSSProperties = {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #eff6ff 0%, #e0e7ff 100%)',
    padding: '2rem 1rem',
    margin: 0,
    width: '100%',
    position: 'relative'
  }

  const innerContainerStyle: React.CSSProperties = {
    width: '100%',
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: '3rem',
    alignItems: 'center',
    justifyItems: 'center'
  }

  const leftSectionStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2rem',
    textAlign: 'center'
  }

  const rightSectionStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%'
  }

  const loginCardStyle: React.CSSProperties = {
    backgroundColor: '#171717',
    padding: '2rem',
    borderRadius: '1rem',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    width: '100%',
    maxWidth: '400px',
    margin: '0 auto'
  }

  return (
    <div style={containerStyle}>
      <div style={innerContainerStyle}>
        {/* Left side - Branding & Info */}
        <div style={leftSectionStyle}>
          {/* Icon and Title */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
            <div style={{
              width: '96px',
              height: '96px',
              backgroundColor: '#2563eb',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
            }}>
              <svg width="48" height="48" fill="none" stroke="white" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h1 style={{
                fontSize: '3rem',
                fontWeight: 'bold',
                color: '#111827',
                marginBottom: '1rem',
                lineHeight: '1.1'
              }}>
                스케줄러 대시보드
              </h1>
              <p style={{
                fontSize: '1.125rem',
                color: '#6b7280',
                marginBottom: '2rem'
              }}>
                효율적인 시간표 관리 시스템
              </p>
            </div>
          </div>

          {/* Feature List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div>
                <svg width="24" height="24" fill="#10b981" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <span style={{ fontSize: '1.125rem', color: '#374151' }}>직관적인 인터페이스</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div>
                <svg width="24" height="24" fill="#10b981" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <span style={{ fontSize: '1.125rem', color: '#374151' }}>실시간 스케줄 생성</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div>
                <svg width="24" height="24" fill="#10b981" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <span style={{ fontSize: '1.125rem', color: '#374151' }}>스마트 제약 조건 관리</span>
            </div>
          </div>
        </div>

        {/* Right side - Login Form */}
        <div style={rightSectionStyle}>
          <div style={loginCardStyle}>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <h2 style={{
                fontSize: '1.5rem',
                fontWeight: 'bold',
                color: 'white',
                marginBottom: '0.5rem'
              }}>
                로그인
              </h2>
              <p style={{ color: '#d1d5db' }}>
                계정에 로그인하세요
              </p>
            </div>
            
            {/* Environment Status */}
            {status === 'disabled' && statusReason === 'ENV_MISSING' && (
              <div style={{
                backgroundColor: 'rgba(127, 29, 29, 0.5)',
                border: '1px solid #b91c1c',
                borderRadius: '0.5rem',
                padding: '1rem',
                marginBottom: '1.5rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex' }}>
                    <div>
                      <svg width="20" height="20" fill="#f87171" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div style={{ marginLeft: '0.75rem' }}>
                      <p style={{ fontSize: '0.875rem', color: '#fca5a5' }}>
                        Supabase env missing. Check <code style={{ color: '#fecaca' }}>.env.local</code> and restart dev server.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleRecheckEnv}
                    style={{
                      marginLeft: '1rem',
                      fontSize: '0.75rem',
                      backgroundColor: '#991b1b',
                      color: '#fecaca',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '0.25rem',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    Recheck ENV
                  </button>
                </div>
              </div>
            )}

            <form style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }} onSubmit={handleSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label htmlFor="email" style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#d1d5db', marginBottom: '0.5rem' }}>
                    이메일 주소
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      border: '1px solid #4b5563',
                      borderRadius: '0.5rem',
                      backgroundColor: '#262626',
                      color: 'white',
                      fontSize: '1rem'
                    }}
                    placeholder="이메일 주소를 입력하세요"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <label htmlFor="password" style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#d1d5db', marginBottom: '0.5rem' }}>
                    비밀번호
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      border: '1px solid #4b5563',
                      borderRadius: '0.5rem',
                      backgroundColor: '#262626',
                      color: 'white',
                      fontSize: '1rem'
                    }}
                    placeholder="비밀번호를 입력하세요"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    backgroundColor: '#2563eb',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    opacity: isLoading ? 0.5 : 1
                  }}
                >
                  {isLoading ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg className="animate-spin" width="20" height="20" fill="none" viewBox="0 0 24 24" style={{ marginRight: '0.75rem' }}>
                        <circle opacity="0.25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path opacity="0.75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      로그인 중...
                    </div>
                  ) : (
                    '로그인'
                  )}
                </button>
              </div>

              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                  계정이 없으신가요? 관리자에게 문의하세요.
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}