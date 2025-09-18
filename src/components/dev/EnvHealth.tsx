import { isSupabaseConfigured } from '../../lib/supabase'

interface EnvVarStatus {
  name: string
  present: boolean
  value?: string
  masked?: string
}

function EnvHealth() {
  const url = import.meta.env.VITE_SUPABASE_URL
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

  const envVars: EnvVarStatus[] = [
    {
      name: 'VITE_SUPABASE_URL',
      present: Boolean(url),
      value: url,
      masked: url ? `${url.slice(0, 8)}...${url.slice(-8)}` : undefined
    },
    {
      name: 'VITE_SUPABASE_ANON_KEY',
      present: Boolean(anonKey),
      value: anonKey,
      masked: anonKey ? `${anonKey.slice(0, 8)}...${anonKey.slice(-8)}` : undefined
    }
  ]

  const allPresent = envVars.every(env => env.present)
  const isConfigured = isSupabaseConfigured()

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">환경 변수 상태</h1>
        <p className="text-gray-600">
          Supabase 설정을 위한 환경 변수들의 상태를 확인할 수 있습니다.
        </p>
      </div>

      {/* Overall Status */}
      <div className={`p-4 rounded-lg mb-6 ${
        isConfigured 
          ? 'bg-green-50 border border-green-200' 
          : 'bg-red-50 border border-red-200'
      }`}>
        <div className="flex items-center">
          <div className={`w-3 h-3 rounded-full mr-3 ${
            isConfigured ? 'bg-green-500' : 'bg-red-500'
          }`} />
          <div>
            <h2 className={`font-semibold ${
              isConfigured ? 'text-green-800' : 'text-red-800'
            }`}>
              {isConfigured ? '✅ Supabase 설정 완료' : '❌ Supabase 설정 누락'}
            </h2>
            <p className={`text-sm ${
              isConfigured ? 'text-green-600' : 'text-red-600'
            }`}>
              {isConfigured 
                ? '모든 환경 변수가 올바르게 설정되어 있습니다.' 
                : '일부 환경 변수가 누락되었거나 올바르지 않습니다.'
              }
            </p>
          </div>
        </div>
      </div>

      {/* Environment Variables List */}
      <div className="space-y-4 mb-6">
        {envVars.map((env) => (
          <div key={env.name} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-gray-900">{env.name}</h3>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                env.present 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {env.present ? '설정됨' : '누락됨'}
              </span>
            </div>
            
            {env.present ? (
              <div className="space-y-2">
                <div className="text-sm text-gray-600">
                  <strong>값:</strong> <code className="bg-gray-100 px-2 py-1 rounded text-xs">{env.masked}</code>
                </div>
                <div className="text-xs text-gray-500">
                  전체 길이: {env.value?.length}자
                </div>
              </div>
            ) : (
              <div className="text-sm text-red-600">
                환경 변수가 설정되지 않았습니다.
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Setup Instructions */}
      {!allPresent && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="font-semibold text-yellow-800 mb-3">설정 가이드</h3>
          <div className="space-y-3 text-sm text-yellow-700">
            <div className="flex items-start">
              <span className="font-medium mr-2">1.</span>
              <span>프로젝트 루트에 <code className="bg-yellow-100 px-2 py-1 rounded text-xs">.env.local</code> 파일을 생성하세요.</span>
            </div>
            <div className="flex items-start">
              <span className="font-medium mr-2">2.</span>
              <span>다음 내용을 추가하세요:</span>
            </div>
            <div className="bg-yellow-100 p-3 rounded text-xs font-mono ml-6">
              <div>VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co</div>
              <div>VITE_SUPABASE_ANON_KEY=YOUR-ANON-KEY</div>
            </div>
            <div className="flex items-start">
              <span className="font-medium mr-2">3.</span>
              <span>개발 서버를 중지하고 다시 시작하세요:</span>
            </div>
            <div className="bg-yellow-100 p-3 rounded text-xs font-mono ml-6">
              <div>npm run dev</div>
            </div>
            <div className="flex items-start">
              <span className="font-medium mr-2">4.</span>
              <span>Supabase 프로젝트에서 URL과 익명 키를 가져오세요:</span>
            </div>
            <div className="ml-6 text-xs">
              <div>• Settings → API → Project URL</div>
              <div>• Settings → API → anon public key</div>
            </div>
          </div>
        </div>
      )}

      {/* Current Configuration */}
      {allPresent && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h3 className="font-semibold text-green-800 mb-3">현재 설정</h3>
          <div className="text-sm text-green-700 space-y-2">
            <div>
              <strong>Supabase URL:</strong> {envVars[0].masked}
            </div>
            <div>
              <strong>익명 키:</strong> {envVars[1].masked}
            </div>
            <div className="mt-3 text-xs text-green-600">
              모든 환경 변수가 올바르게 설정되어 있습니다. Supabase 기능을 사용할 수 있습니다.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default EnvHealth
