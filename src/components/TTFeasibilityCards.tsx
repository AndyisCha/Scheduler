// TT Feasibility Cards showing capacity and coverage
import type { TTScheduleResult } from '../utils/ttScheduler'

interface TTFeasibilityCardsProps {
  feasibility: TTScheduleResult['feasibility']
}

export function TTFeasibilityCards({ feasibility }: TTFeasibilityCardsProps) {
  const r1UsagePercent = feasibility.r1ForeignCapacity > 0 
    ? Math.round((feasibility.r1ForeignDemand / feasibility.r1ForeignCapacity) * 100)
    : 0

  const getStatusColor = (isOk: boolean) => {
    return isOk ? 'text-green-600 bg-green-50 border-green-200' : 'text-red-600 bg-red-50 border-red-200'
  }

  const getUsageColor = (percent: number) => {
    if (percent <= 80) return 'text-green-600'
    if (percent <= 100) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-medium mb-4">TT 실행 가능성 분석</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* R1 Foreign Capacity Card */}
        <div className={`p-4 rounded-lg border ${getStatusColor(feasibility.r1ForeignOk)}`}>
          <h4 className="font-medium mb-2">TT.R1 외국인 용량</h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>수요:</span>
              <span className="font-medium">{feasibility.r1ForeignDemand}</span>
            </div>
            <div className="flex justify-between">
              <span>용량:</span>
              <span className="font-medium">{feasibility.r1ForeignCapacity}</span>
            </div>
            <div className="flex justify-between">
              <span>사용률:</span>
              <span className={`font-medium ${getUsageColor(r1UsagePercent)}`}>
                {r1UsagePercent}%
              </span>
            </div>
            <div className="mt-2">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${
                    r1UsagePercent <= 80 ? 'bg-green-500' :
                    r1UsagePercent <= 100 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(r1UsagePercent, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* R2 Homeroom Coverage Card */}
        <div className="p-4 rounded-lg border border-blue-200 bg-blue-50">
          <h4 className="font-medium mb-2 text-blue-800">TT.R2 담임 커버리지</h4>
          <div className="space-y-1 text-sm text-blue-700">
            <div className="flex justify-between">
              <span>필요:</span>
              <span className="font-medium">{feasibility.r2HNeeded}</span>
            </div>
            <div className="flex justify-between">
              <span>상태:</span>
              <span className="font-medium">
                {feasibility.r2HNeeded > 0 ? '분석 중' : 'N/A'}
              </span>
            </div>
            <div className="text-xs text-blue-600 mt-2">
              * 정확한 배정 수는 결과에서 확인
            </div>
          </div>
        </div>

        {/* R2 Korean Coverage Card */}
        <div className="p-4 rounded-lg border border-purple-200 bg-purple-50">
          <h4 className="font-medium mb-2 text-purple-800">TT.R2 한국인 커버리지</h4>
          <div className="space-y-1 text-sm text-purple-700">
            <div className="flex justify-between">
              <span>필요:</span>
              <span className="font-medium">{feasibility.r2KNeeded}</span>
            </div>
            <div className="flex justify-between">
              <span>상태:</span>
              <span className="font-medium">
                {feasibility.r2KNeeded > 0 ? '분석 중' : 'N/A'}
              </span>
            </div>
            <div className="text-xs text-purple-600 mt-2">
              * 정확한 배정 수는 결과에서 확인
            </div>
          </div>
        </div>
      </div>

      {/* Overall Status */}
      <div className="mt-4 p-3 rounded border">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium">전체 상태:</span>
          <span className={`text-sm font-medium ${
            feasibility.r1ForeignOk ? 'text-green-600' : 'text-red-600'
          }`}>
            {feasibility.r1ForeignOk ? '✓ 실행 가능' : '⚠ 제한적 실행'}
          </span>
        </div>
        {!feasibility.r1ForeignOk && (
          <p className="text-sm text-red-600 mt-1">
            TT.R1 외국인 용량 부족으로 일부 배정이 불가능할 수 있습니다.
          </p>
        )}
      </div>
    </div>
  )
}
