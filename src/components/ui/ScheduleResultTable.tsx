import React, { useState } from 'react';
// import { useTranslation } from 'react-i18next';
import type { MWFScheduleResult, TTScheduleResult } from '../../types/scheduler';

interface Assignment {
  teacher: string;
  role: 'H' | 'K' | 'F';
  classId: string;
  round?: number;
  isExam?: boolean;
}



interface ScheduleResultTableProps {
  result: MWFScheduleResult | TTScheduleResult;
  title: string;
  schedulerType?: 'MWF' | 'TT';
  onExport?: () => void;
  onCellClick?: (day: string, period: number, assignment: Assignment | null) => void;
}

export const ScheduleResultTable: React.FC<ScheduleResultTableProps> = ({
  result,
  title,
  schedulerType = 'MWF',
  onExport,
  onCellClick
}) => {
  // const { t } = useTranslation();
  const [hoveredCell, setHoveredCell] = useState<{ day: string; period: number } | null>(null);

  const days = schedulerType === 'MWF' ? ['월', '수', '금'] : ['화', '목'];
  const periods = schedulerType === 'MWF' ? [1, 2, 3, 4, 5, 6, 7, 8] : [1, 2, 3, 4, 5, 6];

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

  const formatPeriodTime = (period: number, schedulerType: 'MWF' | 'TT') => {
    const timeMap: { [key: string]: { [key: number]: string } } = {
      MWF: {
        1: '09:00-09:50',
        2: '10:00-10:50',
        3: '11:00-11:50',
        4: '13:00-13:50',
        5: '14:00-14:50',
        6: '15:00-15:50',
        7: '16:00-16:50',
        8: '17:00-17:50'
      },
      TT: {
        1: '09:00-09:50',
        2: '10:00-10:50',
        3: '11:00-11:50',
        4: '17:50-18:10', // Word test time
        5: '14:00-14:50',
        6: '15:00-15:50'
      }
    };
    return timeMap[schedulerType]?.[period] || '';
  };

  const getCellTooltip = (assignment: Assignment | null, day: string, period: number) => {
    if (!assignment) {
      return `${day}요일 ${period}교시 (${formatPeriodTime(period, schedulerType)}) - 빈 슬롯`;
    }

    const roleLabel = getRoleLabel(assignment.role);
    const timeInfo = formatPeriodTime(period, schedulerType);
    const examInfo = assignment.isExam ? ' (단어시험)' : '';
    const roundInfo = assignment.round ? ` - R${assignment.round}` : '';

    return `${day}요일 ${period}교시 (${timeInfo})${examInfo}
교사: ${assignment.teacher}
역할: ${roleLabel}
클래스: ${assignment.classId}${roundInfo}`;
  };

  const countAssignmentsByRole = (role: 'H' | 'K' | 'F') => {
    let count = 0;
    Object.values(result).forEach(daySchedule => {
      Object.values(daySchedule).forEach(assignmentData => {
        if (Array.isArray(assignmentData)) {
          count += assignmentData.filter(assignment => assignment?.role === role).length;
        } else if (assignmentData && assignmentData.role === role) {
          count += 1;
        }
      });
    });
    return count;
  };

  const handleCellClick = (day: string, period: number, assignment: Assignment | null) => {
    if (onCellClick) {
      onCellClick(day, period, assignment);
    }
  };

  const handleCellHover = (day: string, period: number) => {
    setHoveredCell({ day, period });
  };

  const handleCellLeave = () => {
    setHoveredCell(null);
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-primary">{title}</h3>
        {onExport && (
          <button
            onClick={onExport}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          >
            {"내보내기"}
          </button>
        )}
      </div>

      {/* Role Legend */}
      <div className="flex gap-4 mb-6 p-3 bg-background rounded-md border border-border">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded"></div>
          <span className="text-sm text-primary">{"담임"}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-500 rounded"></div>
          <span className="text-sm text-primary">{"한국어"}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-purple-500 rounded"></div>
          <span className="text-sm text-primary">{"외국어"}</span>
        </div>
        {schedulerType === 'TT' && (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-orange-500 rounded"></div>
            <span className="text-sm text-primary">단어시험</span>
          </div>
        )}
      </div>

      {/* Schedule Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left p-3 text-primary font-medium bg-background sticky left-0 z-10 border-r border-border">
                {"교시"}
              </th>
              {days.map((day) => (
                <th key={day} className="text-center p-3 text-primary font-medium bg-background border-r border-border">
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {periods.map((period) => (
              <tr key={period} className="border-b border-border hover:bg-background/50">
                <td className="p-3 text-primary font-medium bg-background sticky left-0 z-10 border-r border-border">
                  <div>
                    <div className="font-semibold">{period}</div>
                    <div className="text-xs text-secondary">{formatPeriodTime(period, schedulerType)}</div>
                  </div>
                </td>
                {days.map((day) => {
                  const assignmentData = result[day]?.[period];
                  const isHovered = hoveredCell?.day === day && hoveredCell?.period === period;
                  
                  // Handle both single assignment and array of assignments
                  const assignments = Array.isArray(assignmentData) ? assignmentData : (assignmentData ? [assignmentData] : []);
                  
                  return (
                    <td 
                      key={`${day}-${period}`} 
                      className="p-2 text-center border-r border-border relative group"
                    >
                      {assignments.length > 0 ? (
                        <div className="space-y-1">
                          {assignments.map((assignment, idx) => (
                            <div 
                              key={idx}
                              className={`
                                p-1 rounded-md border text-xs cursor-pointer transition-all duration-200 hover:shadow-md
                                ${getRoleColor(assignment.role)}
                                ${assignment.isExam ? 'ring-2 ring-orange-400' : ''}
                                ${isHovered ? 'scale-105 shadow-lg' : ''}
                              `}
                              onClick={() => handleCellClick(day, period, assignment as any)}
                              onMouseEnter={() => handleCellHover(day, period)}
                              onMouseLeave={handleCellLeave}
                              title={getCellTooltip(assignment as any, day, period)}
                            >
                              <div className="font-medium truncate">{assignment.teacher}</div>
                              <div className="opacity-75 text-xs">{getRoleLabel(assignment.role)}</div>
                              <div className="text-xs opacity-60">{assignment.classId}</div>
                              {assignment.round && (
                                <div className="text-xs opacity-60">R{assignment.round}</div>
                              )}
                              {assignment.isExam && (
                                <div className="text-xs font-bold text-orange-600 dark:text-orange-400 mt-1">
                                  {"시험"}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div 
                          className="p-2 text-xs text-secondary bg-gray-50 dark:bg-gray-800 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          onClick={() => handleCellClick(day, period, null)}
                          onMouseEnter={() => handleCellHover(day, period)}
                          onMouseLeave={handleCellLeave}
                          title={getCellTooltip(null, day, period)}
                        >
                          {"빈 슬롯"}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary Stats */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-md border border-green-200 dark:border-green-800">
          <div className="text-sm text-green-600 dark:text-green-400 font-medium">
            {"담임 배정"}
          </div>
          <div className="text-lg font-bold text-green-700 dark:text-green-300">
            {countAssignmentsByRole('H')}
          </div>
        </div>
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-200 dark:border-blue-800">
          <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">
            {"한국어 배정"}
          </div>
          <div className="text-lg font-bold text-blue-700 dark:text-blue-300">
            {countAssignmentsByRole('K')}
          </div>
        </div>
        <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-md border border-purple-200 dark:border-purple-800">
          <div className="text-sm text-purple-600 dark:text-purple-400 font-medium">
            {"외국어 배정"}
          </div>
          <div className="text-lg font-bold text-purple-700 dark:text-purple-300">
            {countAssignmentsByRole('F')}
          </div>
        </div>
        <div className="p-3 bg-gray-50 dark:bg-gray-900/20 rounded-md border border-gray-200 dark:border-gray-800">
          <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">
            {"총 슬롯"}
          </div>
          <div className="text-lg font-bold text-gray-700 dark:text-gray-300">
            {days.length * periods.length}
          </div>
        </div>
      </div>

      {/* Scheduler Type Info */}
      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-200 dark:border-blue-800">
        <div className="text-sm text-blue-600 dark:text-blue-400">
          <strong>{schedulerType === 'MWF' ? '월수금' : '화목'} 스케줄러</strong> - 
          {schedulerType === 'MWF' ? ' 월, 수, 금요일 1-8교시' : ' 화, 목요일 1-6교시 (4교시는 단어시험)'}
        </div>
      </div>
    </div>
  );
};
