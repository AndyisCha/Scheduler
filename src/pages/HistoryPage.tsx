import React, { useState, useEffect } from 'react';
import { AccessibleButton } from '../components/a11y/AccessibleButton';
import { DiffViewer } from '../components/DiffViewer';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { scheduleHistoryService, type ScheduleSnapshot, type HistoryFilters, type HistorySortOptions, type ComparisonResult } from '../services/scheduleHistoryService';
import { useToast } from '../components/Toast/ToastProvider';

export const HistoryPage: React.FC = () => {
  const toast = useToast();
  
  // State
  const [snapshots, setSnapshots] = useState<ScheduleSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSnapshots, setSelectedSnapshots] = useState<string[]>([]);
  const [showComparison, setShowComparison] = useState(false);
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [comparing, setComparing] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 20;
  
  // Filters and sorting
  const [filters, setFilters] = useState<HistoryFilters>({});
  const [sortOptions, setSortOptions] = useState<HistorySortOptions>({
    field: 'createdAt',
    direction: 'desc'
  });
  
  // Available slots for filtering
  const [availableSlots, setAvailableSlots] = useState<Array<{ id: string; name: string; dayGroup: string }>>([]);

  useEffect(() => {
    loadSnapshots();
    loadSlots();
  }, [filters, sortOptions, currentPage]);

  const loadSnapshots = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await scheduleHistoryService.getSnapshots(
        filters,
        sortOptions,
        currentPage,
        pageSize
      );
      
      setSnapshots(result.snapshots);
      setTotalPages(result.totalPages);
      setTotalCount(result.totalCount);
    } catch (error) {
      setError(error instanceof Error ? error.message : '스냅샷을 불러오는 중 오류가 발생했습니다.');
      toast.error('스냅샷을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const loadSlots = async () => {
    try {
      const slots = await scheduleHistoryService.getSlotsForFilter();
      setAvailableSlots(slots);
    } catch (error) {
      console.error('Failed to load slots:', error);
    }
  };

  const handleSnapshotSelect = (snapshotId: string) => {
    setSelectedSnapshots(prev => {
      if (prev.includes(snapshotId)) {
        return prev.filter(id => id !== snapshotId);
      } else if (prev.length < 2) {
        return [...prev, snapshotId];
      } else {
        // Replace the first selected snapshot
        return [prev[1], snapshotId];
      }
    });
  };

  const handleCompare = async () => {
    if (selectedSnapshots.length !== 2) return;
    
    setComparing(true);
    try {
      const comparisonResult = await scheduleHistoryService.compareSnapshots(
        selectedSnapshots[0],
        selectedSnapshots[1]
      );
      
      setComparison(comparisonResult);
      setShowComparison(true);
    } catch (error) {
      toast.error('스케줄 비교 중 오류가 발생했습니다.');
    } finally {
      setComparing(false);
    }
  };

  const handleDeleteSnapshot = async (snapshotId: string) => {
    if (!window.confirm('이 스냅샷을 삭제하시겠습니까?')) return;
    
    try {
      await scheduleHistoryService.deleteSnapshot(snapshotId);
      toast.success('스냅샷이 삭제되었습니다.');
      loadSnapshots();
    } catch (error) {
      toast.error('스냅샷 삭제 중 오류가 발생했습니다.');
    }
  };

  const handleExportCSV = () => {
    if (!comparison) return;
    
    const csvContent = scheduleHistoryService.exportComparisonAsCSV(comparison);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `schedule-diff-${Date.now()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('CSV 파일이 다운로드되었습니다.');
  };

  const handleExportICS = () => {
    if (!comparison) return;
    
    const icsContent = scheduleHistoryService.exportComparisonAsICS(comparison);
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `schedule-diff-${Date.now()}.ics`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('ICS 파일이 다운로드되었습니다.');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ko-KR');
  };

  const formatDuration = (ms: number) => {
    return `${ms}ms`;
  };

  if (showComparison && comparison) {
    return (
      <DiffViewer
        comparison={comparison}
        onClose={() => setShowComparison(false)}
        onExportCSV={handleExportCSV}
        onExportICS={handleExportICS}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">스케줄 히스토리</h1>
          <p className="mt-2 text-gray-600">
            저장된 스케줄 스냅샷을 확인하고 비교할 수 있습니다.
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">필터 및 정렬</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">슬롯</label>
              <select
                value={filters.slotId || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, slotId: e.target.value || undefined }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">모든 슬롯</option>
                {availableSlots.map(slot => (
                  <option key={slot.id} value={slot.id}>
                    {slot.name} ({slot.dayGroup})
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">스케줄 타입</label>
              <select
                value={filters.scheduleType || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, scheduleType: e.target.value as any || undefined }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">모든 타입</option>
                <option value="MWF">월수금</option>
                <option value="TT">화목</option>
                <option value="UNIFIED">통합</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">정렬 기준</label>
              <select
                value={sortOptions.field}
                onChange={(e) => setSortOptions(prev => ({ ...prev, field: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="createdAt">생성일</option>
                <option value="slotName">슬롯명</option>
                <option value="scheduleType">타입</option>
                <option value="generationTime">생성시간</option>
                <option value="assignedCount">배정수</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">정렬 순서</label>
              <select
                value={sortOptions.direction}
                onChange={(e) => setSortOptions(prev => ({ ...prev, direction: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="desc">내림차순</option>
                <option value="asc">오름차순</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">검색</label>
              <input
                type="text"
                placeholder="이름으로 검색..."
                value={filters.searchTerm || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value || undefined }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              총 {totalCount}개 스냅샷 • {selectedSnapshots.length}개 선택됨
            </div>
            
            <div className="flex space-x-3">
              {selectedSnapshots.length === 2 && (
                <AccessibleButton
                  variant="primary"
                  onClick={handleCompare}
                  loading={comparing}
                  disabled={comparing}
                >
                  비교하기
                </AccessibleButton>
              )}
              
              <AccessibleButton
                variant="secondary"
                onClick={loadSnapshots}
                disabled={loading}
              >
                새로고침
              </AccessibleButton>
            </div>
          </div>
        </div>

        {/* Snapshots List */}
        <div className="bg-white rounded-lg shadow">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="text-red-600 text-lg">{error}</div>
              <AccessibleButton
                variant="primary"
                onClick={loadSnapshots}
                className="mt-4"
              >
                다시 시도
              </AccessibleButton>
            </div>
          ) : snapshots.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-500 text-lg">저장된 스냅샷이 없습니다.</div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="w-12 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        선택
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        이름
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        슬롯
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        타입
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        메트릭스
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        생성일
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        작업
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {snapshots.map((snapshot) => (
                      <tr key={snapshot.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedSnapshots.includes(snapshot.id)}
                            onChange={() => handleSnapshotSelect(snapshot.id)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {snapshot.name}
                          </div>
                          {snapshot.description && (
                            <div className="text-sm text-gray-500">
                              {snapshot.description}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{snapshot.slotName}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            snapshot.scheduleType === 'MWF' ? 'bg-blue-100 text-blue-800' :
                            snapshot.scheduleType === 'TT' ? 'bg-green-100 text-green-800' :
                            'bg-purple-100 text-purple-800'
                          }`}>
                            {snapshot.scheduleType}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            <div>생성시간: {formatDuration(snapshot.metrics.generationTimeMs)}</div>
                            <div>배정률: {Math.round((snapshot.metrics.assignedCount / snapshot.metrics.totalAssignments) * 100)}%</div>
                            <div>경고: {snapshot.metrics.warningsCount}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(snapshot.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <AccessibleButton
                            variant="danger"
                            size="sm"
                            onClick={() => handleDeleteSnapshot(snapshot.id)}
                          >
                            삭제
                          </AccessibleButton>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 flex justify-between sm:hidden">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        이전
                      </button>
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        다음
                      </button>
                    </div>
                    <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm text-gray-700">
                          <span className="font-medium">{((currentPage - 1) * pageSize) + 1}</span>
                          -
                          <span className="font-medium">{Math.min(currentPage * pageSize, totalCount)}</span>
                          {' '}of{' '}
                          <span className="font-medium">{totalCount}</span>
                          {' '}results
                        </p>
                      </div>
                      <div>
                        <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                          <button
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            이전
                          </button>
                          
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                            return (
                              <button
                                key={pageNum}
                                onClick={() => setCurrentPage(pageNum)}
                                className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                  pageNum === currentPage
                                    ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                    : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                                }`}
                              >
                                {pageNum}
                              </button>
                            );
                          })}
                          
                          <button
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                            className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            다음
                          </button>
                        </nav>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
