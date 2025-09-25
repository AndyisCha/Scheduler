// src/utils/export.ts
// Export utilities for CSV and JSON

import type { ScheduleResult, Day } from '../types/scheduler';
import { DAYS } from '../types/scheduler';

export interface ExportOptions {
  includeExams?: boolean;
  includeUnassigned?: boolean;
  format: 'csv' | 'json';
  classNames?: Record<string, string>; // 클래스 ID -> 반이름 매핑
}

export function exportScheduleToCSV(scheduleResult: ScheduleResult | Partial<ScheduleResult>, options: ExportOptions = { format: 'csv' }): string {
  const { includeExams = true, includeUnassigned = true, classNames = {} } = options;
  
  const rows: string[] = [];
  
  // Header
  rows.push('Class,ClassName,Day,Period,Time,Role,Teacher,Round');
  
  // Class view data
  Object.entries(scheduleResult.classSummary || {}).forEach(([classId, classSchedule]) => {
    DAYS.forEach(day => {
      const daySchedule = classSchedule[day] || [];
      daySchedule.forEach(assignment => {
        if (!includeExams && assignment.role === 'EXAM') return;
        if (!includeUnassigned && assignment.teacher === '(미배정)') return;
        
        rows.push([
          classId,
          classNames[classId] || classId, // 반이름 또는 기본 클래스 ID
          day,
          assignment.period,
          assignment.time,
          assignment.role,
          assignment.teacher,
          assignment.round
        ].map(field => `"${field}"`).join(','));
      });
    });
  });
  
  return rows.join('\n');
}

export function exportScheduleToJSON(scheduleResult: ScheduleResult | Partial<ScheduleResult>, options: ExportOptions = { format: 'json' }): string {
  const { includeExams = true, includeUnassigned = true, classNames = {} } = options;
  
  const filteredResult: any = {
    classSummary: {},
    teacherSummary: {},
    dayGrid: {},
    warnings: scheduleResult.warnings,
    classNames: classNames // 반이름 매핑 추가
  };
  
  // Filter class summary
  Object.entries(scheduleResult.classSummary || {}).forEach(([classId, classSchedule]) => {
    if (!filteredResult.classSummary) filteredResult.classSummary = {};
    filteredResult.classSummary[classId] = {} as Record<Day, any[]>;
    DAYS.forEach(day => {
      const daySchedule = (classSchedule[day] || []).filter(assignment => {
        if (!includeExams && assignment.role === 'EXAM') return false;
        if (!includeUnassigned && assignment.teacher === '(미배정)') return false;
        return true;
      });
      if (daySchedule.length > 0) {
        filteredResult.classSummary![classId][day] = daySchedule;
      }
    });
  });
  
  // Filter teacher summary
  Object.entries(scheduleResult.teacherSummary || {}).forEach(([teacher, teacherSchedule]) => {
    if (!filteredResult.teacherSummary) filteredResult.teacherSummary = {};
    filteredResult.teacherSummary[teacher] = {} as Record<Day, any[]>;
    DAYS.forEach(day => {
      const daySchedule = (teacherSchedule[day] || []).filter(assignment => {
        if (!includeExams && assignment.role === 'EXAM') return false;
        return true;
      });
      if (daySchedule.length > 0) {
        filteredResult.teacherSummary![teacher][day] = daySchedule;
      }
    });
  });
  
  // Filter day grid
  DAYS.forEach(day => {
    if (!filteredResult.dayGrid) filteredResult.dayGrid = {};
    filteredResult.dayGrid[day] = {} as Record<any, any[]>;
    for (let period = 1; period <= 8; period++) {
      const periodSchedule = ((scheduleResult.dayGrid?.[day] as any)?.[period] || []).filter((assignment: any) => {
        if (!includeExams && assignment.role === 'EXAM') return false;
        if (!includeUnassigned && assignment.teacher === '(미배정)') return false;
        return true;
      });
      if (periodSchedule.length > 0) {
        filteredResult.dayGrid![day][period as any] = periodSchedule;
      }
    }
  });
  
  return JSON.stringify(filteredResult, null, 2);
}

export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

export function exportClassView(scheduleResult: ScheduleResult, format: 'csv' | 'json', classNames?: Record<string, string>): void {
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  const filename = `class-schedule-${timestamp}.${format}`;
  
  let content: string;
  let mimeType: string;
  
  if (format === 'csv') {
    content = exportScheduleToCSV(scheduleResult, { format, classNames });
    mimeType = 'text/csv';
  } else {
    content = exportScheduleToJSON(scheduleResult, { format, classNames });
    mimeType = 'application/json';
  }
  
  downloadFile(content, filename, mimeType);
}

export function exportTeacherView(scheduleResult: ScheduleResult, format: 'csv' | 'json'): void {
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  const filename = `teacher-schedule-${timestamp}.${format}`;
  
  // Convert teacher view to class-like format for CSV
  const teacherViewData: any = {
    classSummary: {},
    teacherSummary: scheduleResult.teacherSummary,
    dayGrid: {},
    warnings: scheduleResult.warnings
  };
  
  // Transform teacher data to class-like format
  Object.entries(scheduleResult.teacherSummary || {}).forEach(([teacher, teacherSchedule]) => {
    if (!teacherViewData.classSummary) teacherViewData.classSummary = {};
    teacherViewData.classSummary[teacher] = {} as Record<Day, any[]>;
    DAYS.forEach(day => {
      teacherViewData.classSummary![teacher][day] = teacherSchedule[day] || [];
    });
  });
  
  let content: string;
  let mimeType: string;
  
  if (format === 'csv') {
    content = exportScheduleToCSV(teacherViewData, { format });
    mimeType = 'text/csv';
  } else {
    content = exportScheduleToJSON(teacherViewData, { format });
    mimeType = 'application/json';
  }
  
  downloadFile(content, filename, mimeType);
}

export function printSchedule(scheduleResult: ScheduleResult, view: 'class' | 'teacher' | 'day', classNames?: Record<string, string>): void {
  // Create a print-friendly version
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;
  
  const printContent = generatePrintContent(scheduleResult, view, classNames);
  
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>스케줄 출력 - ${view} 뷰</title>
      <link rel="stylesheet" href="/src/styles/print.css">
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .print-container { max-width: 100%; }
        .print-header { text-align: center; margin-bottom: 20px; }
        .print-section { margin-bottom: 25px; }
        .print-table { width: 100%; border-collapse: collapse; }
        .print-table th, .print-table td { border: 1px solid #000; padding: 4px; }
        .print-table th { background-color: #f0f0f0; }
        .print-assignment { margin: 2px 0; padding: 2px; }
        .print-assignment.unassigned { background-color: #ffebee; }
        .print-assignment.exam { background-color: #e8f5e8; }
        .print-warnings { background-color: #fff3cd; padding: 10px; margin-bottom: 15px; }
      </style>
    </head>
    <body>
      ${printContent}
    </body>
    </html>
  `);
  
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 100);
}

function generatePrintContent(scheduleResult: ScheduleResult, view: 'class' | 'teacher' | 'day', classNames?: Record<string, string>): string {
  const timestamp = new Date().toLocaleDateString('ko-KR');
  
  let content = `
    <div class="print-container">
      <div class="print-header">
        <h1 class="print-title">주간 스케줄</h1>
        <p class="print-subtitle">생성일: ${timestamp} | 뷰: ${view === 'class' ? '클래스별' : view === 'teacher' ? '교사별' : '요일별'}</p>
      </div>
  `;
  
  // Warnings
  if (scheduleResult.warnings.length > 0) {
    content += `
      <div class="print-warnings">
        <h3>경고사항</h3>
        <ul>
          ${scheduleResult.warnings.map(warning => `<li>${warning}</li>`).join('')}
        </ul>
      </div>
    `;
  }
  
  if (view === 'class') {
    content += generateClassPrintContent(scheduleResult, classNames);
  } else if (view === 'teacher') {
    content += generateTeacherPrintContent(scheduleResult, classNames);
  } else {
    content += generateDayPrintContent(scheduleResult, classNames);
  }
  
  content += '</div>';
  return content;
}

function generateClassPrintContent(scheduleResult: ScheduleResult, classNames?: Record<string, string>): string {
  const classes = Object.keys(scheduleResult.classSummary).sort();
  
  let content = '';
  classes.forEach(classId => {
    content += `
      <div class="print-section page-break-inside-avoid">
        <h2 class="print-section-title">${classNames?.[classId] || classId}</h2>
        <table class="print-table">
          <thead>
            <tr>
              <th>요일</th>
              <th>교시</th>
              <th>시간</th>
              <th>역할</th>
              <th>교사</th>
              <th>라운드</th>
            </tr>
          </thead>
          <tbody>
    `;
    
    DAYS.forEach(day => {
      const daySchedule = scheduleResult.classSummary[classId][day] || [];
      daySchedule.sort((a, b) => a.period - b.period).forEach(assignment => {
        const roleClass = assignment.teacher === '(미배정)' ? 'unassigned' : 
                         assignment.role === 'EXAM' ? 'exam' : 'normal';
        content += `
          <tr>
            <td>${day}</td>
            <td class="center">${assignment.period}</td>
            <td>${assignment.time}</td>
            <td class="center">${assignment.role === 'EXAM' ? '시험' : assignment.role}</td>
            <td class="print-assignment ${roleClass}">${assignment.teacher}</td>
            <td class="center">${assignment.round}</td>
          </tr>
        `;
      });
    });
    
    content += `
          </tbody>
        </table>
      </div>
    `;
  });
  
  return content;
}

function generateTeacherPrintContent(scheduleResult: ScheduleResult, classNames?: Record<string, string>): string {
  const teachers = Object.keys(scheduleResult.teacherSummary).sort();
  
  let content = '';
  teachers.forEach(teacher => {
    content += `
      <div class="print-section page-break-inside-avoid">
        <h2 class="print-section-title">${teacher}</h2>
        <table class="print-table">
          <thead>
            <tr>
              <th>요일</th>
              <th>교시</th>
              <th>시간</th>
              <th>클래스</th>
              <th>역할</th>
              <th>라운드</th>
            </tr>
          </thead>
          <tbody>
    `;
    
    DAYS.forEach(day => {
      const daySchedule = scheduleResult.teacherSummary[teacher][day] || [];
      daySchedule.sort((a, b) => a.period - b.period).forEach(assignment => {
        const roleClass = assignment.role === 'EXAM' ? 'exam' : 'normal';
        content += `
          <tr>
            <td>${day}</td>
            <td class="center">${assignment.period}</td>
            <td>${assignment.time}</td>
            <td>${classNames?.[assignment.classId] || assignment.classId}</td>
            <td class="center print-assignment ${roleClass}">${assignment.role === 'EXAM' ? '시험' : assignment.role}</td>
            <td class="center">${assignment.round}</td>
          </tr>
        `;
      });
    });
    
    content += `
          </tbody>
        </table>
      </div>
    `;
  });
  
  return content;
}

function generateDayPrintContent(scheduleResult: ScheduleResult, classNames?: Record<string, string>): string {
  let content = '';
  
  DAYS.forEach(day => {
    content += `
      <div class="print-section page-break-inside-avoid">
        <h2 class="print-section-title">${day}</h2>
        <table class="print-table">
          <thead>
            <tr>
              <th>교시</th>
              <th>시간</th>
              <th>클래스</th>
              <th>역할</th>
              <th>교사</th>
              <th>라운드</th>
            </tr>
          </thead>
          <tbody>
    `;
    
    for (let period = 1; period <= 8; period++) {
      const periodSchedule = (scheduleResult.dayGrid?.[day] as any)?.[period] || [];
      periodSchedule.forEach((assignment: any) => {
        const roleClass = assignment.teacher === '(미배정)' ? 'unassigned' : 
                         assignment.role === 'EXAM' ? 'exam' : 'normal';
        content += `
          <tr>
            <td class="center">${period}</td>
            <td>${assignment.time}</td>
            <td>${classNames?.[assignment.classId] || assignment.classId}</td>
            <td class="center">${assignment.role === 'EXAM' ? '시험' : assignment.role}</td>
            <td class="print-assignment ${roleClass}">${assignment.teacher}</td>
            <td class="center">${assignment.round}</td>
          </tr>
        `;
      });
    }
    
    content += `
          </tbody>
        </table>
      </div>
    `;
  });
  
  return content;
}
