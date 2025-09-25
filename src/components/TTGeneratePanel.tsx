import React, { useState } from 'react';
// import { useTranslation } from 'react-i18next';
import { SplitViewScheduler } from './ui/SplitViewScheduler';
import { useToast } from './Toast/ToastProvider';
import { generateTtSchedule } from '../engine/tt';
import { validateScheduleConstraints, generateConstraintViolationMessage } from '../utils/constraintValidator';
import type { TTScheduleResult, MWFScheduleResult } from '../types/scheduler';


export const TTGeneratePanel: React.FC = () => {
  // const { t } = useTranslation();
  const toast = useToast();
  
  const [mwfResult, setMwfResult] = useState<MWFScheduleResult | null>(null);
  const [ttResult, setTtResult] = useState<TTScheduleResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Mock data for demonstration
  const mockTeachers = [
    { id: 'h1', name: '김담임', role: 'H' as const },
    { id: 'h2', name: '이담임', role: 'H' as const },
    { id: 'h3', name: '박담임', role: 'H' as const },
    { id: 'h4', name: '최담임', role: 'H' as const },
    { id: 'k1', name: '정한국', role: 'K' as const },
    { id: 'k2', name: '한국어', role: 'K' as const },
    { id: 'k3', name: '김한국', role: 'K' as const },
    { id: 'f1', name: 'John Smith', role: 'F' as const },
    { id: 'f2', name: 'Sarah Johnson', role: 'F' as const }
  ];

  const mockConstraints = [
    {
      id: 'c1',
      teacherName: '김담임',
      homeroomDisabled: false,
      maxHomerooms: 2,
      unavailable: ['월|1', '수|3']
    },
    {
      id: 'c2',
      teacherName: '이담임',
      homeroomDisabled: false,
      maxHomerooms: 1,
      unavailable: ['금|5']
    }
  ];

  const handleGenerateBoth = async (): Promise<{ mwf: MWFScheduleResult; tt: TTScheduleResult }> => {
    setIsLoading(true);
    
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Create mock slot configs
      const mockSlotConfig = {
        id: 'unified',
        name: 'Unified Schedule Test',
        slot: {
          teachers: {
            homeroomKoreanPool: mockTeachers.filter(t => t.role === 'H' || t.role === 'K'),
            foreignPool: mockTeachers.filter(t => t.role === 'F')
          },
          globalOptions: {
            roundClassCounts: {
              1: 2,
              2: 2,
              3: 2,
              4: 2
            }
          },
          constraints: mockConstraints,
          fixedHomerooms: {}
        }
      };

      // Generate MWF schedule (mock)
      const mwfSchedule: MWFScheduleResult = {
        '월': {
          1: { teacher: '김담임', role: 'H', classId: 'R1C1', round: 1, period: 1, time: '14:20-15:05' },
          1.5: null,
          2: { teacher: '정한국', role: 'K', classId: 'R1C1', round: 1, period: 2, time: '15:10-15:55' },
          2.5: null,
          3: { teacher: 'John Smith', role: 'F', classId: 'R1C1', round: 1, period: 3, time: '16:15-17:00' },
          3.5: null,
          4: { teacher: '이담임', role: 'H', classId: 'R2C1', round: 1, period: 4, time: '17:05-17:50' },
          4.5: null,
          5: { teacher: '한국어', role: 'K', classId: 'R2C1', round: 1, period: 5, time: '18:05-18:55' },
          5.5: null,
          6: { teacher: 'Sarah Johnson', role: 'F', classId: 'R2C1', round: 1, period: 6, time: '19:00-19:50' },
          6.5: null,
          7: null,
          7.5: null,
          8: null
        },
        '수': {
          1: { teacher: '김담임', role: 'H', classId: 'R1C1', round: 1, period: 1, time: '14:20-15:05' },
          1.5: null,
          2: { teacher: '정한국', role: 'K', classId: 'R1C1', round: 1, period: 2, time: '15:10-15:55' },
          2.5: null,
          3: { teacher: 'John Smith', role: 'F', classId: 'R1C1', round: 1, period: 3, time: '16:15-17:00' },
          3.5: null,
          4: { teacher: '이담임', role: 'H', classId: 'R2C1', round: 1, period: 4, time: '17:05-17:50' },
          4.5: null,
          5: { teacher: '한국어', role: 'K', classId: 'R2C1', round: 1, period: 5, time: '18:05-18:55' },
          5.5: null,
          6: { teacher: 'Sarah Johnson', role: 'F', classId: 'R2C1', round: 1, period: 6, time: '19:00-19:50' },
          6.5: null,
          7: null,
          7.5: null,
          8: null
        },
        '금': {
          1: { teacher: '김담임', role: 'H', classId: 'R1C1', round: 1, period: 1, time: '14:20-15:05' },
          1.5: null,
          2: { teacher: '정한국', role: 'K', classId: 'R1C1', round: 1, period: 2, time: '15:10-15:55' },
          2.5: null,
          3: { teacher: 'John Smith', role: 'F', classId: 'R1C1', round: 1, period: 3, time: '16:15-17:00' },
          3.5: null,
          4: { teacher: '이담임', role: 'H', classId: 'R2C1', round: 1, period: 4, time: '17:05-17:50' },
          4.5: null,
          5: { teacher: '한국어', role: 'K', classId: 'R2C1', round: 1, period: 5, time: '18:05-18:55' },
          5.5: null,
          6: { teacher: 'Sarah Johnson', role: 'F', classId: 'R2C1', round: 1, period: 6, time: '19:00-19:50' },
          6.5: null,
          7: null,
          7.5: null,
          8: null
        }
      };

      // Generate TT schedule using the engine
      const ttSchedule = await generateTtSchedule(mockSlotConfig as any);

      // Validate both schedules
      const mwfValidation = validateScheduleConstraints(mockSlotConfig as any, mwfSchedule);
      const ttValidation = validateScheduleConstraints(mockSlotConfig as any, ttSchedule);

      // Update state
      setMwfResult(mwfSchedule);
      setTtResult(ttSchedule);

      // Show validation results
      if (!mwfValidation.isValid) {
        const mwfMessage = generateConstraintViolationMessage(mwfValidation.violations);
        toast.showToast({
          type: 'warning',
          title: 'MWF 스케줄 제약조건 위반',
          message: mwfMessage,
          duration: 8000
        });
      }

      if (!ttValidation.isValid) {
        const ttMessage = generateConstraintViolationMessage(ttValidation.violations);
        toast.showToast({
          type: 'warning',
          title: 'TT 스케줄 제약조건 위반',
          message: ttMessage,
          duration: 8000
        });
      }

      if (mwfValidation.isValid && ttValidation.isValid) {
        toast.showToast({
          type: 'success',
          title: '스케줄 생성 완료',
          message: 'MWF와 TT 스케줄이 성공적으로 생성되었습니다'
        });
      }

      return { mwf: mwfSchedule, tt: ttSchedule };
    } catch (error) {
      toast.showToast({
        type: 'error',
        title: '스케줄 생성 실패',
        message: '스케줄 생성에 실패했습니다'
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-secondary">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <SplitViewScheduler
          mwfResult={mwfResult}
          ttResult={ttResult}
          onGenerateBoth={handleGenerateBoth}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
};