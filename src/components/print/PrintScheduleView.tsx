import React from 'react';
import { AccessibleTable, AccessibleTableHeader, AccessibleTableCell, AccessibleTableRow } from '../a11y/AccessibleTable';
import type { MWFScheduleResult, TTScheduleResult } from '../../engine/types';

interface PrintScheduleViewProps {
  mwfResult?: MWFScheduleResult;
  ttResult?: TTScheduleResult;
  slotName?: string;
  generatedAt?: string;
  className?: string;
}

export const PrintScheduleView: React.FC<PrintScheduleViewProps> = ({
  mwfResult,
  ttResult,
  slotName,
  generatedAt,
  className = '',
}) => {
  // const formatTime = (time: string) => {
  //   return time || '미배정';
  // };

  const formatAssignment = (assignment: any) => {
    if (!assignment) return '미배정';
    
    const parts = [];
    if (assignment.teacher) parts.push(assignment.teacher);
    if (assignment.role) {
      const roleMap = { 'H': '담임', 'K': '한국어', 'F': '외국어' };
      parts.push(`(${roleMap[assignment.role as keyof typeof roleMap] || assignment.role})`);
    }
    if (assignment.classId) parts.push(`[${assignment.classId}]`);
    
    return parts.join(' ');
  };

  const renderMWFTable = () => {
    if (!mwfResult) return null;

    const days = ['월', '수', '금'] as const;
    const periods = [1, 2, 3, 4, 5, 6, 7, 8];

    return (
      <div className="print-section page-break-inside-avoid">
        <h2 className="print-title">MWF 스케줄 ({slotName})</h2>
        {generatedAt && (
          <p className="print-subtitle">생성일시: {new Date(generatedAt).toLocaleString('ko-KR')}</p>
        )}

        <AccessibleTable
          caption="월수금 스케줄표"
          aria-label="월수금 스케줄"
          className="print-table"
        >
          <thead>
            <AccessibleTableRow>
              <AccessibleTableHeader scope="col" className="print-center">교시</AccessibleTableHeader>
              {days.map(day => (
                <AccessibleTableHeader key={day} scope="col" className="print-center">
                  {day}요일
                </AccessibleTableHeader>
              ))}
            </AccessibleTableRow>
          </thead>
          <tbody>
            {periods.map(period => (
              <AccessibleTableRow key={period}>
                <AccessibleTableHeader scope="row" className="period-header">
                  {period}교시
                </AccessibleTableHeader>
                {days.map(day => (
                  <AccessibleTableCell key={day} className="assignment-cell">
                    {formatAssignment(mwfResult[day]?.[period as keyof typeof mwfResult[typeof day]])}
                  </AccessibleTableCell>
                ))}
              </AccessibleTableRow>
            ))}
          </tbody>
        </AccessibleTable>
      </div>
    );
  };

  const renderTTTable = () => {
    if (!ttResult) return null;

    const days = ['화', '목'] as const;
    const periods = [1, 2, 3, 4, 5, 6];

    return (
      <div className="print-section page-break-inside-avoid">
        <h2 className="print-title">TT 스케줄 ({slotName})</h2>
        {generatedAt && (
          <p className="print-subtitle">생성일시: {new Date(generatedAt).toLocaleString('ko-KR')}</p>
        )}

        <AccessibleTable
          caption="화목 스케줄표"
          aria-label="화목 스케줄"
          className="print-table"
        >
          <thead>
            <AccessibleTableRow>
              <AccessibleTableHeader scope="col" className="print-center">교시</AccessibleTableHeader>
              {days.map(day => (
                <AccessibleTableHeader key={day} scope="col" className="print-center">
                  {day}요일
                </AccessibleTableHeader>
              ))}
            </AccessibleTableRow>
          </thead>
          <tbody>
            {periods.map(period => (
              <AccessibleTableRow key={period}>
                <AccessibleTableHeader scope="row" className="period-header">
                  {period}교시
                </AccessibleTableHeader>
                {days.map(day => (
                  <AccessibleTableCell key={day} className="assignment-cell">
                    {formatAssignment(ttResult[day]?.[period as keyof typeof ttResult[typeof day]])}
                  </AccessibleTableCell>
                ))}
              </AccessibleTableRow>
            ))}
          </tbody>
        </AccessibleTable>

        {/* TT Exam Information */}
        {days.some(day => ttResult[day]?.exam && ttResult[day]?.exam.length > 0) && (
          <div className="print-section page-break-inside-avoid">
            <h3>단어시험 정보</h3>
            <AccessibleTable
              caption="단어시험 스케줄"
              aria-label="단어시험 정보"
              className="print-table"
            >
              <thead>
                <AccessibleTableRow>
                  <AccessibleTableHeader scope="col">요일</AccessibleTableHeader>
                  <AccessibleTableHeader scope="col">시간</AccessibleTableHeader>
                  <AccessibleTableHeader scope="col">감독교사</AccessibleTableHeader>
                  <AccessibleTableHeader scope="col">반</AccessibleTableHeader>
                </AccessibleTableRow>
              </thead>
              <tbody>
                {days.map(day => 
                  ttResult[day]?.exam?.map((exam, index) => (
                    <AccessibleTableRow key={`${day}-${index}`}>
                      <AccessibleTableCell>{day}요일</AccessibleTableCell>
                      <AccessibleTableCell>{exam.time}</AccessibleTableCell>
                      <AccessibleTableCell>{exam.teacher}</AccessibleTableCell>
                      <AccessibleTableCell>{exam.classId}</AccessibleTableCell>
                    </AccessibleTableRow>
                  ))
                )}
              </tbody>
            </AccessibleTable>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`print-schedule-view ${className}`}>
      <div className="print-only">
        <h1 className="print-title">스케줄 리포트</h1>
        <div className="print-subtitle">
          {slotName && `슬롯: ${slotName}`}
        </div>
        <div className="print-subtitle">
          생성일시: {generatedAt ? new Date(generatedAt).toLocaleString('ko-KR') : new Date().toLocaleString('ko-KR')}
        </div>
      </div>

      {mwfResult && renderMWFTable()}
      {ttResult && renderTTTable()}

      {/* Print Instructions */}
      <div className="print-only print-section">
        <div className="print-card">
          <div className="print-card-header">인쇄 안내</div>
          <div className="print-card-content">
            <ul className="print-list">
              <li>이 문서는 A4 용지에 최적화되어 있습니다.</li>
              <li>인쇄 시 "배경 그래픽" 옵션을 활성화하세요.</li>
              <li>페이지 여백은 0.75인치로 설정되어 있습니다.</li>
              <li>표의 내용이 잘리지 않도록 확인하세요.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
