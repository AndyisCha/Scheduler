// src/components/ScheduleGenerator.tsx
// Schedule generation and display

import React, { useState } from 'react';
import type { SchedulerSlot, ScheduleResult } from '../types/scheduler';
import { DAYS } from '../types/scheduler';
import { createWeeklySchedule } from '../utils/scheduler';
import { exportClassView, exportTeacherView, printSchedule } from '../utils/export';
import { PerformanceMetricsPanel } from './PerformanceMetricsPanel';

interface ScheduleGeneratorProps {
  slot: SchedulerSlot | null;
  onScheduleGenerated?: (result: ScheduleResult) => void;
}

export const ScheduleGenerator: React.FC<ScheduleGeneratorProps> = ({ slot, onScheduleGenerated }) => {
  const [scheduleResult, setScheduleResult] = useState<ScheduleResult | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeView, setActiveView] = useState<'class' | 'teacher' | 'day'>('class');

  const generateSchedule = async () => {
    if (!slot) return;

    setIsGenerating(true);
    try {
      // Simulate async operation
      await new Promise(resolve => setTimeout(resolve, 100));
      const result = createWeeklySchedule(slot);
      setScheduleResult(result);
      onScheduleGenerated?.(result);
    } catch (error) {
      console.error('Schedule generation failed:', error);
      alert('스케줄 생성에 실패했습니다.');
    } finally {
      setIsGenerating(false);
    }
  };

  const canGenerate = slot && 
    slot.teachers.homeroomKoreanPool.length > 0 &&
    slot.teachers.foreignPool.length > 0 &&
    Object.values(slot.globalOptions.roundClassCounts).some(count => count > 0);

  if (!slot) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <p className="text-gray-500 text-center">활성 슬롯을 선택해주세요.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Generation button */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">스케줄 생성</h2>
            <p className="text-gray-600">
              현재 설정으로 주간 스케줄을 생성합니다.
            </p>
          </div>
          <button
            onClick={generateSchedule}
            disabled={!canGenerate || isGenerating}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              canGenerate && !isGenerating
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-gray-400 text-gray-200 cursor-not-allowed'
            }`}
          >
            {isGenerating ? '생성 중...' : '스케줄 생성'}
          </button>
        </div>

        {!canGenerate && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800 text-sm">
              스케줄을 생성하려면 다음이 필요합니다:
              <br />• 홈룸/한국어 교사 1명 이상
              <br />• 외국어 교사 1명 이상  
              <br />• 라운드별 클래스 수 1개 이상
            </p>
          </div>
        )}
      </div>

      {/* Performance Metrics Panel */}
      <PerformanceMetricsPanel 
        scheduleResult={scheduleResult}
        isGenerating={isGenerating}
      />

          {/* Schedule results */}
      {scheduleResult && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-800">생성된 스케줄</h2>
            <div className="flex space-x-2">
              <button
                onClick={() => setActiveView('class')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  activeView === 'class'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                클래스별
              </button>
              <button
                onClick={() => setActiveView('teacher')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  activeView === 'teacher'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                교사별
              </button>
              <button
                onClick={() => setActiveView('day')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  activeView === 'day'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                요일별
              </button>
            </div>
          </div>

          {/* Export buttons */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-gray-800 mb-3">내보내기 및 인쇄</h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => exportClassView(scheduleResult, 'csv')}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
              >
                클래스별 CSV 내보내기
              </button>
              <button
                onClick={() => exportClassView(scheduleResult, 'json')}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
              >
                클래스별 JSON 내보내기
              </button>
              <button
                onClick={() => exportTeacherView(scheduleResult, 'csv')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                교사별 CSV 내보내기
              </button>
              <button
                onClick={() => exportTeacherView(scheduleResult, 'json')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                교사별 JSON 내보내기
              </button>
              <button
                onClick={() => printSchedule(scheduleResult, activeView)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
              >
                현재 뷰 인쇄
              </button>
            </div>
          </div>

          {/* Warnings */}
          {scheduleResult.warnings.length > 0 && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <h3 className="font-semibold text-red-800 mb-2">경고사항</h3>
              <ul className="text-red-700 text-sm space-y-1">
                {scheduleResult.warnings.map((warning, index) => (
                  <li key={index}>• {warning}</li>
                ))}
              </ul>
            </div>
          )}

          {/* View content */}
          {activeView === 'class' && (
            <ClassView scheduleResult={scheduleResult} />
          )}
          {activeView === 'teacher' && (
            <TeacherView scheduleResult={scheduleResult} />
          )}
          {activeView === 'day' && (
            <DayView scheduleResult={scheduleResult} />
          )}
        </div>
      )}
    </div>
  );
};

// Class view component
const ClassView: React.FC<{ scheduleResult: ScheduleResult }> = ({ scheduleResult }) => {
  const classes = Object.keys(scheduleResult.classSummary).sort();

  return (
    <div className="space-y-4">
      {classes.map((classId) => (
        <div key={classId} className="border border-gray-200 rounded-lg p-4">
          <h3 className="font-semibold text-gray-800 mb-3">{classId}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {DAYS.map((day) => (
              <div key={day}>
                <h4 className="font-medium text-gray-700 mb-2">{day}</h4>
                <div className="space-y-1">
                  {(scheduleResult.classSummary[classId][day] || [])
                    .sort((a, b) => a.period - b.period)
                    .map((assignment, index) => (
                      <div
                        key={index}
                        className={`text-sm p-2 rounded ${
                          assignment.teacher === '(미배정)'
                            ? 'bg-red-100 text-red-800'
                            : assignment.role === 'EXAM'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        <div className="font-medium">
                          {assignment.period}교시 ({assignment.time})
                        </div>
                        <div>
                          {assignment.role === 'EXAM' ? '시험' : assignment.role} - {assignment.teacher}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

// Teacher view component
const TeacherView: React.FC<{ scheduleResult: ScheduleResult }> = ({ scheduleResult }) => {
  const teachers = Object.keys(scheduleResult.teacherSummary).sort();

  return (
    <div className="space-y-4">
      {teachers.map((teacher) => (
        <div key={teacher} className="border border-gray-200 rounded-lg p-4">
          <h3 className="font-semibold text-gray-800 mb-3">{teacher}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {DAYS.map((day) => (
              <div key={day}>
                <h4 className="font-medium text-gray-700 mb-2">{day}</h4>
                <div className="space-y-1">
                  {(scheduleResult.teacherSummary[teacher][day] || [])
                    .sort((a, b) => a.period - b.period)
                    .map((assignment, index) => (
                      <div
                        key={index}
                        className={`text-sm p-2 rounded ${
                          assignment.role === 'EXAM'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        <div className="font-medium">
                          {assignment.period}교시 ({assignment.time})
                        </div>
                        <div>
                          {assignment.classId} - {assignment.role === 'EXAM' ? '시험' : assignment.role}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

// Day view component
const DayView: React.FC<{ scheduleResult: ScheduleResult }> = ({ scheduleResult }) => {
  return (
    <div className="space-y-4">
      {DAYS.map((day) => (
        <div key={day} className="border border-gray-200 rounded-lg p-4">
          <h3 className="font-semibold text-gray-800 mb-4">{day}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {([1, 2, 3, 4, 5, 6, 7, 8] as const).map((period) => (
              <div key={period}>
                <h4 className="font-medium text-gray-700 mb-2">{period}교시</h4>
                <div className="space-y-1">
                  {(scheduleResult.dayGrid[day][period] || [])
                    .map((assignment, index) => (
                      <div
                        key={index}
                        className={`text-sm p-2 rounded ${
                          assignment.teacher === '(미배정)'
                            ? 'bg-red-100 text-red-800'
                            : assignment.role === 'EXAM'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-green-100 text-green-800'
                        }`}
                      >
                        <div className="font-medium">{assignment.classId}</div>
                        <div>
                          {assignment.role === 'EXAM' ? '시험' : assignment.role} - {assignment.teacher}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
