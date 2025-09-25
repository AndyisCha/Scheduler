// Comprehensive slot editor with all CRUD operations
import { useState } from 'react'
import { useToast } from '../Toast'
import { unifiedSlotService } from '../../services/unifiedSlotService'
import { TeacherPoolPanel } from './TeacherPoolPanel'
import { TeacherConstraintsPanel } from './TeacherConstraintsPanel'
import { FixedHomeroomsPanel } from './FixedHomeroomsPanel'
import { GlobalOptionsPanel } from './GlobalOptionsPanel'
import { HistoryPage } from '../history/HistoryPage'
import { LazyTab } from '../LazyTab'
import type { UnifiedSlotConfig } from '../../services/unifiedSlotService'
import type { SlotConfig } from '../../engine/types'

interface SlotEditorProps {
  slot: UnifiedSlotConfig
  onSlotUpdate: (updatedSlot: UnifiedSlotConfig) => void
  onClose?: () => void
}

export function SlotEditor({ slot, onSlotUpdate, onClose }: SlotEditorProps) {
  const [currentSlot, setCurrentSlot] = useState<UnifiedSlotConfig>(slot)
  const [activePanel, setActivePanel] = useState<'teachers' | 'constraints' | 'homerooms' | 'options' | 'history'>('teachers')
  const [isSaving, setIsSaving] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  
  const toast = useToast()

  // Validate slot data
  const validateSlot = (slotData: UnifiedSlotConfig): string[] => {
    const errors: string[] = []

    // Check for duplicate teacher names
    const allTeachers = [
      ...slotData.teachers.homeroomKoreanPool,
      ...slotData.teachers.foreignPool
    ]
    const teacherNames = allTeachers
    const duplicateNames = teacherNames.filter((name, index) => teacherNames.indexOf(name) !== index)
    
    if (duplicateNames.length > 0) {
      errors.push(`중복된 교사 이름: ${duplicateNames.join(', ')}`)
    }

    // Check for homeroomDisabled + fixed homeroom conflicts
    const fixedTeachers = Object.keys(slotData.fixedHomerooms)      
    const disabledTeachers = Object.entries(slotData.teacherConstraints)
      .filter(([_, constraints]) => (constraints as any).homeroomDisabled)
      .map(([teacherName, _]) => teacherName)
    
    const conflicts = fixedTeachers.filter(teacher => disabledTeachers.includes(teacher))
    if (conflicts.length > 0) {
      errors.push(`홈룸 비활성화된 교사가 고정 홈룸에 할당됨: ${conflicts.join(', ')}`)
    }

    // Check maxHomerooms constraints
    const maxHomeroomsViolations: string[] = []
    Object.entries(slotData.teacherConstraints).forEach(([teacherName, constraints]) => {
      const constraint = constraints as any
      if (constraint.maxHomerooms && constraint.maxHomerooms > 0) {
        const fixedCount = fixedTeachers.filter(name => name === teacherName).length
        if (fixedCount > constraint.maxHomerooms) {
          maxHomeroomsViolations.push(`${teacherName}: 고정 홈룸 ${fixedCount}개 > 최대 ${constraint.maxHomerooms}개`)
        }
      }
    })
    
    if (maxHomeroomsViolations.length > 0) {
      errors.push(`최대 홈룸 수 초과: ${maxHomeroomsViolations.join(', ')}`)
    }

    return errors
  }

  const handleSave = async (section: string) => {
    setIsSaving(true)
    setValidationErrors([])

    try {
      // Validate current slot
      const errors = validateSlot(currentSlot)
      if (errors.length > 0) {
        setValidationErrors(errors)
        toast.error(`검증 오류: ${errors.join(', ')}`)
        return
      }

      // Save to database based on the active panel
      switch (activePanel) {
        case 'teachers':
          await unifiedSlotService.updateSlotTeachers(currentSlot.id, currentSlot.teachers)
          break
        case 'constraints':
          await unifiedSlotService.updateTeacherConstraints(currentSlot.id, currentSlot.teacherConstraints)
          break
        case 'homerooms':
          await unifiedSlotService.updateFixedHomerooms(currentSlot.id, currentSlot.fixedHomerooms)
          break
        case 'options':
          await unifiedSlotService.updateGlobalOptions(currentSlot.id, currentSlot.globalOptions)
          break
        default:
          // Update basic slot info
          await unifiedSlotService.updateSlot({
            id: currentSlot.id,
            name: currentSlot.name,
            description: currentSlot.description
          })
      }
      
      // Update parent component
      onSlotUpdate(currentSlot)
      toast.success(`${section} 설정이 저장되었습니다!`)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '저장 중 오류가 발생했습니다.'
      toast.error(errorMessage)
    } finally {
      setIsSaving(false)
    }
  }

  const updateSlotData = (updates: Partial<SlotConfig>) => {
    setCurrentSlot(prev => ({
      ...prev,
      ...updates
    }))
  }

  const panels = [
    { key: 'teachers', label: '교사 풀', icon: '👥' },
    { key: 'constraints', label: '교사 제약', icon: '⚙️' },
    { key: 'homerooms', label: '고정 홈룸', icon: '🏠' },
    { key: 'options', label: '전역 옵션', icon: '🔧' },
    { key: 'history', label: '히스토리', icon: '📚' }
  ] as const

  return (
    <div className="constraints-page app-container space-y-6" data-ui="constraints-v2">
      {/* 1단계: 적용 확인용 강제 스타일(눈에 띄게) */}
      <style id="constraints-hotfix">
        {`
          [data-ui="constraints-v2"] { outline: 3px solid magenta !important; }
          [data-ui="constraints-v2"] .probe { background: magenta; color:black; padding:4px 8px; border-radius:6px; display:inline-block; }
        `}
      </style>
      
      {/* HOTFIX 확인용 엘리먼트 */}
      <span className="probe">HOTFIX ACTIVE</span>
      
      {/* 2단계: 최종 스타일(강제 적용) */}
      <style id="constraints-v2-styles">
        {`
          :root {
            --bg: #121212;
            --card: #1e1e1e;
            --input: #2a2a2a;
            --text: #e6e6e6;
            --subtext: #a9a9a9;
            --border: #2e2e2e;
            --primary: #4dabf7;
          }

          /* 페이지 컨테이너: 가운데 정렬 + 최대폭 */
          [data-ui="constraints-v2"] {
            max-width: 1100px;
            margin: 0 auto !important;
            padding: 16px 20px;
          }

          /* 상단 탭 버튼 정렬/스타일 (role/tablist 탐지 + 클래스 동시 대응) */
          [data-ui="constraints-v2"] nav[role="tablist"],
          [data-ui="constraints-v2"] .top-actions {
            display: flex; justify-content: center; align-items: center;
            gap: 8px; row-gap: 10px; flex-wrap: wrap;
            margin: 12px 0 22px;
          }
          [data-ui="constraints-v2"] nav[role="tablist"] > *,
          [data-ui="constraints-v2"] .top-actions > * {
            min-width: 140px; height: 40px; padding: 0 14px;
            border-radius: 10px; border: 1px solid var(--border);
            background: var(--card); color: var(--text);
          }
          [data-ui="constraints-v2"] [aria-selected="true"],
          [data-ui="constraints-v2"] .active {
            background: var(--primary) !important; color: #0b0f14 !important; border-color: transparent !important;
            box-shadow: 0 0 0 2px rgba(77,171,247,.2);
          }

          /* 섹션 카드 */
          [data-ui="constraints-v2"] .section-card {
            background: var(--card);
            border: 1px solid var(--border);
            border-radius: 12px;
            box-shadow: 0 8px 26px rgba(0,0,0,.35);
            padding: 22px;
            margin: 24px 0;
          }

          /* 설명 텍스트 */
          [data-ui="constraints-v2"] .section-card h2,
          [data-ui="constraints-v2"] .section-card h3 { margin: 0 0 6px; color: var(--text); }
          [data-ui="constraints-v2"] .desc { margin-bottom: 16px; color: var(--subtext); font-size: .95rem; }

          /* 드롭다운 + 버튼 한 줄 정렬 */
          [data-ui="constraints-v2"] .control-row {
            display: flex; gap: 10px; align-items: center; flex-wrap: wrap;
            margin-bottom: 14px;
          }
          [data-ui="constraints-v2"] select,
          [data-ui="constraints-v2"] input[type="text"],
          [data-ui="constraints-v2"] input[type="number"],
          [data-ui="constraints-v2"] .btn {
            background: var(--input); color: var(--text);
            border: 1px solid var(--border); border-radius: 10px;
            height: 40px; padding: 0 12px;
          }
          [data-ui="constraints-v2"] .btn.primary {
            background: var(--primary); color: #0b0f14; border-color: transparent;
          }

          /* 개별 제약 카드 */
          [data-ui="constraints-v2"] .constraint-card {
            background: #141414; border: 1px solid var(--border);
            border-radius: 12px; padding: 18px; margin-top: 12px;
          }
          [data-ui="constraints-v2"] .constraint-card .card-head {
            display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;
          }
          [data-ui="constraints-v2"] .constraint-card .card-head .name { font-weight: 700; font-size: 1.05rem; }
          [data-ui="constraints-v2"] .constraint-card .card-head .remove {
            background: #262626; color: var(--text);
            border: 1px solid var(--border); border-radius: 8px;
            height: 32px; padding: 0 10px; cursor: pointer;
          }
          [data-ui="constraints-v2"] .constraint-card .card-head .remove:hover { background: #312f2f; }

          /* 라벨/필드 정렬 */
          [data-ui="constraints-v2"] .field-row {
            display: grid; grid-template-columns: 220px 1fr; gap: 10px; align-items: center;
            margin: 8px 0;
          }
          [data-ui="constraints-v2"] .field-row label { color: var(--subtext); }

          /* 시간표 그리드 */
          [data-ui="constraints-v2"] .time-grid { margin-top: 16px; overflow-x: auto; border-top: 1px dashed var(--border); padding-top: 12px; }
          [data-ui="constraints-v2"] .time-grid table { width: 100%; border-collapse: separate; border-spacing: 8px; }
          [data-ui="constraints-v2"] .time-grid thead th { text-align: center; color: var(--subtext); font-weight: 600; }
          [data-ui="constraints-v2"] .time-grid tbody td { text-align: center; }

          /* 토글형 셀 */
          [data-ui="constraints-v2"] .time-cell {
            min-width: 88px; min-height: 40px;
            display: inline-grid; place-items: center;
            background: #1f1f1f; border: 1px solid var(--border); border-radius: 8px;
            user-select: none; cursor: pointer; transition: transform .02s ease, background .15s ease;
          }
          [data-ui="constraints-v2"] .time-cell:hover { background: #262626; }
          [data-ui="constraints-v2"] .time-cell.is-selected {
            background: var(--primary); color: #0b0f14; border-color: transparent;
            box-shadow: 0 0 0 2px rgba(77,171,247,.2);
          }

          /* 하단 액션 */
          [data-ui="constraints-v2"] .footer-actions {
            display: flex; justify-content: center; margin-top: 16px;
          }

          @media (max-width: 720px) {
            [data-ui="constraints-v2"] .field-row { grid-template-columns: 1fr; }
          }
        `}
      </style>
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            슬롯 편집: {currentSlot.name}
          </h2>
          <p className="text-gray-600">
            {currentSlot.dayGroup} 스케줄 설정
          </p>
          <span className="probe">HOTFIX ACTIVE</span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                검증 오류
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <ul className="list-disc list-inside">
                  {validationErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Panel Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {panels.map(panel => (
            <button
              key={panel.key}
              onClick={() => setActivePanel(panel.key)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activePanel === panel.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {panel.icon} {panel.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Panel Content */}
      <div className="bg-white rounded-lg shadow p-6">
        <LazyTab isActive={activePanel === 'teachers'}>
          {activePanel === 'teachers' && (
            <TeacherPoolPanel
              teachers={currentSlot.teachers as any}
              onUpdate={(teachers) => updateSlotData({ teachers: teachers as any })}
              onSave={() => handleSave('교사 풀')}
              isSaving={isSaving}
            />
          )}
        </LazyTab>

        <LazyTab isActive={activePanel === 'constraints'}>
          {activePanel === 'constraints' && (
            <TeacherConstraintsPanel
              constraints={currentSlot.teacherConstraints}
              teachers={currentSlot.teachers as any}
              onUpdate={(teacherConstraints) => updateSlotData({ teacherConstraints })}
            />
          )}
        </LazyTab>

        <LazyTab isActive={activePanel === 'homerooms'}>
          {activePanel === 'homerooms' && (
            <FixedHomeroomsPanel
              fixedHomerooms={currentSlot.fixedHomerooms}
              teachers={currentSlot.teachers as any}
              globalOptions={currentSlot.globalOptions}
              onUpdate={(fixedHomerooms) => updateSlotData({ fixedHomerooms })}
              onSave={() => handleSave('고정 홈룸')}
              isSaving={isSaving}
            />
          )}
        </LazyTab>

        <LazyTab isActive={activePanel === 'options'}>
          {activePanel === 'options' && (
            <GlobalOptionsPanel
              options={currentSlot.globalOptions}
              onUpdate={(globalOptions) => updateSlotData({ globalOptions })}
              onSave={() => handleSave('전역 옵션')}
              isSaving={isSaving}
            />
          )}
        </LazyTab>

        <LazyTab isActive={activePanel === 'history'}>
          {activePanel === 'history' && (
            <HistoryPage
              slotId={currentSlot.id}
              onBack={() => setActivePanel('teachers')}
            />
          )}
        </LazyTab>
      </div>
    </div>
  )
}
