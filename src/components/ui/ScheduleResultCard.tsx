import React from 'react';
import { Card } from './Card';
import type { MWFScheduleResult, TTScheduleResult } from '../../engine/types';

interface ScheduleResultCardProps {
  result: MWFScheduleResult | TTScheduleResult | null;
  title: string;
  schedulerType?: 'MWF' | 'TT';
  onExport?: () => void;
}

export const ScheduleResultCard: React.FC<ScheduleResultCardProps> = ({
  result,
  title,
  schedulerType = 'MWF',
  onExport
}) => {
  const getRoleColor = (role: 'H' | 'K' | 'F' | 'EXAM') => {
    switch (role) {
      case 'H': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-200 dark:border-green-700';
      case 'K': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border-blue-200 dark:border-blue-700';
      case 'F': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 border-purple-200 dark:border-purple-700';
      case 'EXAM': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-red-200 dark:border-red-700';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200 border-gray-200 dark:border-gray-700';
    }
  };

  const getRoleLabel = (role: 'H' | 'K' | 'F' | 'EXAM') => {
    switch (role) {
      case 'H': return "담임";
      case 'K': return "한국어";
      case 'F': return "외국어";
      case 'EXAM': return "시험";
      default: return role;
    }
  };

  const formatPeriodTime = (period: number) => {
    const timeMap: { [key: number]: string } = {
      1: '09:00-09:50',
      1.5: '09:50-10:00',
      2: '10:00-10:50',
      2.5: '10:50-11:00',
      3: '11:00-11:50',
      3.5: '11:50-12:00',
      4: '12:00-12:50',
      4.5: '12:50-14:00',
      5: '14:00-14:50',
      5.5: '14:50-15:00',
      6: '15:00-15:50',
      6.5: '15:50-16:00',
      7: '16:00-16:50',
      7.5: '16:50-17:00',
      8: '17:00-17:50'
    };
    return timeMap[period] || `${period}교시`;
  };

  if (!result) {
    return (
      <Card title={title}>
        <p className="text-tertiary text-center py-8">스케줄 결과가 없습니다.</p>
      </Card>
    );
  }

  const days = schedulerType === 'MWF' ? ['월', '수', '금'] : ['화', '목'];
  const periods = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8];

  // 통계 계산
  const getStats = () => {
    if (!result) return { homeroom: 0, korean: 0, foreign: 0 };
    
    let homeroom = 0, korean = 0, foreign = 0;
    
    Object.values(result).forEach(daySchedule => {
      if (daySchedule && typeof daySchedule === 'object') {
        Object.values(daySchedule).forEach(assignment => {
          if (assignment) {
            if (Array.isArray(assignment)) {
              assignment.forEach(a => {
                if (a && typeof a === 'object' && 'role' in a) {
                  const role = (a as any).role;
                  if (role === 'H') homeroom++;
                  else if (role === 'K') korean++;
                  else if (role === 'F') foreign++;
                }
              });
            } else if (typeof assignment === 'object' && 'role' in assignment) {
              const role = (assignment as any).role;
              if (role === 'H') homeroom++;
              else if (role === 'K') korean++;
              else if (role === 'F') foreign++;
            }
          }
        });
      }
    });
    
    return { homeroom, korean, foreign };
  };

  const stats = getStats();

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
      {/* 통계 */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center p-3 bg-secondary rounded-lg">
          <div className="text-2xl font-bold text-green-600">{stats.homeroom}</div>
          <div className="text-sm text-tertiary">담임</div>
        </div>
        <div className="text-center p-3 bg-secondary rounded-lg">
          <div className="text-2xl font-bold text-blue-600">{stats.korean}</div>
          <div className="text-sm text-tertiary">한국어</div>
        </div>
        <div className="text-center p-3 bg-secondary rounded-lg">
          <div className="text-2xl font-bold text-purple-600">{stats.foreign}</div>
          <div className="text-sm text-tertiary">외국어</div>
        </div>
      </div>

      {/* 스케줄 테이블 */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-primary">
              <th className="text-left p-2 font-medium text-primary">요일</th>
              {periods.map(period => (
                <th key={period} className="text-center p-2 font-medium text-primary min-w-[100px]">
                  {period % 1 === 0 ? `${period}교시` : `${Math.floor(period)}-${Math.ceil(period)}교시 사이`}
                  <div className="text-xs text-tertiary">{formatPeriodTime(period)}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {days.map(day => (
              <tr key={day} className="border-b border-primary">
                <td className="p-2 font-medium text-primary">{day}</td>
                {periods.map(period => {
                  const assignment = result[day]?.[period];
                  
                  if (!assignment) {
                    return (
                      <td key={period} className="p-2 text-center">
                        <div className="w-full h-12 bg-tertiary/20 rounded border-2 border-dashed border-tertiary flex items-center justify-center">
                          <span className="text-tertiary text-xs">빈 교시</span>
                        </div>
                      </td>
                    );
                  }

                  const assignments = Array.isArray(assignment) ? assignment : [assignment];
                  
                  return (
                    <td key={period} className="p-2 text-center">
                      <div className="space-y-1">
                        {assignments.map((assign, idx) => {
                          if (!assign || typeof assign !== 'object' || !('role' in assign)) {
                            return null;
                          }
                          
                          const role = (assign as any).role;
                          const teacher = (assign as any).teacher;
                          const classId = (assign as any).classId;
                          const round = (assign as any).round;
                          const isExam = (assign as any).isExam;
                          
                          return (
                            <div
                              key={idx}
                              className={`
                                px-2 py-1 rounded text-xs font-medium border
                                ${isExam ? 'bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 border-purple-300 dark:from-purple-900 dark:to-pink-900 dark:text-purple-200 dark:border-purple-700' : getRoleColor(role)}
                                ${isExam ? 'relative' : ''}
                              `}
                            >
                              {isExam && (
                                <div className="absolute -top-1 -right-1 text-purple-500">📝</div>
                              )}
                              <div className="font-medium">{teacher}</div>
                              <div className="opacity-75">{getRoleLabel(role)}</div>
                              {classId && <div className="text-xs opacity-60">{classId}</div>}
                              {round && <div className="text-xs opacity-60">R{round}</div>}
                              {isExam && period % 1 !== 0 && (
                                <div className="text-xs text-purple-600 font-bold">교시 사이</div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};