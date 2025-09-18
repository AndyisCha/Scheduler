// src/components/TeacherHeatmap.tsx
// Teacher availability heatmap

import React, { useState, useEffect } from 'react';
import type { ScheduleResult, Day, Period } from '../types/scheduler';
import { DAYS } from '../types/scheduler';

interface TeacherHeatmapProps {
  scheduleResult: ScheduleResult | null;
}

export const TeacherHeatmap: React.FC<TeacherHeatmapProps> = ({ scheduleResult }) => {
  const [selectedTeacher, setSelectedTeacher] = useState<string | null>(null);
  const [teacherAvailability, setTeacherAvailability] = useState<Record<string, Record<Day, Record<Period, boolean>>>>({});

  useEffect(() => {
    if (!scheduleResult) return;

    const availability: Record<string, Record<Day, Record<Period, boolean>>> = {};
    const allTeachers = new Set<string>();

    // Collect all teachers from the schedule
    Object.values(scheduleResult.teacherSummary).forEach(teacherSchedule => {
      Object.values(teacherSchedule).forEach(daySchedule => {
        daySchedule.forEach(assignment => {
          if (assignment.teacher !== '(미배정)') {
            allTeachers.add(assignment.teacher);
          }
        });
      });
    });

    // Initialize availability for all teachers
    allTeachers.forEach(teacher => {
      availability[teacher] = {
        월: { 1: false, 2: false, 3: false, 4: false, 5: false, 6: false, 7: false, 8: false },
        수: { 1: false, 2: false, 3: false, 4: false, 5: false, 6: false, 7: false, 8: false },
        금: { 1: false, 2: false, 3: false, 4: false, 5: false, 6: false, 7: false, 8: false },
      };
    });

    // Mark busy periods
    Object.values(scheduleResult.teacherSummary).forEach(teacherSchedule => {
      Object.entries(teacherSchedule).forEach(([day, daySchedule]) => {
        daySchedule.forEach(assignment => {
          if (assignment.teacher !== '(미배정)') {
            availability[assignment.teacher][day as Day][assignment.period] = true;
          }
        });
      });
    });

    setTeacherAvailability(availability);
    if (!selectedTeacher && Object.keys(availability).length > 0) {
      setSelectedTeacher(Object.keys(availability)[0]);
    }
  }, [scheduleResult]);

  if (!scheduleResult || Object.keys(teacherAvailability).length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <p className="text-gray-500 text-center">스케줄 데이터가 없습니다.</p>
      </div>
    );
  }

  const getHeatmapColor = (isBusy: boolean, intensity: number) => {
    if (!isBusy) return 'bg-gray-100'; // Free
    if (intensity === 1) return 'bg-blue-300'; // Light busy
    if (intensity === 2) return 'bg-blue-500'; // Medium busy
    return 'bg-blue-700'; // Very busy
  };

  const getBusyIntensity = (teacher: string, day: Day, period: Period) => {
    const daySchedule = scheduleResult?.teacherSummary[teacher]?.[day] || [];
    const periodAssignments = daySchedule.filter(a => a.period === period);
    return periodAssignments.length;
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-6">교사 활동 히트맵</h2>

      {/* Teacher selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          교사 선택
        </label>
        <select
          value={selectedTeacher || ''}
          onChange={(e) => setSelectedTeacher(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {Object.keys(teacherAvailability).map((teacher) => (
            <option key={teacher} value={teacher}>
              {teacher}
            </option>
          ))}
        </select>
      </div>

      {/* Heatmap */}
      {selectedTeacher && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            {selectedTeacher} 교사 활동 히트맵
          </h3>
          
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr>
                  <th className="border border-gray-300 px-2 py-2 text-center font-medium">요일</th>
                  {([1, 2, 3, 4, 5, 6, 7, 8] as Period[]).map((period) => (
                    <th key={period} className="border border-gray-300 px-2 py-2 text-center font-medium text-sm">
                      {period}교시
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DAYS.map((day) => (
                  <tr key={day}>
                    <td className="border border-gray-300 px-4 py-2 font-medium text-center">{day}</td>
                    {([1, 2, 3, 4, 5, 6, 7, 8] as Period[]).map((period) => {
                      const isBusy = teacherAvailability[selectedTeacher]?.[day]?.[period] || false;
                      const intensity = getBusyIntensity(selectedTeacher, day, period);
                      const colorClass = getHeatmapColor(isBusy, intensity);
                      
                      return (
                        <td
                          key={period}
                          className={`border border-gray-300 px-2 py-2 text-center text-xs ${colorClass} ${
                            isBusy ? 'text-white' : 'text-gray-600'
                          }`}
                          title={`${day} ${period}교시 - ${isBusy ? `${intensity}개 활동` : '자유시간'}`}
                        >
                          {isBusy ? intensity : ''}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Legend */}
          <div className="mt-4 flex items-center justify-center space-x-4 text-sm">
            <div className="flex items-center space-x-1">
              <div className="w-4 h-4 bg-gray-100 border border-gray-300"></div>
              <span>자유시간</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-4 h-4 bg-blue-300"></div>
              <span>1개 활동</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-4 h-4 bg-blue-500"></div>
              <span>2개 활동</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-4 h-4 bg-blue-700"></div>
              <span>3개 이상</span>
            </div>
          </div>
        </div>
      )}

      {/* Summary statistics */}
      {selectedTeacher && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700 mb-2">총 활동 시간</h4>
            <p className="text-xl font-bold text-gray-800">
              {DAYS.reduce((total, day) => {
                const daySchedule = scheduleResult?.teacherSummary[selectedTeacher]?.[day] || [];
                return total + daySchedule.length;
              }, 0)}교시
            </p>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-blue-700 mb-2">가장 바쁜 요일</h4>
            <p className="text-xl font-bold text-blue-800">
              {DAYS.reduce((busiest, day) => {
                const currentBusy = (scheduleResult?.teacherSummary[selectedTeacher]?.[day] || []).length;
                const busiestBusy = (scheduleResult?.teacherSummary[selectedTeacher]?.[busiest] || []).length;
                return currentBusy > busiestBusy ? day : busiest;
              }, DAYS[0])}
            </p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-green-700 mb-2">자유시간 비율</h4>
            <p className="text-xl font-bold text-green-800">
              {Math.round(
                (DAYS.reduce((total, day) => {
                  const daySchedule = scheduleResult?.teacherSummary[selectedTeacher]?.[day] || [];
                  return total + (8 - daySchedule.length);
                }, 0) / (DAYS.length * 8)) * 100
              )}%
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
