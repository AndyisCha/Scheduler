import React, { useState, useEffect } from 'react';
import { useSlotStore } from '../store/useSlotStore';
import { useSchedulerStore } from '../store/useSchedulerStore';
import { useAuthStore } from '../store/auth';
import { generateUnifiedSchedules } from '../engine/unifiedScheduler';
import type { UnifiedSlotConfig } from '../engine/unifiedScheduler';
import { validateScheduleConstraints } from '../utils/scheduleValidation';
import { SlotCard } from '../components/ui/SlotCard';
import { TeacherPoolCard } from '../components/ui/TeacherPoolCard';
import { ConstraintsCard } from '../components/ui/ConstraintsCard';
import { UnifiedScheduleResultCard } from '../components/ui/UnifiedScheduleResultCard';
import { ActionBar } from '../components/ui/ActionBar';
import { useToast } from '../components/Toast/ToastProvider';
import { unifiedSlotService } from '../services/unifiedSlotService';
import type { UnifiedSlotConfig as ServiceUnifiedSlotConfig } from '../services/unifiedSlotService';

export const TtScheduler: React.FC = () => {
  const toast = useToast();
  
  const { 
    homeroomKoreanPool, 
    foreignPool, 
    teacherConstraints, 
    addTeacherToPool,
    removeTeacherFromPool,
    clearAllTeachers,
    updateTeacherConstraint
  } = useSlotStore();

  const { user, profile } = useAuthStore();

  const {
    ttResult,
    isGenerating,
    setTtResult,
    setGenerating,
    setGenerationError
  } = useSchedulerStore();

  const [selectedSlot, setSelectedSlot] = useState<ServiceUnifiedSlotConfig | null>(null);
  const [ttSlots, setTtSlots] = useState<ServiceUnifiedSlotConfig[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // TT 슬롯 로드
  useEffect(() => {
    if (user && profile) {
      loadTtSlots();
    }
  }, [user, profile]);

  const loadTtSlots = async () => {
    if (!user || !profile) return;

    setIsLoading(true);
    try {
      const slots = await unifiedSlotService.getSlotsByDayGroup('TT', user.id, profile.role);
      setTtSlots(slots);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'TT 슬롯을 불러오는 중 오류가 발생했습니다.';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // TT 스케줄 생성
  const handleGenerateTt = async () => {
    if (!selectedSlot) {
      toast.error('먼저 슬롯을 선택해주세요.');
      return;
    }

    try {
      setGenerating(true);
      setGenerationError(null);

      // Convert ServiceUnifiedSlotConfig to UnifiedSlotConfig for the scheduler
      const unifiedConfig: UnifiedSlotConfig = {
        id: selectedSlot.id,
        name: selectedSlot.name,
        slot: {
          teachers: {
            homeroomKoreanPool: [
              ...selectedSlot.teachers.homeroomKoreanPool.map(name => ({ id: name, name, role: 'H' as const })),
              ...selectedSlot.teachers.homeroomKoreanPool.map(name => ({ id: `${name}-K`, name, role: 'K' as const }))
            ],
            foreignPool: selectedSlot.teachers.foreignPool.map(name => ({ id: name, name, role: 'F' as const }))
          },
          globalOptions: {
            includeHInK: selectedSlot.globalOptions?.includeHInK ?? true,
            preferOtherHForK: selectedSlot.globalOptions?.preferOtherHForK ?? false,
            disallowOwnHAsK: selectedSlot.globalOptions?.disallowOwnHAsK ?? true,
            roundClassCounts: {
              tt: { 
                1: selectedSlot.globalOptions?.roundClassCounts?.[1] ?? 2, 
                2: selectedSlot.globalOptions?.roundClassCounts?.[2] ?? 2 
              }
            }
          },
          constraints: selectedSlot.teacherConstraints ? 
            Object.entries(selectedSlot.teacherConstraints).map(([teacherName, constraint]) => ({
              teacherName,
              ...constraint
            })) : [],
          fixedHomerooms: selectedSlot.fixedHomerooms || {}
        }
      };
      
      const result = generateUnifiedSchedules(unifiedConfig);
      
      // Use TT result directly
      setTtResult(result.tt);
      
      // Validate the schedule
      const validation = validateScheduleConstraints(result.tt, 'TT');
      
      console.log('📊 Unified TT schedule result:', result);
      console.log('📊 TT result:', result.tt);
      console.log('📊 Validation result:', validation);
      
      if (validation.isValid) {
        toast.success('TT 스케줄이 생성되었습니다.');
        if (validation.warnings.length > 0) {
          console.warn('⚠️ TT Schedule warnings:', validation.warnings);
        }
      } else {
        toast.error(`TT 스케줄 검증 실패: ${validation.errors.join(', ')}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '스케줄 생성 중 오류가 발생했습니다.';
      setGenerationError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setGenerating(false);
    }
  };

  // 교사 추가 핸들러
  const handleAddTeacher = (pool: 'homeroomKorean' | 'foreign', name: string) => {
    addTeacherToPool(pool, name);
    toast.success(`${name} 교사가 추가되었습니다.`);
  };

  // 교사 제거 핸들러
  const handleRemoveTeacher = (pool: 'homeroomKorean' | 'foreign', name: string) => {
    removeTeacherFromPool(pool, name);
    toast.success(`${name} 교사가 제거되었습니다.`);
  };

  // 제약조건 업데이트 핸들러
  const handleUpdateConstraint = (teacherName: string, constraint: any) => {
    updateTeacherConstraint(teacherName, constraint);
    toast.success(`${teacherName} 교사의 제약조건이 업데이트되었습니다.`);
  };

  // 슬롯 선택 핸들러
  const handleSlotSelect = (slot: ServiceUnifiedSlotConfig) => {
    setSelectedSlot(slot);
    
    // 선택된 슬롯의 교사 정보를 스케줄러 상태에 동기화
    console.log('🔄 Syncing TT slot data to scheduler state:', slot);
    
    const teachers = slot.teachers || { homeroomKoreanPool: [], foreignPool: [] };
    clearAllTeachers();
    
    teachers.homeroomKoreanPool.forEach((teacher: any) => {
      const teacherName = typeof teacher === 'string' ? teacher : teacher.name || teacher;
      addTeacherToPool('homeroomKorean', teacherName);
    });
    
    teachers.foreignPool.forEach((teacher: any) => {
      const teacherName = typeof teacher === 'string' ? teacher : teacher.name || teacher;
      addTeacherToPool('foreign', teacherName);
    });
    
    if (slot.teacherConstraints) {
      Object.entries(slot.teacherConstraints).forEach(([teacherName, constraint]) => {
        updateTeacherConstraint(teacherName, constraint);
      });
    }
    
    toast.success(`${slot.name} 슬롯이 선택되었습니다. (교사 ${teachers.homeroomKoreanPool.length + teachers.foreignPool.length}명 동기화됨)`);
  };

  // 슬롯 편집 핸들러
  const handleSlotEdit = (slotId: string) => {
    const slot = ttSlots.find(s => s.id === slotId);
    if (slot) {
      window.location.href = `/slots/${slotId}`;
    } else {
      toast.error('슬롯을 찾을 수 없습니다.');
    }
  };

  // 슬롯 삭제 핸들러
  const handleSlotDelete = async (slotId: string) => {
    const slot = ttSlots.find(s => s.id === slotId);
    if (!slot) {
      toast.error('슬롯을 찾을 수 없습니다.');
      return;
    }

    if (window.confirm(`정말로 "${slot.name}" 슬롯을 삭제하시겠습니까?`)) {
      try {
        await unifiedSlotService.deleteSlot(slotId);
        toast.success(`${slot.name} 슬롯이 삭제되었습니다.`);
        loadTtSlots();
      } catch (error) {
        toast.error('슬롯 삭제 중 오류가 발생했습니다.');
        console.error('Delete slot error:', error);
      }
    }
  };

  return (
    <div className="min-h-screen bg-secondary transition-theme">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">TT 스케줄러</h1>
          <p className="text-tertiary">화, 목 요일 스케줄을 생성합니다.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 좌측: 슬롯 및 설정 */}
          <div className="space-y-6">
            {/* 슬롯 선택 */}
            <div>
              <h2 className="text-xl font-semibold text-primary mb-4">TT 슬롯 선택</h2>
              <div className="space-y-3">
                {isLoading ? (
                  <p className="text-tertiary text-center py-8">TT 슬롯을 불러오는 중...</p>
                ) : ttSlots.length === 0 ? (
                  <p className="text-tertiary text-center py-8">생성된 TT 슬롯이 없습니다.</p>
                ) : (
                  ttSlots.map((slot) => (
                    <div
                      key={slot.id}
                      onClick={() => handleSlotSelect(slot)}
                      className="cursor-pointer"
                    >
                      <SlotCard
                        slot={slot}
                        onEdit={handleSlotEdit}
                        onDelete={handleSlotDelete}
                        isActive={selectedSlot?.id === slot.id}
                      />
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 교사 풀 관리 */}
            {selectedSlot && (
              <>
                <TeacherPoolCard
                  title="한국어/담임 교사"
                  role="homeroomKorean"
                  teachers={homeroomKoreanPool}
                  onAddTeacher={(name) => handleAddTeacher('homeroomKorean', name)}
                  onRemoveTeacher={(name) => handleRemoveTeacher('homeroomKorean', name)}
                />

                <TeacherPoolCard
                  title="외국어 교사"
                  role="foreign"
                  teachers={foreignPool}
                  onAddTeacher={(name) => handleAddTeacher('foreign', name)}
                  onRemoveTeacher={(name) => handleRemoveTeacher('foreign', name)}
                />

                <ConstraintsCard
                  constraints={teacherConstraints}
                  onUpdateConstraint={handleUpdateConstraint}
                />
              </>
            )}
          </div>

          {/* 우측: 스케줄 결과 */}
          <div className="lg:col-span-2">
            {selectedSlot ? (
              <UnifiedScheduleResultCard
                result={ttResult}
                title="TT 스케줄 결과"
                schedulerType="TT"
                onExport={() => {
                  // Export logic here
                  toast.success('스케줄이 내보내기되었습니다.');
                }}
              />
            ) : (
              <div className="bg-primary rounded-lg border border-primary p-8 text-center">
                <h3 className="text-lg font-semibold text-primary mb-2">슬롯을 선택하세요</h3>
                <p className="text-tertiary">스케줄을 생성하려면 먼저 슬롯을 선택해주세요.</p>
              </div>
            )}
          </div>
        </div>

        {/* 액션 바 */}
        <ActionBar
          onGenerateMwf={() => {}}
          onGenerateTt={handleGenerateTt}
          onGenerateBoth={() => {}}
          isLoading={isGenerating}
          disabled={!selectedSlot}
        />
      </div>
    </div>
  );
};