import React, { useState } from 'react';
// import { useTranslation } from 'react-i18next';
import { ScheduleResultTable } from './ScheduleResultTable';
import { useToast } from '../Toast/ToastProvider';
import type { MWFScheduleResult, TTScheduleResult } from '../../types/scheduler';

interface Assignment {
  teacher: string;
  role: 'H' | 'K' | 'F';
  classId: string;
  round?: number;
  isExam?: boolean;
}



interface SplitViewSchedulerProps {
  mwfResult: MWFScheduleResult | null;
  ttResult: TTScheduleResult | null;
  onGenerateBoth: () => Promise<{ mwf: MWFScheduleResult; tt: TTScheduleResult }>;
  isLoading?: boolean;
}

export const SplitViewScheduler: React.FC<SplitViewSchedulerProps> = ({
  mwfResult,
  ttResult,
  onGenerateBoth,
  isLoading = false
}) => {
  // const { t } = useTranslation();
  const toast = useToast();
  const [activeView, setActiveView] = useState<'split' | 'mwf' | 'tt'>('split');

  const handleGenerateBoth = async () => {
    try {
      await onGenerateBoth();
      toast.showToast({
        type: 'success',
        title: '스케줄 생성 완료',
        message: 'MWF와 TT 스케줄이 모두 생성되었습니다'
      });
    } catch (error) {
      toast.showToast({
        type: 'error',
        title: '스케줄 생성 실패',
        message: '스케줄 생성에 실패했습니다'
      });
    }
  };

  const handleCellClick = (schedulerType: 'MWF' | 'TT', day: string, period: number, assignment: Assignment | null) => {
    if (assignment) {
      const roleLabel = assignment.role === 'H' ? '담임' : assignment.role === 'K' ? '한국어' : '외국어';
      toast.showToast({
        type: 'info',
        title: `${schedulerType} 스케줄 정보`,
        message: `${day}요일 ${period}교시: ${assignment.teacher} (${roleLabel}) - ${assignment.classId}`,
        duration: 3000
      });
    }
  };

  const renderSplitView = () => (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      {/* MWF Schedule */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-primary">MWF (월수금) 스케줄</h3>
          <div className="text-sm text-secondary">1-8교시</div>
        </div>
        {mwfResult ? (
          <ScheduleResultTable
            result={mwfResult}
            title=""
            schedulerType="MWF"
            onCellClick={(day, period, assignment) => handleCellClick('MWF', day, period, assignment)}
          />
        ) : (
          <div className="p-8 text-center bg-card border border-border rounded-lg">
            <p className="text-secondary">MWF 스케줄이 생성되지 않았습니다</p>
          </div>
        )}
      </div>

      {/* TT Schedule */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-primary">TT (화목) 스케줄</h3>
          <div className="text-sm text-secondary">1-6교시</div>
        </div>
        {ttResult ? (
          <ScheduleResultTable
            result={ttResult}
            title=""
            schedulerType="TT"
            onCellClick={(day, period, assignment) => handleCellClick('TT', day, period, assignment)}
          />
        ) : (
          <div className="p-8 text-center bg-card border border-border rounded-lg">
            <p className="text-secondary">TT 스케줄이 생성되지 않았습니다</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderSingleView = (type: 'MWF' | 'TT') => {
    const result = type === 'MWF' ? mwfResult : ttResult;
    const title = type === 'MWF' ? 'MWF (월수금) 스케줄' : 'TT (화목) 스케줄';

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-primary">{title}</h3>
          <button
            onClick={() => setActiveView('split')}
            className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            분할 보기로 돌아가기
          </button>
        </div>
        {result ? (
          <ScheduleResultTable
            result={result}
            title=""
            schedulerType={type}
            onCellClick={(day, period, assignment) => handleCellClick(type, day, period, assignment)}
          />
        ) : (
          <div className="p-8 text-center bg-card border border-border rounded-lg">
            <p className="text-secondary">{type} 스케줄이 생성되지 않았습니다</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-primary">통합 스케줄러 (MWF + TT)</h2>
        <div className="flex gap-2">
          <button
            onClick={handleGenerateBoth}
            disabled={isLoading}
            className="px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
          >
            {isLoading ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>생성 중...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>MWF + TT 생성</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveView('split')}
          className={`px-4 py-2 rounded-md transition-colors ${
            activeView === 'split'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          분할 보기
        </button>
        <button
          onClick={() => setActiveView('mwf')}
          className={`px-4 py-2 rounded-md transition-colors ${
            activeView === 'mwf'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          MWF만 보기
        </button>
        <button
          onClick={() => setActiveView('tt')}
          className={`px-4 py-2 rounded-md transition-colors ${
            activeView === 'tt'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          TT만 보기
        </button>
      </div>

      {/* Schedule Info */}
      <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <h3 className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">통합 스케줄러 특징</h3>
        <div className="text-sm text-blue-600 dark:text-blue-400 space-y-1">
          <p>• <strong>MWF:</strong> 월, 수, 금요일 1-8교시 (담임+한국어+외국어)</p>
          <p>• <strong>TT:</strong> 화, 목요일 1-6교시 (1라운드: 담임+한국어+외국어, 2라운드: 담임+한국어)</p>
          <p>• <strong>단어시험:</strong> TT 4교시 (17:50-18:10)</p>
          <p>• <strong>제약조건:</strong> 두 스케줄러 모두 동일한 교사 제약조건 적용</p>
        </div>
      </div>

      {/* Content */}
      {activeView === 'split' && renderSplitView()}
      {activeView === 'mwf' && renderSingleView('MWF')}
      {activeView === 'tt' && renderSingleView('TT')}

      {/* Summary Stats */}
      {(mwfResult || ttResult) && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-md border border-green-200 dark:border-green-800">
            <div className="text-sm text-green-600 dark:text-green-400 font-medium">MWF 스케줄</div>
            <div className="text-lg font-bold text-green-700 dark:text-green-300">
              {mwfResult ? '생성됨' : '미생성'}
            </div>
          </div>
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-200 dark:border-blue-800">
            <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">TT 스케줄</div>
            <div className="text-lg font-bold text-blue-700 dark:text-blue-300">
              {ttResult ? '생성됨' : '미생성'}
            </div>
          </div>
          <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-md border border-purple-200 dark:border-purple-800">
            <div className="text-sm text-purple-600 dark:text-purple-400 font-medium">총 배정 수</div>
            <div className="text-lg font-bold text-purple-700 dark:text-purple-300">
              {(() => {
                let mwfCount = 0;
                let ttCount = 0;
                
                if (mwfResult) {
                  Object.values(mwfResult).forEach(daySchedule => {
                    Object.values(daySchedule).forEach(assignmentData => {
                      if (Array.isArray(assignmentData)) {
                        mwfCount += assignmentData.length;
                      } else if (assignmentData) {
                        mwfCount += 1;
                      }
                    });
                  });
                }
                
                if (ttResult) {
                  Object.values(ttResult).forEach(daySchedule => {
                    Object.values(daySchedule).forEach(assignmentData => {
                      if (Array.isArray(assignmentData)) {
                        ttCount += assignmentData.length;
                      } else if (assignmentData) {
                        ttCount += 1;
                      }
                    });
                  });
                }
                
                return mwfCount + ttCount;
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
