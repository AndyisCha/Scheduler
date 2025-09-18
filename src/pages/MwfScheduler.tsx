import React, { useState } from 'react';
import { useSlotStore } from '../store/useSlotStore';
import { useSchedulerStore } from '../store/useSchedulerStore';
import { useAuthStore } from '../store/auth';
import { generateMwfSchedule } from '../engine/mwf';
import { SlotCard } from '../components/ui/SlotCard';
import { TeacherPoolCard } from '../components/ui/TeacherPoolCard';
import { ConstraintsCard } from '../components/ui/ConstraintsCard';
import { ScheduleResultCard } from '../components/ui/ScheduleResultCard';
import { ActionBar } from '../components/ui/ActionBar';
import { useToast } from '../components/Toast/ToastProvider';
import type { SlotConfig } from '../engine/types';

export const MwfScheduler: React.FC = () => {
  const toast = useToast();
  
  const { 
    slots, 
    activeSlotId, 
    homeroomKoreanPool, 
    foreignPool, 
    teacherConstraints, 
    addTeacherToPool,
    removeTeacherFromPool,
    updateTeacherConstraint
  } = useSlotStore();

  const { user, profile } = useAuthStore();

  const {
    mwfResult,
    isGenerating,
    setMwfResult,
    setGenerating,
    setGenerationError
  } = useSchedulerStore();

  const [selectedSlot] = useState<SlotConfig | null>(null);

  // MWF 스케줄 생성
  const handleGenerateMwf = async () => {
    if (!selectedSlot) {
      toast.error('먼저 슬롯을 선택해주세요.');
      return;
    }

    try {
      setGenerating(true);
      setGenerationError(null);

      const result = await generateMwfSchedule(
        selectedSlot, 
        user?.id, 
        profile?.role
      );
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

  return (
    <div className="min-h-screen bg-secondary transition-theme">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">MWF 스케줄러</h1>
          <p className="text-tertiary">월, 수, 금 요일 스케줄을 생성합니다.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 좌측: 슬롯 및 설정 */}
          <div className="space-y-6">
            {/* 슬롯 선택 */}
            <div>
              <h2 className="text-xl font-semibold text-primary mb-4">슬롯 선택</h2>
              <div className="space-y-3">
                {slots.length === 0 ? (
                  <p className="text-tertiary text-center py-8">생성된 슬롯이 없습니다.</p>
                ) : (
                  slots.map((slot) => (
                    <SlotCard
                      key={slot.id}
                      slot={slot}
                      onEdit={() => {}}
                      onDelete={() => {}}
                      isActive={activeSlotId === slot.id}
                    />
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
              <ScheduleResultCard
                result={mwfResult}
                title="MWF 스케줄 결과"
                schedulerType="MWF"
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
          onGenerateMwf={handleGenerateMwf}
          onGenerateTt={() => {}}
          onGenerateBoth={() => {}}
          isLoading={isGenerating}
          disabled={!selectedSlot}
        />
      </div>
    </div>
  );
};