// src/components/TeacherMetrics.tsx
// Teacher metrics and charts using Chart.js

import React, { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Colors,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import type { ScheduleResult, TeacherMetrics } from '../types/scheduler';
import { DAYS } from '../types/scheduler';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Colors
);

interface TeacherMetricsProps {
  scheduleResult: ScheduleResult | null;
}

export const TeacherMetricsComponent: React.FC<TeacherMetricsProps> = ({ scheduleResult }) => {
  const [selectedTeacher, setSelectedTeacher] = useState<string | null>(null);
  const [teacherMetrics, setTeacherMetrics] = useState<Record<string, TeacherMetrics>>({});

  useEffect(() => {
    if (!scheduleResult) return;

    const metrics: Record<string, TeacherMetrics> = {};
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

    // Calculate metrics for each teacher
    allTeachers.forEach(teacher => {
      const teacherSchedule = scheduleResult.teacherSummary[teacher];
      if (!teacherSchedule) return;

      const metricsForTeacher: TeacherMetrics = {
        homerooms: 0,
        koreanSessions: 0,
        freeSlots: 0,
        byDay: {
          월: { homerooms: 0, koreanSessions: 0, freeSlots: 0 },
          수: { homerooms: 0, koreanSessions: 0, freeSlots: 0 },
          금: { homerooms: 0, koreanSessions: 0, freeSlots: 0 },
        },
      };

      DAYS.forEach(day => {
        const daySchedule = teacherSchedule[day] || [];
        const dayMetrics = metricsForTeacher.byDay[day];

        daySchedule.forEach(assignment => {
          if (assignment.role === 'H') {
            dayMetrics.homerooms++;
            metricsForTeacher.homerooms++;
          } else if (assignment.role === 'K') {
            dayMetrics.koreanSessions++;
            metricsForTeacher.koreanSessions++;
          }
        });

        // Calculate free slots (assuming 8 periods per day)
        const assignedPeriods = new Set(daySchedule.map(a => a.period));
        dayMetrics.freeSlots = 8 - assignedPeriods.size;
        metricsForTeacher.freeSlots += dayMetrics.freeSlots;
      });

      metrics[teacher] = metricsForTeacher;
    });

    setTeacherMetrics(metrics);
    if (!selectedTeacher && Object.keys(metrics).length > 0) {
      setSelectedTeacher(Object.keys(metrics)[0]);
    }
  }, [scheduleResult]);

  if (!scheduleResult || Object.keys(teacherMetrics).length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <p className="text-gray-500 text-center">스케줄 데이터가 없습니다.</p>
      </div>
    );
  }

  const chartData = {
    labels: DAYS,
    datasets: [
      {
        label: '홈룸',
        data: DAYS.map(day => selectedTeacher ? teacherMetrics[selectedTeacher]?.byDay[day].homerooms || 0 : 0),
        backgroundColor: 'rgba(54, 162, 235, 0.8)',
      },
      {
        label: '한국어 수업',
        data: DAYS.map(day => selectedTeacher ? teacherMetrics[selectedTeacher]?.byDay[day].koreanSessions || 0 : 0),
        backgroundColor: 'rgba(255, 99, 132, 0.8)',
      },
      {
        label: '자유 시간',
        data: DAYS.map(day => selectedTeacher ? teacherMetrics[selectedTeacher]?.byDay[day].freeSlots || 0 : 0),
        backgroundColor: 'rgba(75, 192, 192, 0.8)',
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: `교사별 주간 활동 현황${selectedTeacher ? ` - ${selectedTeacher}` : ''}`,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
        },
      },
    },
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-6">교사별 메트릭 및 차트</h2>

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
          {Object.keys(teacherMetrics).map((teacher) => (
            <option key={teacher} value={teacher}>
              {teacher}
            </option>
          ))}
        </select>
      </div>

      {/* Summary cards */}
      {selectedTeacher && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-blue-800">총 홈룸</h3>
            <p className="text-2xl font-bold text-blue-600">
              {teacherMetrics[selectedTeacher]?.homerooms || 0}
            </p>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-red-800">총 한국어 수업</h3>
            <p className="text-2xl font-bold text-red-600">
              {teacherMetrics[selectedTeacher]?.koreanSessions || 0}
            </p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-green-800">총 자유 시간</h3>
            <p className="text-2xl font-bold text-green-600">
              {teacherMetrics[selectedTeacher]?.freeSlots || 0}
            </p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-800">총 활동</h3>
            <p className="text-2xl font-bold text-gray-600">
              {(teacherMetrics[selectedTeacher]?.homerooms || 0) + 
               (teacherMetrics[selectedTeacher]?.koreanSessions || 0)}
            </p>
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="mb-6">
        <Bar data={chartData} options={chartOptions} />
      </div>

      {/* Detailed table */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">교사별 상세 현황</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-300 px-4 py-2 text-left">교사</th>
                <th className="border border-gray-300 px-4 py-2 text-center">홈룸</th>
                <th className="border border-gray-300 px-4 py-2 text-center">한국어</th>
                <th className="border border-gray-300 px-4 py-2 text-center">자유시간</th>
                <th className="border border-gray-300 px-4 py-2 text-center">월</th>
                <th className="border border-gray-300 px-4 py-2 text-center">수</th>
                <th className="border border-gray-300 px-4 py-2 text-center">금</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(teacherMetrics).map(([teacher, metrics]) => (
                <tr
                  key={teacher}
                  className={`hover:bg-gray-50 cursor-pointer ${
                    selectedTeacher === teacher ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => setSelectedTeacher(teacher)}
                >
                  <td className="border border-gray-300 px-4 py-2 font-medium">{teacher}</td>
                  <td className="border border-gray-300 px-4 py-2 text-center">{metrics.homerooms}</td>
                  <td className="border border-gray-300 px-4 py-2 text-center">{metrics.koreanSessions}</td>
                  <td className="border border-gray-300 px-4 py-2 text-center">{metrics.freeSlots}</td>
                  {DAYS.map((day) => (
                    <td key={day} className="border border-gray-300 px-4 py-2 text-center text-sm">
                      H:{metrics.byDay[day].homerooms} K:{metrics.byDay[day].koreanSessions} F:{metrics.byDay[day].freeSlots}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
