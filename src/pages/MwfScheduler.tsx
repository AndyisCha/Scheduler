import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { useSlotStore } from '../store/useSlotStore';
import { useSchedulerStore } from '../store/useSchedulerStore';
import { useAuthStore } from '../store/auth';
import { generateUnifiedSchedules } from '../engine/unifiedScheduler';
import type { UnifiedSlotConfig, Teacher } from '../engine/unifiedScheduler';
import { validateScheduleConstraints } from '../utils/scheduleValidation';
import { SlotCard } from '../components/ui/SlotCard';
import { TeacherPoolCard } from '../components/ui/TeacherPoolCard';
import { ConstraintsCard } from '../components/ui/ConstraintsCard';
// 동적 임포트로 번들 크기 최적화
const UnifiedScheduleResultCard = lazy(() => import('../components/ui/UnifiedScheduleResultCard').then(module => ({ default: module.UnifiedScheduleResultCard })));
import { ActionBar } from '../components/ui/ActionBar';
import { useToast } from '../components/Toast/ToastProvider';
import { unifiedSlotService } from '../services/unifiedSlotService';
import { unifiedScheduleService } from '../services/unifiedScheduleService';
import type { UnifiedSlotConfig as ServiceUnifiedSlotConfig } from '../services/unifiedSlotService';

// 교사 데이터 정규화 함수 - useMemo로 최적화
type RawTeachers = { homeroomKoreanPool: string[]; foreignPool: string[] };

const normalizeTeachers = (raw: RawTeachers) => {
  const hkObjects = raw.homeroomKoreanPool.map((name) => ({
    id: `hk:${name}`,
    name,
    role: 'H' as const, // 기본은 H
  }));
  const fObjects = raw.foreignPool.map((name) => ({
    id: `f:${name}`,
    name,
    role: 'F' as const,
  }));
  return { homeroomKoreanPool: hkObjects, foreignPool: fObjects };
};

export const MwfScheduler: React.FC = () => {
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
    isGenerating,
    setMwfResult,
    setGenerating,
    setGenerationError
  } = useSchedulerStore();

  const [selectedSlot, setSelectedSlot] = useState<ServiceUnifiedSlotConfig | null>(null);
  const [mwfSlots, setMwfSlots] = useState<ServiceUnifiedSlotConfig[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // 계산 비용이 높은 값들을 useMemo로 최적화
  const normalizedTeachers = useMemo(() => {
    if (!selectedSlot?.teachers) return { homeroomKoreanPool: [], foreignPool: [] };
    return normalizeTeachers(selectedSlot.teachers);
  }, [selectedSlot?.teachers]);

  const totalTeachers = useMemo(() => {
    return homeroomKoreanPool.length + foreignPool.length;
  }, [homeroomKoreanPool.length, foreignPool.length]);

  const hasValidConfiguration = useMemo(() => {
    return totalTeachers > 0 && selectedSlot !== null;
  }, [totalTeachers, selectedSlot]);

  // MWF 슬롯 로드 (중복 호출 방지)
  useEffect(() => {
    if (loaded) return;
    if (user && profile) {
      setLoaded(true);
      loadMwfSlots();
    }
  }, [loaded, user, profile]);

  const loadMwfSlots = async () => {
    if (!user || !profile) return;

    console.log('🔍 Loading MWF slots with:', {
      userId: user.id,
      userRole: profile.role,
      userName: user.email
    });

    setIsLoading(true);
    try {
      const slots = await unifiedSlotService.getSlotsByDayGroup('MWF', user.id, profile.role);
      console.log('📦 MWF slots loaded:', slots);
      console.log('📋 Sample slot structure:', slots[0]);
      console.log('📋 Sample slot teachers:', slots[0]?.teachers);
      console.log('📋 Sample slot teachers type:', typeof slots[0]?.teachers);
      console.log('📋 Sample slot teachers structure:', {
        homeroomKoreanPool: slots[0]?.teachers?.homeroomKoreanPool,
        foreignPool: slots[0]?.teachers?.foreignPool,
        homeroomKoreanPoolLength: slots[0]?.teachers?.homeroomKoreanPool?.length,
        foreignPoolLength: slots[0]?.teachers?.foreignPool?.length
      });
      console.log('📋 Sample slot keys:', slots[0] ? Object.keys(slots[0]) : 'N/A');
      
      // 더 자세한 디버깅
      if (slots[0]?.teachers) {
        console.log('🔍 Teachers object details:', JSON.stringify(slots[0].teachers, null, 2));
        console.log('🔍 Teachers homeroomKoreanPool:', slots[0].teachers.homeroomKoreanPool);
        console.log('🔍 Teachers foreignPool:', slots[0].teachers.foreignPool);
        console.log('🔍 Teachers object keys:', Object.keys(slots[0].teachers));
        console.log('🔍 Teachers object values:', Object.values(slots[0].teachers));
      }
      setMwfSlots(slots);
    } catch (error) {
      console.error('❌ Error loading MWF slots:', error);
      const errorMessage = error instanceof Error ? error.message : 'MWF 슬롯을 불러오는 중 오류가 발생했습니다.';
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

    setIsGenerating(true);
    try {
      console.log('🚀 Starting TT schedule generation...');
      
      const normalizedTeachers = normalizeTeachers(selectedSlot.teachers);
      
      const unifiedConfig: UnifiedSlotConfig = {
        id: selectedSlot.id,
        name: selectedSlot.name,
        slot: {
          teachers: normalizedTeachers,
          globalOptions: {
            includeHInK: selectedSlot.globalOptions?.includeHInK ?? true,
            preferOtherHForK: selectedSlot.globalOptions?.preferOtherHForK ?? false,
            disallowOwnHAsK: selectedSlot.globalOptions?.disallowOwnHAsK ?? true,
            allowForeignFallbackToK: true,
            roundClassCounts: {
              tt: { 
                1: 2, 
                2: 2
              }
            }
          },
          constraints: selectedSlot.teacherConstraints ? 
            Object.entries(selectedSlot.teacherConstraints).map(([teacherName, constraint]) => ({
              teacherName: teacherName,
              ...constraint
            })) : [],
          fixedHomerooms: selectedSlot.fixedHomerooms || {}
        }
      };
      
      const result = generateUnifiedSchedules(unifiedConfig);
      console.log('✅ TT generation completed, result:', result);
      
      setMwfResult(result);
      
      const validation = result.validation;
      
      if (validation.isValid) {
        toast.success('TT 스케줄이 성공적으로 생성되었습니다!');
      } else {
        toast.warning(`TT 스케줄 생성 완료 (${validation.warnings.length}개 경고)`);
      }
      
      if (validation.errors.length > 0) {
        console.error('❌ TT Schedule errors:', validation.errors);
        toast.error(`TT 스케줄 오류: ${validation.errors[0]}`);
      }
      
      if (validation.warnings.length > 0) {
        console.warn('⚠️ TT Schedule warnings:', validation.warnings);
      }
      
    } catch (error) {
      console.error('❌ TT generation failed:', error);
      toast.error('TT 스케줄 생성에 실패했습니다.');
    } finally {
      setIsGenerating(false);
    }
  };

  // 통합 스케줄 생성 (MWF + TT)
  const handleGenerateBoth = async () => {
    if (!selectedSlot) {
      toast.error('먼저 슬롯을 선택해주세요.');
      return;
    }

    setIsGenerating(true);
    try {
      console.log('🚀 Starting unified schedule generation (MWF + TT)...');
      
      const normalizedTeachers = normalizeTeachers(selectedSlot.teachers);
      
      const unifiedConfig: UnifiedSlotConfig = {
        id: selectedSlot.id,
        name: selectedSlot.name,
        slot: {
          teachers: normalizedTeachers,
          globalOptions: {
            includeHInK: selectedSlot.globalOptions?.includeHInK ?? true,
            preferOtherHForK: selectedSlot.globalOptions?.preferOtherHForK ?? false,
            disallowOwnHAsK: selectedSlot.globalOptions?.disallowOwnHAsK ?? true,
            allowForeignFallbackToK: true,
            roundClassCounts: {
              mwf: { 
                1: 3, 
                2: 3, 
                3: 3, 
                4: 3 
              },
              tt: { 
                1: 2, 
                2: 2
              }
            },
            mwfRound1Period2: 'K'
          },
          constraints: selectedSlot.teacherConstraints ? 
            Object.entries(selectedSlot.teacherConstraints).map(([teacherName, constraint]) => ({
              teacherName: teacherName,
              ...constraint
            })) : [],
          fixedHomerooms: selectedSlot.fixedHomerooms || {}
        }
      };
      
      const result = generateUnifiedSchedules(unifiedConfig);
      console.log('✅ Unified generation completed, result:', result);
      
      setMwfResult(result);
      
      const validation = result.validation;
      
      if (validation.isValid) {
        toast.success('통합 스케줄이 성공적으로 생성되었습니다!');
      } else {
        toast.warning(`통합 스케줄 생성 완료 (${validation.warnings.length}개 경고)`);
      }
      
      if (validation.errors.length > 0) {
        console.error('❌ Unified Schedule errors:', validation.errors);
        toast.error(`통합 스케줄 오류: ${validation.errors[0]}`);
      }
      
      if (validation.warnings.length > 0) {
        console.warn('⚠️ Unified Schedule warnings:', validation.warnings);
      }
      
    } catch (error) {
      console.error('❌ Unified generation failed:', error);
      toast.error('통합 스케줄 생성에 실패했습니다.');
    } finally {
      setIsGenerating(false);
    }
  };

  // MWF 스케줄 생성
  const handleGenerateMwf = async () => {
    if (!selectedSlot) {
      toast.error('먼저 슬롯을 선택해주세요.');
      return;
    }

    try {
      setGenerating(true);
      setGenerationError(null);

      console.log('🚀 Starting MWF schedule generation with NEW UNIFIED ENGINE...');
      console.log('🔍 Selected slot:', selectedSlot);
      console.log('📋 Selected slot globalOptions:', selectedSlot.globalOptions);
      console.log('📋 Exam periods:', (selectedSlot.globalOptions as any)?.examPeriods);
      console.log('📋 Round class counts:', selectedSlot.globalOptions?.roundClassCounts);
      console.log('🔧 Using generateUnifiedSchedules function from unifiedScheduler.ts');
      
      // Use pre-computed normalized teachers
      console.log('🔄 Using pre-computed normalized teachers:', normalizedTeachers);
      
      const unifiedConfig: UnifiedSlotConfig = {
        id: selectedSlot.id,
        name: selectedSlot.name,
        slot: {
          teachers: normalizedTeachers,
          globalOptions: {
            includeHInK: selectedSlot.globalOptions?.includeHInK ?? true,
            preferOtherHForK: selectedSlot.globalOptions?.preferOtherHForK ?? false,
            disallowOwnHAsK: selectedSlot.globalOptions?.disallowOwnHAsK ?? true,
            allowForeignFallbackToK: true,
            roundClassCounts: {
              mwf: { 
                1: 3, 
                2: 3, 
                3: 3, 
                4: 3 
              }
            },
            mwfRound1Period2: 'K'
          },
          constraints: selectedSlot.teacherConstraints ? 
            Object.entries(selectedSlot.teacherConstraints).map(([teacherName, constraint]) => ({
              teacherName: teacherName,
              ...constraint
            })) : [],
          fixedHomerooms: selectedSlot.fixedHomerooms || {}
        }
      };
      
      // Temporary: Use direct generation until DB is updated
      console.log('🔧 About to call generateUnifiedSchedules with config:', unifiedConfig);
      const result = generateUnifiedSchedules(unifiedConfig);
      console.log('✅ generateUnifiedSchedules completed, result:', result);
      
      // Use unified result directly
      setMwfResult(result);
      
      // Use validation from the engine
      const validation = result.validation;
      
      console.log('📊 NEW UNIFIED ENGINE RESULT:', result);
      console.log('📊 MWF result structure:', result.mwf);
      console.log('📊 MWF 월요일 periods:', result.mwf['월']?.periods);
      console.log('📊 MWF 월요일 wordTests:', result.mwf['월']?.wordTests);
      console.log('📊 MWF 월요일 wordTests 상세:', result.mwf['월']?.wordTests?.map(wt => ({
        classId: wt.classId,
        teacher: wt.teacher,
        time: wt.time,
        label: wt.label
      })));
      console.log('📊 Validation result:', validation);
      if (!validation.isValid) {
        console.log('❌ Validation errors:', validation.errors);
        console.log('⚠️ Validation warnings:', validation.warnings);
      }
      if (validation.infos?.length) {
        console.info('ℹ️ Schedule infos:', validation.infos);
      }
      
      if (validation.isValid) {
        toast.success('MWF 스케줄이 생성되었습니다.');
        if (validation.warnings.length > 0) {
          console.warn('⚠️ Schedule warnings:', validation.warnings);
        }
        if (validation.infos?.length > 0) {
          console.info('ℹ️ Schedule infos:', validation.infos);
        }
      } else {
        toast.error(`스케줄 검증 실패: ${validation.errors.join(', ')}`);
      }
    } catch (error) {
      console.error('❌ MWF Schedule generation error:', error);
      console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      const errorMessage = error instanceof Error ? error.message : '스케줄 생성 중 오류가 발생했습니다.';
      setGenerationError(errorMessage);
      toast.error(`스케줄 생성 실패: ${errorMessage}`);
    } finally {
      setGenerating(false);
    }
  };

  // 교사 추가 핸들러 - useCallback으로 최적화
  const handleAddTeacher = useCallback((pool: 'homeroomKorean' | 'foreign', name: string) => {
    addTeacherToPool(pool, name);
    toast.success(`${name} 교사가 추가되었습니다.`);
  }, [addTeacherToPool, toast]);

  // 교사 제거 핸들러 - useCallback으로 최적화
  const handleRemoveTeacher = useCallback((pool: 'homeroomKorean' | 'foreign', name: string) => {
    removeTeacherFromPool(pool, name);
    toast.success(`${name} 교사가 제거되었습니다.`);
  }, [removeTeacherFromPool, toast]);

  // 제약조건 업데이트 핸들러 - useCallback으로 최적화
  const handleUpdateConstraint = useCallback((teacherName: string, constraint: any) => {
    updateTeacherConstraint(teacherName, constraint);
    toast.success(`${teacherName} 교사의 제약조건이 업데이트되었습니다.`);
  }, [updateTeacherConstraint, toast]);

  // 슬롯 선택 핸들러 - useCallback으로 최적화
  const handleSlotSelect = useCallback((slot: ServiceUnifiedSlotConfig) => {
    console.log('🎯 Slot clicked:', slot);
    console.log('🎯 Slot teachers:', slot.teachers);
    console.log('🎯 Slot teachers type:', typeof slot.teachers);
    console.log('🎯 Slot teachers structure:', {
      homeroomKoreanPool: slot.teachers?.homeroomKoreanPool,
      foreignPool: slot.teachers?.foreignPool,
      homeroomKoreanPoolLength: slot.teachers?.homeroomKoreanPool?.length,
      foreignPoolLength: slot.teachers?.foreignPool?.length
    });
    
    // 슬롯의 원본 데이터 구조 확인
    console.log('🔍 Full slot object:', slot);
    console.log('🔍 Slot keys:', Object.keys(slot));
    console.log('🔍 Has teachers property:', 'teachers' in slot);
    console.log('🔍 Teachers property value:', slot.teachers);
    console.log('🔍 Teachers property type:', typeof slot.teachers);
    console.log('🔍 Teachers property keys:', slot.teachers ? Object.keys(slot.teachers) : 'N/A');
    
    // 더 자세한 teachers 데이터 확인
    if (slot.teachers) {
      console.log('🔍 Teachers JSON:', JSON.stringify(slot.teachers, null, 2));
      console.log('🔍 Teachers homeroomKoreanPool:', slot.teachers.homeroomKoreanPool);
      console.log('🔍 Teachers foreignPool:', slot.teachers.foreignPool);
      console.log('🔍 Teachers homeroomKoreanPool type:', typeof slot.teachers.homeroomKoreanPool);
      console.log('🔍 Teachers foreignPool type:', typeof slot.teachers.foreignPool);
      console.log('🔍 Teachers homeroomKoreanPool length:', slot.teachers.homeroomKoreanPool?.length);
      console.log('🔍 Teachers foreignPool length:', slot.teachers.foreignPool?.length);
    }
    
    setSelectedSlot(slot);
    
    // 선택된 슬롯의 교사 정보를 스케줄러 상태에 동기화
    console.log('🔄 Syncing slot data to scheduler state:', slot);
    
    // 교사 정보 동기화
    const teachers = slot.teachers || { homeroomKoreanPool: [], foreignPool: [] };
    console.log('📋 Teachers to sync:', teachers);
    
    // 기존 교사 목록 초기화 후 새 데이터로 설정
    clearAllTeachers();
    console.log('🧹 Cleared all teachers');
    
    // 한국어/담임 교사 추가
    teachers.homeroomKoreanPool.forEach((teacher: any, index: number) => {
      const teacherName = typeof teacher === 'string' ? teacher : teacher.name || teacher;
      console.log(`➕ Adding homeroom teacher ${index + 1}:`, teacherName);
      addTeacherToPool('homeroomKorean', teacherName);
    });
    
    // 외국어 교사 추가
    teachers.foreignPool.forEach((teacher: any, index: number) => {
      const teacherName = typeof teacher === 'string' ? teacher : teacher.name || teacher;
      console.log(`➕ Adding foreign teacher ${index + 1}:`, teacherName);
      addTeacherToPool('foreign', teacherName);
    });
    
    // 제약조건 동기화
    if (slot.teacherConstraints) {
      Object.entries(slot.teacherConstraints).forEach(([teacherName, constraint]) => {
        updateTeacherConstraint(teacherName, constraint);
      });
    }
    
    console.log('✅ Slot data synced:', {
      homeroomKorean: teachers.homeroomKoreanPool.length,
      foreign: teachers.foreignPool.length,
      constraints: Object.keys(slot.teacherConstraints || {}).length
    });
    
    // 현재 스케줄러 상태 확인
    setTimeout(() => {
      console.log('📊 Current scheduler state after sync:', {
        homeroomKoreanPool,
        foreignPool,
        homeroomKoreanCount: homeroomKoreanPool.length,
        foreignCount: foreignPool.length
      });
    }, 100);
    
    toast.success(`${slot.name} 슬롯이 선택되었습니다. (교사 ${teachers.homeroomKoreanPool.length + teachers.foreignPool.length}명 동기화됨)`);
  }, [clearAllTeachers, addTeacherToPool, updateTeacherConstraint, homeroomKoreanPool, foreignPool, toast]);

  // 슬롯 편집 핸들러
  const handleSlotEdit = (slotId: string) => {
    const slot = mwfSlots.find(s => s.id === slotId);
    if (slot) {
      // 슬롯 편집 페이지로 이동
      window.location.href = `/slots/${slotId}`;
    } else {
      toast.error('슬롯을 찾을 수 없습니다.');
    }
  };

  // 슬롯 삭제 핸들러
  const handleSlotDelete = async (slotId: string) => {
    const slot = mwfSlots.find(s => s.id === slotId);
    if (!slot) {
      toast.error('슬롯을 찾을 수 없습니다.');
      return;
    }

    if (window.confirm(`정말로 "${slot.name}" 슬롯을 삭제하시겠습니까?`)) {
      try {
        await unifiedSlotService.deleteSlot(slotId);
        toast.success(`${slot.name} 슬롯이 삭제되었습니다.`);
        // 슬롯 목록 새로고침
        loadMwfSlots();
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
          <h1 className="text-3xl font-bold text-primary mb-2">MWF 스케줄러</h1>
          <p className="text-tertiary">월, 수, 금 요일 스케줄을 생성합니다.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 좌측: 슬롯 및 설정 */}
          <div className="space-y-6">
            {/* 슬롯 선택 */}
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
                      onClick={() => {
                        console.log('🖱️ Slot card clicked:', slot.name, slot.id);
                        handleSlotSelect(slot);
                      }}
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
              <Suspense fallback={<div className="bg-primary rounded-lg border border-primary p-8 text-center">스케줄 결과 로딩 중...</div>}>
                <UnifiedScheduleResultCard
                  result={mwfResult}
                  title={mwfResult?.tt ? "통합 스케줄 결과 (MWF + TT)" : "MWF 스케줄 결과"}
                  schedulerType="MWF"
                  onExport={() => {
                    // Export logic here
                    toast.success('스케줄이 내보내기되었습니다.');
                  }}
                />
              </Suspense>
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
          onGenerateTt={handleGenerateTt}
          onGenerateBoth={handleGenerateBoth}
          isLoading={isGenerating}
          disabled={!selectedSlot}
        />
      </div>
    </div>
  );
};