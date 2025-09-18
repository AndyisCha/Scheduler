import React, { useState } from 'react';
import { AccessibleTable, AccessibleTableHeader, AccessibleTableCell, AccessibleTableRow } from './a11y/AccessibleTable';
import { AccessibleButton } from './a11y/AccessibleButton';
import type { ComparisonResult, ScheduleDiff } from '../services/scheduleHistoryService';

interface DiffViewerProps {
  comparison: ComparisonResult;
  onClose?: () => void;
  onExportCSV?: () => void;
  onExportICS?: () => void;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({
  comparison,
  onClose,
  onExportCSV,
  onExportICS,
}) => {
  const [filter, setFilter] = useState<'all' | 'added' | 'removed' | 'modified'>('all');
  const [groupBy, setGroupBy] = useState<'day' | 'teacher' | 'class'>('day');

  const filteredDifferences = comparison.differences.filter(diff => 
    filter === 'all' || diff.type === filter
  );

  const getDiffTypeColor = (type: string) => {
    switch (type) {
      case 'added':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'removed':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'modified':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'unchanged':
        return 'bg-gray-100 text-gray-600 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const getDiffTypeIcon = (type: string) => {
    switch (type) {
      case 'added':
        return '➕';
      case 'removed':
        return '➖';
      case 'modified':
        return '🔄';
      case 'unchanged':
        return '✓';
      default:
        return '•';
    }
  };

  const formatAssignment = (assignment: any) => {
    if (!assignment) return '미배정';
    
    const parts = [];
    if (assignment.teacher) parts.push(assignment.teacher);
    if (assignment.role) {
      const roleMap = { 'H': '담임', 'K': '한국어', 'F': '외국어', 'EXAM': '감독' };
      parts.push(`(${roleMap[assignment.role as keyof typeof roleMap] || assignment.role})`);
    }
    if (assignment.classId) parts.push(`[${assignment.classId}]`);
    if (assignment.time) parts.push(assignment.time);
    
    return parts.join(' ');
  };

  const groupedDifferences = filteredDifferences.reduce((groups, diff) => {
    const key = groupBy === 'day' ? diff.day :
                groupBy === 'teacher' ? diff.teacher :
                groupBy === 'class' ? diff.classId : 'other';
    
    const groupKey = key || 'unknown';
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(diff);
    return groups;
  }, {} as Record<string, ScheduleDiff[]>);

  return (
    <div className="bg-white rounded-lg shadow-lg max-w-7xl mx-auto">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">스케줄 비교 결과</h2>
            <div className="mt-2 text-sm text-gray-600">
              <p>
                <strong>{comparison.snapshot1.name}</strong> vs <strong>{comparison.snapshot2.name}</strong>
              </p>
              <p className="mt-1">
                {comparison.snapshot1.slotName} ({comparison.snapshot1.scheduleType}) • 
                생성일: {new Date(comparison.snapshot1.createdAt).toLocaleDateString('ko-KR')} vs 
                {new Date(comparison.snapshot2.createdAt).toLocaleDateString('ko-KR')}
              </p>
            </div>
          </div>
          
          <div className="flex space-x-3">
            {onExportCSV && (
              <AccessibleButton
                variant="secondary"
                size="sm"
                onClick={onExportCSV}
                aria-label="CSV로 내보내기"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                CSV 내보내기
              </AccessibleButton>
            )}
            
            {onExportICS && (
              <AccessibleButton
                variant="secondary"
                size="sm"
                onClick={onExportICS}
                aria-label="ICS로 내보내기"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                ICS 내보내기
              </AccessibleButton>
            )}
            
            {onClose && (
              <AccessibleButton
                variant="secondary"
                size="sm"
                onClick={onClose}
                aria-label="닫기"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </AccessibleButton>
            )}
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{comparison.summary.totalChanges}</div>
            <div className="text-sm text-gray-600">총 변경사항</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{comparison.summary.added}</div>
            <div className="text-sm text-gray-600">추가됨</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{comparison.summary.removed}</div>
            <div className="text-sm text-gray-600">삭제됨</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{comparison.summary.modified}</div>
            <div className="text-sm text-gray-600">변경됨</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-600">{comparison.summary.unchanged}</div>
            <div className="text-sm text-gray-600">변경없음</div>
          </div>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex flex-wrap gap-4 items-center">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">필터</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">모든 변경사항</option>
              <option value="added">추가된 항목</option>
              <option value="removed">삭제된 항목</option>
              <option value="modified">변경된 항목</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">그룹화</label>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as any)}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="day">요일별</option>
              <option value="teacher">교사별</option>
              <option value="class">반별</option>
            </select>
          </div>
          
          <div className="ml-auto text-sm text-gray-600">
            {filteredDifferences.length}개 항목 표시 중
          </div>
        </div>
      </div>

      {/* Diff Content */}
      <div className="px-6 py-4">
        {Object.keys(groupedDifferences).length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-500 text-lg">선택한 필터에 해당하는 변경사항이 없습니다.</div>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedDifferences).map(([groupKey, diffs]) => (
              <div key={groupKey}>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  {groupBy === 'day' ? `${groupKey}요일` :
                   groupBy === 'teacher' ? `교사: ${groupKey}` :
                   groupBy === 'class' ? `반: ${groupKey}` : groupKey}
                </h3>
                
                <AccessibleTable
                  caption={`${groupKey} 변경사항`}
                  aria-label={`${groupKey} 변경사항`}
                  className="w-full"
                >
                  <thead>
                    <AccessibleTableRow>
                      <AccessibleTableHeader scope="col" className="w-12">구분</AccessibleTableHeader>
                      <AccessibleTableHeader scope="col" className="w-16">교시</AccessibleTableHeader>
                      <AccessibleTableHeader scope="col">이전</AccessibleTableHeader>
                      <AccessibleTableHeader scope="col">이후</AccessibleTableHeader>
                      <AccessibleTableHeader scope="col">상세</AccessibleTableHeader>
                    </AccessibleTableRow>
                  </thead>
                  <tbody>
                    {diffs.map((diff, index) => (
                      <AccessibleTableRow key={index}>
                        <AccessibleTableCell className="text-center">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getDiffTypeColor(diff.type)}`}>
                            <span className="mr-1">{getDiffTypeIcon(diff.type)}</span>
                            {diff.type === 'added' ? '추가' :
                             diff.type === 'removed' ? '삭제' :
                             diff.type === 'modified' ? '변경' : '동일'}
                          </span>
                        </AccessibleTableCell>
                        
                        <AccessibleTableCell className="text-center font-medium">
                          {diff.period}교시
                        </AccessibleTableCell>
                        
                        <AccessibleTableCell className="max-w-xs">
                          <div className="text-sm">
                            {diff.oldValue ? formatAssignment(diff.oldValue) : '미배정'}
                          </div>
                        </AccessibleTableCell>
                        
                        <AccessibleTableCell className="max-w-xs">
                          <div className="text-sm">
                            {diff.newValue ? formatAssignment(diff.newValue) : '미배정'}
                          </div>
                        </AccessibleTableCell>
                        
                        <AccessibleTableCell className="max-w-md">
                          <div className="text-sm text-gray-600">
                            {diff.details || '변경사항 없음'}
                          </div>
                        </AccessibleTableCell>
                      </AccessibleTableRow>
                    ))}
                  </tbody>
                </AccessibleTable>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Metrics Comparison */}
      <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">성능 메트릭 비교</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">{comparison.snapshot1.name}</h4>
            <div className="space-y-1 text-sm">
              <div>생성 시간: {comparison.snapshot1.metrics.generationTimeMs}ms</div>
              <div>배정률: {Math.round((comparison.snapshot1.metrics.assignedCount / comparison.snapshot1.metrics.totalAssignments) * 100)}%</div>
              <div>경고 수: {comparison.snapshot1.metrics.warningsCount}</div>
              <div>교사 수: {comparison.snapshot1.metrics.teachersCount}</div>
              <div>반 수: {comparison.snapshot1.metrics.classesCount}</div>
            </div>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-900 mb-2">{comparison.snapshot2.name}</h4>
            <div className="space-y-1 text-sm">
              <div>생성 시간: {comparison.snapshot2.metrics.generationTimeMs}ms</div>
              <div>배정률: {Math.round((comparison.snapshot2.metrics.assignedCount / comparison.snapshot2.metrics.totalAssignments) * 100)}%</div>
              <div>경고 수: {comparison.snapshot2.metrics.warningsCount}</div>
              <div>교사 수: {comparison.snapshot2.metrics.teachersCount}</div>
              <div>반 수: {comparison.snapshot2.metrics.classesCount}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
