import { useState, useEffect } from 'react'
import { useAuthStore } from '../store/auth'
import { listSlots, getGeneratedSchedules } from '../services/db/slots'
import { LoadingState, ErrorState } from '../components/ErrorStates'
import { ClassScheduleTable } from '../components/reports/ClassScheduleTable'
import { ExportControls } from '../components/reports/ExportControls'
import { PrintModeControls } from '../components/reports/PrintModeControls'
import { useToast } from '../components/Toast/ToastProvider'
import type { Assignment, ScheduleResult } from '../types/scheduler'

interface ClassScheduleData {
  classId: string
  schedule: {
    [day: string]: {
      [period: number]: Assignment
    }
  }
}

export interface ClassReportsData {
  slotId: string
  slotName: string
  weekDate: string
  classes: ClassScheduleData[]
  examInfo: {
    [classId: string]: {
      invigilator?: string
      periods: number[]
    }
  }
}

export function ClassReportsPage() {
  const { user, profile } = useAuthStore()
  const toast = useToast()
  
  const [selectedSlot, setSelectedSlot] = useState<string>('')
  const [availableSlots, setAvailableSlots] = useState<Array<{ id: string; name: string }>>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [reportsData, setReportsData] = useState<ClassReportsData | null>(null)
  const [isPrintMode, setIsPrintMode] = useState(false)

  useEffect(() => {
    if (user && profile) {
      loadSlots()
    }
  }, [user, profile])

  useEffect(() => {
    if (selectedSlot) {
      loadScheduleData()
    }
  }, [selectedSlot])

  const loadSlots = async () => {
    if (!user || !profile) return

    setIsLoading(true)
    setError('')

    try {
      const slots = await listSlots('mine')
      const slotOptions = slots.map(slot => ({ id: slot.id, name: slot.name }))
      
      setAvailableSlots(slotOptions)
      
      if (slotOptions.length > 0) {
        setSelectedSlot(slotOptions[0].id)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '슬롯을 불러오는 중 오류가 발생했습니다.'
      setError(errorMessage)
      toast.showToast({
        type: 'error',
        title: '슬롯 로딩 실패',
        message: errorMessage
      })
    } finally {
      setIsLoading(false)
    }
  }

  const loadScheduleData = async () => {
    if (!selectedSlot) return

    try {
      setIsLoading(true)
      
      // Get the latest generated schedule for the selected slot
      const schedules = await getGeneratedSchedules(selectedSlot)
      
      if (schedules.length === 0) {
        setReportsData(null)
        return
      }

      const latestSchedule = schedules[0]
      const result: ScheduleResult = latestSchedule.result

      // Transform data to class-based structure
      const classesMap = new Map<string, ClassScheduleData>()
      const examInfo: ClassReportsData['examInfo'] = {}

      // Process all assignments
      Object.values(result.teacherSummary || {}).forEach(assignments => {
        Object.values(assignments).forEach(dayAssignments => {
          dayAssignments.forEach((assignment: any) => {
          const classId = assignment.classId
          
          if (!classesMap.has(classId)) {
            classesMap.set(classId, {
              classId,
              schedule: {}
            })
          }

          const classData = classesMap.get(classId)!
          
          if (!classData.schedule[assignment.day]) {
            classData.schedule[assignment.day] = {}
          }

          classData.schedule[assignment.day][parseInt(assignment.period.toString())] = assignment

          // Track exam information
          if (assignment.role === 'EXAM') {
            if (!examInfo[classId]) {
              examInfo[classId] = { periods: [] }
            }
            examInfo[classId].periods.push(parseInt(assignment.period.toString()))
            
            // Find homeroom teacher as invigilator
            const homeroomTeacher = Object.entries(result.teacherSummary || {})
              .find(([, teacherAssignments]) => 
                Object.values(teacherAssignments).some(dayAssignments => 
                  dayAssignments.some((a: any) => 
                    a.classId === classId && 
                    a.role === 'H' && 
                    a.day === assignment.day
                  )
                )
              )?.[0]
            
            if (homeroomTeacher) {
              examInfo[classId].invigilator = homeroomTeacher
            }
          }
          })
        })
      })

      // Find slot name
      const selectedSlotData = availableSlots.find(slot => slot.id === selectedSlot)
      const slotName = selectedSlotData?.name || 'Unknown Slot'

      setReportsData({
        slotId: selectedSlot,
        slotName,
        weekDate: new Date().toLocaleDateString('ko-KR'),
        classes: Array.from(classesMap.values()).sort((a, b) => 
          a.classId.localeCompare(b.classId)
        ),
        examInfo
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '스케줄 데이터를 불러오는 중 오류가 발생했습니다.'
      setError(errorMessage)
      toast.showToast({
        type: 'error',
        title: '데이터 로딩 실패',
        message: errorMessage
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSlotChange = (slotId: string) => {
    setSelectedSlot(slotId)
  }

  const handlePrintMode = (enabled: boolean) => {
    setIsPrintMode(enabled)
    if (enabled) {
      // Add print-specific styles
      document.body.classList.add('print-mode')
    } else {
      document.body.classList.remove('print-mode')
    }
  }

  const handleExitPrintMode = () => {
    handlePrintMode(false)
  }

  const handlePrint = () => {
    window.print()
  }

  if (isLoading) {
    return <LoadingState message="클래스 리포트를 불러오는 중..." />
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadSlots} />
  }

  return (
    <>
      {/* Print Mode Controls */}
      {isPrintMode && (
        <PrintModeControls
          onPrint={handlePrint}
          onExitPrintMode={handleExitPrintMode}
        />
      )}

      <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 ${isPrintMode ? 'print-layout' : ''}`}>
      {/* Header */}
      {!isPrintMode && (
        <div className="mb-8">
          <nav className="flex" aria-label="Breadcrumb">
            <ol className="flex items-center space-x-4">
              <li>
                <span className="text-gray-400">리포트</span>
              </li>
              <li>
                <div className="flex items-center">
                  <svg className="flex-shrink-0 h-5 w-5 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="ml-4 text-gray-500">클래스 스케줄</span>
                </div>
              </li>
            </ol>
          </nav>
          <h1 className="mt-2 text-3xl font-bold text-gray-900">클래스 스케줄 리포트</h1>
          <p className="mt-2 text-gray-600">
            클래스별 주간 스케줄을 확인하고 인쇄하거나 내보낼 수 있습니다
          </p>
        </div>
      )}

      {/* Controls */}
      {!isPrintMode && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  슬롯 선택
                </label>
                <select
                  value={selectedSlot}
                  onChange={(e) => handleSlotChange(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">슬롯 선택...</option>
                  {availableSlots.map((slot) => (
                    <option key={slot.id} value={slot.id}>
                      {slot.name}
                    </option>
                  ))}
                </select>
              </div>
              
              {reportsData && (
                <div className="text-sm text-gray-600">
                  <div>슬롯: {reportsData.slotName}</div>
                  <div>주차: {reportsData.weekDate}</div>
                  <div>클래스 수: {reportsData.classes.length}개</div>
                </div>
              )}
            </div>

            <ExportControls
              onPrintMode={handlePrintMode}
              onPrint={handlePrint}
              onExportCSV={() => {
                if (reportsData) {
                  exportToCSV(reportsData)
                }
              }}
              hasData={!!reportsData && reportsData.classes.length > 0}
            />
          </div>
        </div>
      )}

      {/* Report Content */}
      {!selectedSlot ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">슬롯을 선택해주세요</h3>
          <p className="mt-2 text-gray-500">리포트를 생성하려면 먼저 슬롯을 선택하세요.</p>
        </div>
      ) : !reportsData ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">스케줄 데이터 없음</h3>
          <p className="mt-2 text-gray-500">선택한 슬롯에 대한 최신 스케줄이 없습니다.</p>
        </div>
      ) : (
        <div className={`${isPrintMode ? '' : 'bg-white rounded-lg shadow-md'}`}>
          <ClassScheduleTable 
            data={reportsData} 
            isPrintMode={isPrintMode}
          />
        </div>
      )}
      </div>
    </>
  )
}

// CSV Export Function
function exportToCSV(data: ClassReportsData) {
  const csvRows: string[] = []
  
  // CSV Header with BOM for UTF-8
  csvRows.push('\uFEFF클래스,요일,교시,시간,교사,역할,라운드')
  
  // Add data rows
  data.classes.forEach(classData => {
    Object.entries(classData.schedule).forEach(([day, periods]) => {
      Object.entries(periods).forEach(([period, assignment]) => {
        csvRows.push([
          classData.classId,
          day,
          period,
          assignment.time,
          assignment.teacher,
          assignment.role,
          `R${assignment.round}`
        ].join(','))
      })
    })
  })
  
  // Create and download file
  const csvContent = csvRows.join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  
  link.setAttribute('href', url)
  link.setAttribute('download', `class-schedule-${data.slotName}-${data.weekDate}.csv`)
  link.style.visibility = 'hidden'
  
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
