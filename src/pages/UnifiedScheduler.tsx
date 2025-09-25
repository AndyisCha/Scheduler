import React, { useState, useEffect } from 'react';
import { useSlotStore } from '../store/useSlotStore';
import { useSchedulerStore } from '../store/useSchedulerStore';
import { useAuthStore } from '../store/auth';
import { generateMwfSchedule, generateTtSchedule } from '../engine';
import { SlotCard } from '../components/ui/SlotCard';
import { TeacherPoolCard } from '../components/ui/TeacherPoolCard';
import { ConstraintsCard } from '../components/ui/ConstraintsCard';
import { ActionBar } from '../components/ui/ActionBar';
import { SplitViewScheduler } from '../components/ui/SplitViewScheduler';
import { useToast } from '../components/Toast/ToastProvider';
import { unifiedSlotService } from '../services/unifiedSlotService';
import type { MWFScheduleResult, TTScheduleResult } from '../engine/types';
import type { UnifiedSlotConfig } from '../services/unifiedSlotService';

export const UnifiedScheduler: React.FC = () => {
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
    mwfResult,
    ttResult,
    isGenerating,
    setMwfResult,
    setTtResult,
    setGenerating,
    setGenerationError,
    generateUnifiedResult
  } = useSchedulerStore();

  const [selectedMwfSlot, setSelectedMwfSlot] = useState<UnifiedSlotConfig | null>(null);
  const [selectedTtSlot, setSelectedTtSlot] = useState<UnifiedSlotConfig | null>(null);
  const [mwfSlots, setMwfSlots] = useState<UnifiedSlotConfig[]>([]);
  const [ttSlots, setTtSlots] = useState<UnifiedSlotConfig[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // MWF와 TT 슬롯 로드
  useEffect(() => {
    if (user && profile) {
      loadSlots();
    }
  }, [user, profile]);

  const loadSlots = async () => {
    if (!user || !profile) return;

    setIsLoading(true);
    try {
      const [mwfSlotsData, ttSlotsData] = await Promise.all([
        unifiedSlotService.getSlotsByDayGroup('MWF', user.id, profile.role),
        unifiedSlotService.getSlotsByDayGroup('TT', user.id, profile.role)
      ]);
      
      setMwfSlots(mwfSlotsData);
      setTtSlots(ttSlotsData);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '슬롯을 불러오는 중 오류가 발생했습니다.';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // MWF 스케줄 생성
  const handleGenerateMwf = async () => {
    if (!selectedMwfSlot) {
      toast.error('먼저 MWF 슬롯을 선택해주세요.');
      return;
    }

    try {
      setGenerating(true);
      setGenerationError(null);

      const result = await generateMwfSchedule(selectedMwfSlot);
      setMwfResult(result);
      
      toast.success('MWF 스케줄이 생성되었습니다.');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '스케줄 생성 중 오류가 발생했습니다.';
      setGenerationError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setGenerating(false);
    }
  };

  // TT 스케줄 생성
  const handleGenerateTt = async () => {
    if (!selectedTtSlot) {
      toast.error('먼저 TT 슬롯을 선택해주세요.');
      return;
    }

    try {
      setGenerating(true);
      setGenerationError(null);

      const result = await generateTtSchedule(selectedTtSlot);
      setTtResult(result);
      
      toast.success('TT 스케줄이 생성되었습니다.');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '스케줄 생성 중 오류가 발생했습니다.';
      setGenerationError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setGenerating(false);
    }
  };

  // 통합 스케줄 생성
  const handleGenerateBoth = async (): Promise<{ mwf: MWFScheduleResult; tt: TTScheduleResult }> => {
    if (!selectedMwfSlot || !selectedTtSlot) {
      toast.error('먼저 MWF와 TT 슬롯을 모두 선택해주세요.');
      throw new Error('MWF 또는 TT 슬롯이 선택되지 않았습니다.');
    }

    try {
      setGenerating(true);
      setGenerationError(null);

      const mwf = await generateMwfSchedule(selectedMwfSlot);
      const tt = await generateTtSchedule(selectedTtSlot);
      
      setMwfResult(mwf);
      setTtResult(tt);
      
      // 통합 결과 생성
      generateUnifiedResult(mwf, tt);
      
      toast.success('MWF와 TT 스케줄이 모두 생성되었습니다.');
      
      return { mwf, tt };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '스케줄 생성 중 오류가 발생했습니다.';
      setGenerationError(errorMessage);
      toast.error(errorMessage);
      throw error;
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

  // MWF 슬롯 선택 핸들러
  const handleMwfSlotSelect = (slot: UnifiedSlotConfig) => {
    setSelectedMwfSlot(slot);
    
    // MWF 슬롯의 교사 정보를 스케줄러 상태에 동기화
    console.log('🔄 Syncing MWF slot data to scheduler state:', slot);
    
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
    
    toast.success(`MWF 슬롯: ${slot.name}이 선택되었습니다. (교사 ${teachers.homeroomKoreanPool.length + teachers.foreignPool.length}명 동기화됨)`);
  };

  // TT 슬롯 선택 핸들러
  const handleTtSlotSelect = (slot: UnifiedSlotConfig) => {
    setSelectedTtSlot(slot);
    
    // TT 슬롯의 교사 정보를 스케줄러 상태에 동기화 (별도 상태 관리)
    console.log('🔄 TT slot selected:', slot.name);
    
    toast.success(`TT 슬롯: ${slot.name}이 선택되었습니다.`);
  };

  // 슬롯 편집 핸들러들
  const handleMwfSlotEdit = (slotId: string) => {
    const slot = mwfSlots.find(s => s.id === slotId);
    if (slot) {
      window.location.href = `/slots/${slotId}`;
    } else {
      toast.error('MWF 슬롯을 찾을 수 없습니다.');
    }
  };

  const handleTtSlotEdit = (slotId: string) => {
    const slot = ttSlots.find(s => s.id === slotId);
    if (slot) {
      window.location.href = `/slots/${slotId}`;
    } else {
      toast.error('TT 슬롯을 찾을 수 없습니다.');
    }
  };

  // 슬롯 삭제 핸들러들
  const handleMwfSlotDelete = async (slotId: string) => {
    const slot = mwfSlots.find(s => s.id === slotId);
    if (!slot) {
      toast.error('MWF 슬롯을 찾을 수 없습니다.');
      return;
    }

    if (window.confirm(`정말로 MWF 슬롯 "${slot.name}"을 삭제하시겠습니까?`)) {
      try {
        await unifiedSlotService.deleteSlot(slotId);
        toast.success(`MWF 슬롯 "${slot.name}"이 삭제되었습니다.`);
        loadSlots();
      } catch (error) {
        toast.error('MWF 슬롯 삭제 중 오류가 발생했습니다.');
        console.error('Delete MWF slot error:', error);
      }
    }
  };

  const handleTtSlotDelete = async (slotId: string) => {
    const slot = ttSlots.find(s => s.id === slotId);
    if (!slot) {
      toast.error('TT 슬롯을 찾을 수 없습니다.');
      return;
    }

    if (window.confirm(`정말로 TT 슬롯 "${slot.name}"을 삭제하시겠습니까?`)) {
      try {
        await unifiedSlotService.deleteSlot(slotId);
        toast.success(`TT 슬롯 "${slot.name}"이 삭제되었습니다.`);
        loadSlots();
      } catch (error) {
        toast.error('TT 슬롯 삭제 중 오류가 발생했습니다.');
        console.error('Delete TT slot error:', error);
      }
    }
  };

  return (
    <div className="min-h-screen bg-secondary transition-theme">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">통합 스케줄러</h1>
          <p className="text-tertiary">MWF와 TT 스케줄을 통합 관리합니다.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 좌측: 슬롯 및 설정 */}
          <div className="space-y-6">
            {/* MWF 슬롯 선택 */}
            <div>
              <h2 className="text-xl font-semibold text-primary mb-4">MWF 슬롯 선택</h2>
              <div className="space-y-3">
                {isLoading ? (
                  <p className="text-tertiary text-center py-8">MWF 슬롯을 불러오는 중...</p>
                ) : mwfSlots.length === 0 ? (
                  <p className="text-tertiary text-center py-8">생성된 MWF 슬롯이 없습니다.</p>
                ) : (
                  mwfSlots.map((slot) => (
                    <div
                      key={slot.id}
                      onClick={() => handleMwfSlotSelect(slot)}
                      className="cursor-pointer"
                    >
                      <SlotCard
                        slot={slot}
                        onEdit={handleMwfSlotEdit}
                        onDelete={handleMwfSlotDelete}
                        isActive={selectedMwfSlot?.id === slot.id}
                      />
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* TT 슬롯 선택 */}
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
                      onClick={() => handleTtSlotSelect(slot)}
                      className="cursor-pointer"
                    >
                      <SlotCard
                        slot={slot}
                        onEdit={handleTtSlotEdit}
                        onDelete={handleTtSlotDelete}
                        isActive={selectedTtSlot?.id === slot.id}
                      />
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 교사 풀 관리 */}
            {(selectedMwfSlot || selectedTtSlot) && (
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
            {(selectedMwfSlot || selectedTtSlot) ? (
              <SplitViewScheduler
                mwfResult={mwfResult}
                ttResult={ttResult}
                onGenerateBoth={handleGenerateBoth}
                isLoading={isGenerating}
              />
            ) : (
              <div className="bg-primary rounded-lg border border-primary p-8 text-center">
                <h3 className="text-lg font-semibold text-primary mb-2">슬롯을 선택하세요</h3>
                <p className="text-tertiary">스케줄을 생성하려면 먼저 MWF와 TT 슬롯을 선택해주세요.</p>
              </div>
            )}
          </div>
        </div>

        {/* 액션 바 */}
        <ActionBar
          onGenerateMwf={handleGenerateMwf}
          onGenerateTt={handleGenerateTt}
          onGenerateBoth={handleGenerateBoth}
          isLoading={isGenerating}
          disabled={!selectedMwfSlot && !selectedTtSlot}
        />
      </div>
    </div>
  );
};
