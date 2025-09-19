import { useState, useEffect } from 'react'
import { getGlobalOptions, upsertGlobalOption } from '../../services/db/slots'
import { useToast } from '../Toast'
import { LoadingState } from '../ErrorStates'
// import type { DbGlobalOption } from '../../services/db/types'
import type { SlotConfig } from '../../engine/types'

interface GlobalOptionsTabProps {
  slotId: string
  slotConfig: SlotConfig
  onUpdate: (config: SlotConfig) => void
}

export function GlobalOptionsTab({ slotId, slotConfig, onUpdate }: GlobalOptionsTabProps) {
  // const [options] = useState<DbGlobalOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  
  // Local state for form inputs
  const [includeHInK, setIncludeHInK] = useState(true)
  const [preferOtherHForK, setPreferOtherHForK] = useState(true)
  const [disallowOwnHAsK, setDisallowOwnHAsK] = useState(true)
  const [roundClassCounts, setRoundClassCounts] = useState({
    R1: 2,
    R2: 2,
    R3: 2,
    R4: 2
  })
  
  const toast = useToast()

  useEffect(() => {
    loadGlobalOptions()
  }, [slotId])

  const loadGlobalOptions = async () => {
    setIsLoading(true)
    try {
      const optionsData = await getGlobalOptions(slotId)
      
      // Set local state from loaded options
      const option = optionsData.length > 0 ? optionsData[0] : null
      
      setIncludeHInK(option?.include_h_in_k ?? true)
      setPreferOtherHForK(option?.prefer_other_h_for_k ?? true)
      setDisallowOwnHAsK(option?.disallow_own_h_as_k ?? true)
      setRoundClassCounts((option?.round_class_counts as { R1: number; R2: number; R3: number; R4: number }) ?? { R1: 2, R2: 2, R3: 2, R4: 2 })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '전역 옵션을 불러오는 중 오류가 발생했습니다.'
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveOptions = async () => {
    setIsSaving(true)
    
    try {
      // Update all options in a single call
      await upsertGlobalOption(slotId, {
        include_h_in_k: includeHInK,
        prefer_other_h_for_k: preferOtherHForK,
        disallow_own_h_as_k: disallowOwnHAsK,
        round_class_counts: roundClassCounts
      })
      
      // Update slot config
      onUpdate({
        ...slotConfig,
        globalOptions: {
          includeHInK,
          preferOtherHForK,
          disallowOwnHAsK,
          roundClassCounts
        }
      })
      
      toast.success('전역 옵션이 저장되었습니다.')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '전역 옵션 저장 중 오류가 발생했습니다.'
      toast.error(errorMessage)
    } finally {
      setIsSaving(false)
    }
  }

  const handleResetToDefaults = () => {
    setIncludeHInK(true)
    setPreferOtherHForK(true)
    setDisallowOwnHAsK(true)
    setRoundClassCounts({ R1: 2, R2: 2, R3: 2, R4: 2 })
  }

  const handleRoundClassCountChange = (round: 'R1' | 'R2' | 'R3' | 'R4', value: number) => {
    setRoundClassCounts(prev => ({
      ...prev,
      [round]: Math.max(0, value)
    }))
  }

  if (isLoading) {
    return <LoadingState message="전역 옵션을 불러오는 중..." />
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-2">전역 옵션</h3>
        <p className="text-sm text-gray-600">
          스케줄링 전역 설정을 관리하세요
        </p>
      </div>

      <div className="space-y-6">
        {/* Scheduling Behavior Options */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="text-md font-medium text-gray-900 mb-4">스케줄링 동작 옵션</h4>
          
          <div className="space-y-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="includeHInK"
                checked={includeHInK}
                onChange={(e) => setIncludeHInK(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
              />
              <label htmlFor="includeHInK" className="ml-3 text-sm text-gray-700">
                한국어 수업에 홈룸 선생님 포함
              </label>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="preferOtherHForK"
                checked={preferOtherHForK}
                onChange={(e) => setPreferOtherHForK(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
              />
              <label htmlFor="preferOtherHForK" className="ml-3 text-sm text-gray-700">
                한국어 수업에 다른 반 홈룸 선생님 우선 배정
              </label>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="disallowOwnHAsK"
                checked={disallowOwnHAsK}
                onChange={(e) => setDisallowOwnHAsK(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
              />
              <label htmlFor="disallowOwnHAsK" className="ml-3 text-sm text-gray-700">
                자신의 홈룸 반에서 한국어 수업 금지
              </label>
            </div>
          </div>
        </div>

        {/* Round Class Counts */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="text-md font-medium text-gray-900 mb-4">교시별 반 수</h4>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {(['R1', 'R2', 'R3', 'R4'] as const).map(round => (
              <div key={round}>
                <label htmlFor={`round-${round}`} className="block text-sm font-medium text-gray-700 mb-1">
                  {round} (1-2교시)
                </label>
                <input
                  type="number"
                  id={`round-${round}`}
                  min="0"
                  max="10"
                  value={roundClassCounts[round]}
                  onChange={(e) => handleRoundClassCountChange(round, parseInt(e.target.value) || 0)}
                  className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            ))}
          </div>
          
          <p className="mt-2 text-xs text-gray-500">
            각 교시에 활성화될 반의 수를 설정하세요
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={handleResetToDefaults}
            disabled={isSaving}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            기본값으로 초기화
          </button>
          <button
            type="button"
            onClick={handleSaveOptions}
            disabled={isSaving}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isSaving ? '저장 중...' : '옵션 저장'}
          </button>
        </div>

        {/* Current Options Summary */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-900 mb-2">현재 설정 요약</h4>
          <div className="text-sm text-blue-800 space-y-1">
            <p>• 한국어 수업에 홈룸 선생님 포함: {includeHInK ? '예' : '아니오'}</p>
            <p>• 다른 반 홈룸 선생님 우선 배정: {preferOtherHForK ? '예' : '아니오'}</p>
            <p>• 자신의 홈룸 반 한국어 수업 금지: {disallowOwnHAsK ? '예' : '아니오'}</p>
            <p>• 교시별 반 수: R1({roundClassCounts.R1}), R2({roundClassCounts.R2}), R3({roundClassCounts.R3}), R4({roundClassCounts.R4})</p>
          </div>
        </div>
      </div>
    </div>
  )
}


