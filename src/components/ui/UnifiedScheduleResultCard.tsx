import React from 'react';
import { Card } from './Card';
import type { MWFScheduleResult, TTScheduleResult, DayResultMWF, DayResultTT, UnifiedGenerateResult, ValidationResult } from '../../engine/unifiedScheduler';
import { coerceCellToArray } from '../../types/scheduler';
import '../../styles/schedule-v2.css';

interface UnifiedScheduleResultCardProps {
  result: UnifiedGenerateResult | null;
  title: string;
  schedulerType?: 'MWF' | 'TT';
  onExport?: () => void;
  showValidation?: boolean;
}

export const UnifiedScheduleResultCard: React.FC<UnifiedScheduleResultCardProps> = ({
  result,
  title,
  schedulerType = 'MWF',
  onExport,
  showValidation = true
}) => {
  const getRoleColor = (role: 'H' | 'K' | 'F') => {
    switch (role) {
      case 'H': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-200 dark:border-green-700';
      case 'K': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border-blue-200 dark:border-blue-700';
      case 'F': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 border-purple-200 dark:border-purple-700';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200 border-gray-200 dark:border-gray-700';
    }
  };

  const getRoleLabel = (role: 'H' | 'K' | 'F') => {
    switch (role) {
      case 'H': return "담임";
      case 'K': return "한국어";
      case 'F': return "외국어";
      default: return role;
    }
  };

  const formatPeriodTime = (period: number) => {
    if (schedulerType === 'TT') {
      const timeMap: { [key: number]: string } = {
        1: '15:20–16:05',
        2: '16:10–16:55',
        3: '17:00–17:45',
        4: '18:10–19:00',
        5: '19:05–19:55',
        6: '20:00–20:50',
      };
      return timeMap[period] || `${period}교시`;
    } else {
      const timeMap: { [key: number]: string } = {
        1: '14:20–15:05',
        2: '15:10–15:55',
        3: '16:15–17:00',
        4: '17:05–17:50',
        5: '18:05–18:55',
        6: '19:00–19:50',
        7: '20:15–21:05',
        8: '21:10–22:00',
      };
      return timeMap[period] || `${period}교시`;
    }
  };

  if (!result) {
    return (
      <Card title={title}>
        <p className="text-tertiary text-center py-8">스케줄 결과가 없습니다.</p>
      </Card>
    );
  }

  const days = schedulerType === 'MWF' ? ['월', '수', '금'] : ['화', '목'];
  const periods = schedulerType === 'MWF' ? [1, 2, 3, 4, 5, 6, 7, 8] : [1, 2, 3, 4, 5, 6];

  return (
    <Card 
      title={title}
      actions={
        onExport && (
          <button
            onClick={onExport}
            className="px-3 py-1.5 text-sm bg-accent-primary text-white rounded-md hover:bg-accent-primary/90 transition-colors"
          >
            내보내기
          </button>
        )
      }
    >
      {/* 검증 결과 표시 */}
      {showValidation && result?.validation && (
        <div className={`validation-result ${result.validation.isValid ? 'valid' : 'invalid'} fade-in-up`}>
          <h3 className="text-lg font-semibold mb-3 text-primary">검증 결과</h3>
          <div className="validation-status">
            <span className={result.validation.isValid ? 'valid' : 'invalid'}>
              {result.validation.isValid ? '✅ 유효한 스케줄' : '❌ 스케줄 오류'}
            </span>
          </div>
          <div className="space-y-3 mt-3">
            {result.validation.errors.length > 0 && (
              <div className="validation-list error">
                <div className="font-medium">오류:</div>
                <ul>
                  {result.validation.errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
            {result.validation.warnings.length > 0 && (
              <div className="validation-list warning">
                <div className="font-medium">경고:</div>
                <ul>
                  {result.validation.warnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}
            {result.validation.infos.length > 0 && (
              <div className="validation-list info">
                <div className="font-medium">정보:</div>
                <ul>
                  {result.validation.infos.map((info, index) => (
                    <li key={index}>{info}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MWF 스케줄 */}
      {result?.mwf && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4 text-primary">MWF 스케줄 (월/수/금)</h3>
          {['월', '수', '금'].map(day => {
            const dayResult = result.mwf[day] as DayResultMWF;
            if (!dayResult) return null;

            return (
              <div key={day} className="mb-6">
                <h4 className="text-md font-semibold mb-3 text-primary">{day}요일</h4>
            
            {/* 정규 수업 시간표 */}
            <div className="mb-6">
              <h4 className="text-md font-medium mb-3 text-secondary">정규 수업</h4>
              <div className="overflow-x-auto custom-scrollbar">
                <table className="schedule-table">
                  <thead>
                    <tr>
                      <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">교시</th>
                      {periods.map(period => (
                        <th key={period} className="period-header">
                          <div className="font-semibold text-gray-700 dark:text-gray-300">{period}교시</div>
                          <div className="period-time">{formatPeriodTime(period)}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="p-3 font-medium text-gray-700 dark:text-gray-300">수업</td>
                      {periods.map(period => {
                        // 안전한 접근을 위해 periods가 존재하는지 확인
                        const periodData = dayResult?.periods?.[period];
                        const assignments = coerceCellToArray(periodData);
                        
                        if (assignments.length === 0) {
                          return (
                            <td key={period} className="p-3 text-center">
                              <div className="empty-period">
                                <span className="empty-period-text">빈 교시</span>
                              </div>
                            </td>
                          );
                        }
                        
                        return (
                          <td key={period} className="p-3 text-center">
                            <div className="flex flex-col gap-2">
                              {assignments.map((assignment, index) => (
                                <div
                                  key={index}
                                  className={`assignment-card ${assignment.role.toLowerCase()} interactive-card fade-in-up`}
                                  style={{ animationDelay: `${index * 0.1}s` }}
                                >
                                  <div className="teacher-name">{assignment.teacher}</div>
                                  <div className="role-label">{getRoleLabel(assignment.role)}</div>
                                  <div className="class-info">{assignment.classId}</div>
                                  <div className="round-info">R{assignment.round}</div>
                                </div>
                              ))}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 시험 시간표 */}
            {dayResult.wordTests && dayResult.wordTests.length > 0 && (
              <div>
                <h4 className="text-md font-medium mb-3 text-secondary">단어 시험</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {dayResult.wordTests.map((exam, index) => (
                    <div
                      key={index}
                      className="word-test-card interactive-card fade-in-up"
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      <div className="word-test-header">
                        <span className="word-test-label">📝 단어시험</span>
                        <span className="word-test-time">{exam.time}</span>
                      </div>
                      <div className="space-y-1">
                        <div className="word-test-teacher">
                          {exam.teacher} (담임)
                        </div>
                        <div className="word-test-class">
                          {exam.classId}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
              </div>
            );
          })}
        </div>
      )}

      {/* TT 스케줄 */}
      {result?.tt && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4 text-primary">TT 스케줄 (화/목)</h3>
          {['화', '목'].map(day => {
            const dayResult = result.tt[day] as DayResultTT;
            if (!dayResult) return null;

            return (
              <div key={day} className="mb-6">
                <h4 className="text-md font-semibold mb-3 text-primary">{day}요일</h4>
            
                {/* 정규 수업 시간표 */}
                <div className="mb-6">
                  <h4 className="text-md font-medium mb-3 text-secondary">정규 수업</h4>
                  <div className="overflow-x-auto custom-scrollbar">
                    <table className="schedule-table">
                      <thead>
                        <tr>
                          <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">교시</th>
                          {[1, 2, 3, 4, 5, 6].map(period => (
                            <th key={period} className="period-header">
                              <div className="font-semibold text-gray-700 dark:text-gray-300">{period}교시</div>
                              <div className="period-time">{formatPeriodTime(period)}</div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="p-3 font-medium text-gray-700 dark:text-gray-300">수업</td>
                          {[1, 2, 3, 4, 5, 6].map(period => {
                            const periodData = dayResult.periods[period];
                            const assignments = coerceCellToArray(periodData);
                            
                            if (assignments.length === 0) {
                              return (
                                <td key={period} className="p-3 text-center">
                                  <div className="empty-period">
                                    <span className="empty-period-text">빈 교시</span>
                                  </div>
                                </td>
                              );
                            }
                            
                            return (
                              <td key={period} className="p-3 text-center">
                                <div className="flex flex-col gap-2">
                                  {assignments.map((assignment, index) => (
                                    <div
                                      key={index}
                                      className={`assignment-card ${assignment.role.toLowerCase()} interactive-card fade-in-up`}
                                      style={{ animationDelay: `${index * 0.1}s` }}
                                    >
                                      <div className="teacher-name">{assignment.teacher}</div>
                                      <div className="role-label">{getRoleLabel(assignment.role)}</div>
                                      <div className="class-info">{assignment.classId}</div>
                                      <div className="round-info">R{assignment.round}</div>
                                    </div>
                                  ))}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 시험 시간표 */}
                {dayResult.wordTests && dayResult.wordTests.length > 0 && (
                  <div>
                    <h4 className="text-md font-medium mb-3 text-secondary">단어 시험</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {dayResult.wordTests.map((exam, index) => (
                        <div
                          key={index}
                          className="word-test-card interactive-card fade-in-up"
                          style={{ animationDelay: `${index * 0.1}s` }}
                        >
                          <div className="word-test-header">
                            <span className="word-test-label">📝 단어시험</span>
                            <span className="word-test-time">{exam.time}</span>
                          </div>
                          <div className="space-y-1">
                            <div className="word-test-teacher">
                              {exam.teacher} (담임)
                            </div>
                            <div className="word-test-class">
                              {exam.classId}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
};
