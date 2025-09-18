import React, { useState } from 'react';
import { Card } from './Card';
import { AccessibleButton } from '../a11y/AccessibleButton';
import { EditableScheduleView } from '../EditableScheduleView';
import type { MWFScheduleResult, TTScheduleResult } from '../../engine/types';

interface EditableScheduleResultCardProps {
  result: MWFScheduleResult | TTScheduleResult | null;
  title: string;
  schedulerType?: 'MWF' | 'TT';
  snapshotId?: string;
  onExport?: () => void;
  onScheduleSaved?: (newSnapshotId: string) => void;
}

export const EditableScheduleResultCard: React.FC<EditableScheduleResultCardProps> = ({
  result,
  title,
  schedulerType = 'MWF',
  snapshotId,
  onExport,
  onScheduleSaved
}) => {
  const [showEditMode, setShowEditMode] = useState(false);

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
      2: '10:00-10:50',
      3: '11:00-11:50',
      4: '12:00-12:50',
      5: '14:00-14:50',
      6: '15:00-15:50',
      7: '16:00-16:50',
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
  const periods = schedulerType === 'MWF' ? [1, 2, 3, 4, 5, 6, 7, 8] : [1, 2, 3, 4, 5, 6];

  // 통계 계산
  const getStats = () => {
    if (!result) return { homeroom: 0, korean: 0, foreign: 0, unassigned: 0 };
    
    let homeroom = 0, korean = 0, foreign = 0, unassigned = 0;
    
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
          } else {
            unassigned++;
          }
        });
      }
    });
    
    return { homeroom, korean, foreign, unassigned };
  };

  const stats = getStats();

  const handleScheduleSaved = (newSnapshotId: string) => {
    setShowEditMode(false);
    onScheduleSaved?.(newSnapshotId);
  };

  if (showEditMode && snapshotId) {
    return (
      <Card 
        title={`${title} - 편집 모드`}
        actions={
          <div className="flex space-x-2">
            <AccessibleButton
              onClick={() => setShowEditMode(false)}
              variant="secondary"
              size="sm"
            >
              보기 모드로 돌아가기
            </AccessibleButton>
            {onExport && (
              <AccessibleButton
                onClick={onExport}
                variant="secondary"
                size="sm"
              >
                내보내기
              </AccessibleButton>
            )}
          </div>
        }
      >
        <EditableScheduleView
          mwfResult={schedulerType === 'MWF' ? result as MWFScheduleResult : undefined}
          ttResult={schedulerType === 'TT' ? result as TTScheduleResult : undefined}
          snapshotId={snapshotId}
          onScheduleSaved={handleScheduleSaved}
        />
      </Card>
    );
  }

  return (
    <Card 
      title={title}
      actions={
        <div className="flex space-x-2">
          {snapshotId && (
            <AccessibleButton
              onClick={() => setShowEditMode(true)}
              variant="primary"
              size="sm"
            >
              편집 모드
            </AccessibleButton>
          )}
          {onExport && (
            <AccessibleButton
              onClick={onExport}
              variant="secondary"
              size="sm"
            >
              내보내기
            </AccessibleButton>
          )}
        </div>
      }
    >
      {/* 통계 */}
      <div className="grid grid-cols-4 gap-4 mb-6">
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
        <div className="text-center p-3 bg-secondary rounded-lg">
          <div className="text-2xl font-bold text-red-600">{stats.unassigned}</div>
          <div className="text-sm text-tertiary">미배정</div>
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
                  {period}교시
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
                        <span className="text-tertiary text-sm">미배정</span>
                      </td>
                    );
                  }

                  // Handle array assignments (for TT schedules)
                  if (Array.isArray(assignment)) {
                    return (
                      <td key={period} className="p-2 text-center">
                        <div className="space-y-1">
                          {assignment.map((a, index) => (
                            <div key={index} className={`px-2 py-1 rounded text-xs border ${getRoleColor(a.role)}`}>
                              <div className="font-medium">{a.teacher}</div>
                              <div className="text-xs opacity-75">
                                {getRoleLabel(a.role)} • {a.classId}
                              </div>
                            </div>
                          ))}
                        </div>
                      </td>
                    );
                  }

                  // Handle single assignment
                  return (
                    <td key={period} className="p-2 text-center">
                      <div className={`px-2 py-1 rounded text-xs border ${getRoleColor(assignment.role)}`}>
                        <div className="font-medium">{assignment.teacher}</div>
                        <div className="text-xs opacity-75">
                          {getRoleLabel(assignment.role)} • {assignment.classId}
                        </div>
                        {assignment.time && (
                          <div className="text-xs opacity-75">{assignment.time}</div>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 편집 안내 */}
      {snapshotId && (
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg">
          <div className="text-sm text-blue-800 dark:text-blue-200">
            <strong>편집 가능:</strong> 이 스케줄을 수동으로 편집할 수 있습니다. 
            "편집 모드" 버튼을 클릭하여 드래그 앤 드롭 또는 직접 편집을 시작하세요.
          </div>
        </div>
      )}
    </Card>
  );
};
