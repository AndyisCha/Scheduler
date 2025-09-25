// Global options management panel
import { useState } from 'react'

import type { GlobalOptions } from '../../types/scheduler'

interface GlobalOptionsPanelProps {
  options: GlobalOptions
  onUpdate: (options: GlobalOptions) => void
  onSave: () => void
  isSaving: boolean
}

export function GlobalOptionsPanel({ options, onUpdate, onSave, isSaving }: GlobalOptionsPanelProps) {
  const [localOptions, setLocalOptions] = useState<GlobalOptions>(options)

  const updateOption = (field: keyof GlobalOptions, value: any) => {
    const newOptions = { ...localOptions, [field]: value }
    setLocalOptions(newOptions)
    onUpdate(newOptions)
  }

  const updateRoundClassCount = (round: string, count: number) => {
    const newRoundClassCounts = { ...localOptions.roundClassCounts, [round]: count }
    const newOptions = { ...localOptions, roundClassCounts: newRoundClassCounts }
    setLocalOptions(newOptions)
    onUpdate(newOptions)
  }

  const resetToDefaults = () => {
    const defaultOptions: GlobalOptions = {
      includeHInK: true,
      preferOtherHForK: false,
      disallowOwnHAsK: true,
      roundClassCounts: { '1': 3, '2': 3, '3': 3, '4': 3 },
      examPeriods: {},
      classNames: {}
    }
    setLocalOptions(defaultOptions)
    onUpdate(defaultOptions)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">전역 옵션</h3>
        <div className="flex space-x-2">
          <button
            onClick={resetToDefaults}
            className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
          >
            기본값으로 초기화
          </button>
          <button
            onClick={onSave}
            disabled={isSaving}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {isSaving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>

      {/* Scheduling Behavior Options */}
      <div className="space-y-4">
        <h4 className="font-medium text-gray-900">스케줄링 동작 설정</h4>
        
        <div className="space-y-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="include-h-in-k"
              checked={localOptions.includeHInK}
              onChange={(e) => updateOption('includeHInK', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="include-h-in-k" className="ml-3">
              <span className="text-sm font-medium text-gray-700">홈룸 교사를 한국어 풀에 포함</span>
              <p className="text-xs text-gray-500">홈룸 담당 교사가 한국어 수업도 담당할 수 있습니다</p>
            </label>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="prefer-other-h-for-k"
              checked={localOptions.preferOtherHForK}
              onChange={(e) => updateOption('preferOtherHForK', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="prefer-other-h-for-k" className="ml-3">
              <span className="text-sm font-medium text-gray-700">다른 홈룸 교사를 한국어 수업에 우선 배정</span>
              <p className="text-xs text-gray-500">한국어 수업 시 다른 홈룸 교사를 우선적으로 고려합니다</p>
            </label>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="disallow-own-h-as-k"
              checked={localOptions.disallowOwnHAsK}
              onChange={(e) => updateOption('disallowOwnHAsK', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="disallow-own-h-as-k" className="ml-3">
              <span className="text-sm font-medium text-gray-700">자신의 홈룸에서 한국어 수업 금지</span>
              <p className="text-xs text-gray-500">홈룸 담당 교사가 자신의 홈룸에서 한국어 수업을 담당하지 않습니다</p>
            </label>
          </div>
        </div>
      </div>

      {/* Round Class Counts */}
      <div className="space-y-4">
        <h4 className="font-medium text-gray-900">라운드별 클래스 수</h4>
        
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600 mb-4">
            각 라운드에 몇 개의 클래스가 있는지 설정합니다.
          </p>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(localOptions.roundClassCounts).map(([round, count]) => (
              <div key={round} className="space-y-2">
                <label htmlFor={`round-${round}`} className="block text-sm font-medium text-gray-700">
                  R{round} 라운드
                </label>
                <input
                  type="number"
                  id={`round-${round}`}
                  min="1"
                  max="10"
                  value={count}
                  onChange={(e) => updateRoundClassCount(round, parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Exam Periods */}
      <div className="space-y-4">
        <h4 className="font-medium text-gray-900">시험시간 설정</h4>
        
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600 mb-4">
            각 요일별로 시험시간을 교시 사이에 설정할 수 있습니다. (예: 2.5, 4.5)
          </p>
          
          <div className="space-y-3">
            {['월', '수', '금'].map(day => (
              <div key={day} className="flex items-center space-x-4">
                <label className="w-16 text-sm font-medium text-gray-700">{day}요일</label>
                <input
                  type="text"
                  placeholder="예: 2.5, 4.5"
                  value={(localOptions.examPeriods?.[day as '월' | '수' | '금'] || []).join(', ')}
                  onChange={(e) => {
                    const periods = e.target.value
                      .split(',')
                      .map(p => parseFloat(p.trim()))
                      .filter(p => !isNaN(p) && p > 0)
                    updateOption('examPeriods', {
                      ...localOptions.examPeriods,
                      [day]: periods
                    })
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Class Names */}
      <div className="space-y-4">
        <h4 className="font-medium text-gray-900">반이름 설정</h4>
        
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600 mb-4">
            각 클래스 ID에 대한 실제 반이름을 설정할 수 있습니다.
          </p>
          
          <div className="space-y-3">
            {Object.keys(localOptions.roundClassCounts).flatMap(round => 
              Array.from({ length: localOptions.roundClassCounts[parseInt(round)] }, (_, i) => `R${round}C${i + 1}`)
            ).map(classId => (
              <div key={classId} className="flex items-center space-x-4">
                <label className="w-20 text-sm font-medium text-gray-700">{classId}</label>
                <input
                  type="text"
                  placeholder={`${classId} 반이름`}
                  value={localOptions.classNames?.[classId] || ''}
                  onChange={(e) => {
                    updateOption('classNames', {
                      ...localOptions.classNames,
                      [classId]: e.target.value
                    })
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Current Settings Summary */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-3">현재 설정 요약</h4>
        
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-blue-700">홈룸 교사 한국어 풀 포함:</span>
            <span className="font-medium">{localOptions.includeHInK ? '예' : '아니오'}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-blue-700">다른 홈룸 교사 우선:</span>
            <span className="font-medium">{localOptions.preferOtherHForK ? '예' : '아니오'}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-blue-700">자신 홈룸 한국어 금지:</span>
            <span className="font-medium">{localOptions.disallowOwnHAsK ? '예' : '아니오'}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-blue-700">총 클래스 수:</span>
            <span className="font-medium">
              {Object.values(localOptions.roundClassCounts).reduce((sum, count) => sum + count, 0)}개
            </span>
          </div>
        </div>
      </div>

      {/* Validation Warnings */}
      {Object.values(localOptions.roundClassCounts).some(count => count <= 0) && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                경고
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>모든 라운드의 클래스 수는 1개 이상이어야 합니다.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


