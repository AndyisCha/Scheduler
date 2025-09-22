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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-8">
      <div className="w-full max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left side - Branding & Info */}
          <div className="flex flex-col items-center lg:items-start space-y-8">
            {/* Icon and Title */}
            <div className="flex flex-col items-center lg:items-start space-y-6">
              <div className="w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center shadow-lg">
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="text-center lg:text-left">
                <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
                  스케줄러 대시보드
                </h1>
                <p className="text-lg text-gray-600 mb-8">
                  효율적인 시간표 관리 시스템
                </p>
              </div>
            </div>

            {/* Feature List */}
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  <svg className="w-6 h-6 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-lg text-gray-700">직관적인 인터페이스</span>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  <svg className="w-6 h-6 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-lg text-gray-700">실시간 스케줄 생성</span>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  <svg className="w-6 h-6 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-lg text-gray-700">스마트 제약 조건 관리</span>
              </div>
            </div>
          </div>

          {/* Right side - Login Form */}
          <div className="flex justify-center lg:justify-center">
            <div className="w-full max-w-md mx-auto">
              <div className="bg-neutral-900 p-8 rounded-2xl shadow-2xl">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-white mb-2">
                    로그인
                  </h2>
                  <p className="text-gray-300">
                    계정에 로그인하세요
                  </p>
                </div>
                
                {/* Environment Status */}
                {status === 'disabled' && statusReason === 'ENV_MISSING' && (
                  <div className="bg-red-900/50 border border-red-700 rounded-lg p-4 mb-6">
                    <div className="flex items-center justify-between">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm text-red-300">
                            Supabase env missing. Check <code className="text-red-200">.env.local</code> and restart dev server.
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={handleRecheckEnv}
                        className="ml-4 text-xs bg-red-800 hover:bg-red-700 text-red-100 px-2 py-1 rounded transition-colors"
                      >
                        Recheck ENV
                      </button>
                    </div>
                  </div>
                )}

                <form className="space-y-6" onSubmit={handleSubmit}>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                        이메일 주소
                      </label>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        className="relative block w-full px-4 py-3 border border-gray-600 placeholder-gray-400 text-white bg-neutral-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        placeholder="이메일 주소를 입력하세요"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={isLoading}
                      />
                    </div>
                    <div>
                      <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                        비밀번호
                      </label>
                      <input
                        id="password"
                        name="password"
                        type="password"
                        autoComplete="current-password"
                        required
                        className="relative block w-full px-4 py-3 border border-gray-600 placeholder-gray-400 text-white bg-neutral-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
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
                      className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                    >
                      {isLoading ? (
                        <div className="flex items-center">
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          로그인 중...
                        </div>
                      ) : (
                        '로그인'
                      )}
                    </button>
                  </div>

                  <div className="text-center">
                    <p className="text-xs text-gray-400">
                      계정이 없으신가요? 관리자에게 문의하세요.
                    </p>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
