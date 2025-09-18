import React, { useState, useEffect } from 'react';
import { AccessibleButton } from '../components/a11y/AccessibleButton';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { secureShareService, type SharedSnapshot, type ShareAccessLog, type ShareAuditTrail, type ShareLinkFilters, type ShareLinkSortOptions } from '../services/secureShareService';
import { useToast } from '../components/Toast/ToastProvider';

export const ShareLinkAdminPage: React.FC = () => {
  const { showToast } = useToast();
  
  // State
  const [shareLinks, setShareLinks] = useState<SharedSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLinks, setSelectedLinks] = useState<string[]>([]);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 20;
  
  // Filters and sorting
  const [filters, setFilters] = useState<ShareLinkFilters>({});
  const [sortOptions] = useState<ShareLinkSortOptions>({
    field: 'created_at',
    direction: 'desc'
  });
  
  // Detail views
  const [selectedLink, setSelectedLink] = useState<SharedSnapshot | null>(null);
  const [accessLogs, setAccessLogs] = useState<ShareAccessLog[]>([]);
  const [auditTrail, setAuditTrail] = useState<ShareAuditTrail[]>([]);
  const [showDetails, setShowDetails] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);

  useEffect(() => {
    loadShareLinks();
  }, [filters, sortOptions, currentPage]);

  const loadShareLinks = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await secureShareService.getShareLinks(
        filters,
        sortOptions,
        currentPage,
        pageSize
      );
      
      setShareLinks(result.shareLinks);
      setTotalPages(result.totalPages);
      setTotalCount(result.totalCount);
    } catch (error) {
      setError(error instanceof Error ? error.message : '공유 링크를 불러오는 중 오류가 발생했습니다.');
      showToast({
        type: 'error',
        title: '오류',
        message: '공유 링크를 불러오는 중 오류가 발생했습니다.'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadLinkDetails = async (link: SharedSnapshot) => {
    setDetailsLoading(true);
    try {
      const [logs, trail] = await Promise.all([
        secureShareService.getAccessLogs(link.share_token),
        secureShareService.getAuditTrail(link.share_token),
      ]);
      
      setAccessLogs(logs);
      setAuditTrail(trail);
      setSelectedLink(link);
      setShowDetails(true);
    } catch (error) {
      showToast({
        type: 'error',
        title: '오류',
        message: '링크 세부 정보를 불러오는 중 오류가 발생했습니다.'
      });
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleRotateToken = async (shareToken: string) => {
    if (!window.confirm('정말로 이 링크의 토큰을 재생성하시겠습니까? 기존 링크는 더 이상 작동하지 않습니다.')) return;
    
    try {
      await secureShareService.rotateShareToken(shareToken);
      showToast({
        type: 'success',
        title: '성공',
        message: '토큰이 성공적으로 재생성되었습니다.'
      });
      loadShareLinks();
    } catch (error) {
      showToast({
        type: 'error',
        title: '오류',
        message: '토큰 재생성 중 오류가 발생했습니다.'
      });
    }
  };

  const handleRevokeLink = async (shareToken: string) => {
    if (!window.confirm('정말로 이 링크를 취소하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;
    
    try {
      await secureShareService.revokeShareLink(shareToken);
      showToast({
        type: 'success',
        title: '성공',
        message: '링크가 성공적으로 취소되었습니다.'
      });
      loadShareLinks();
      if (selectedLink?.share_token === shareToken) {
        setShowDetails(false);
      }
    } catch (error) {
      showToast({
        type: 'error',
        title: '오류',
        message: '링크 취소 중 오류가 발생했습니다.'
      });
    }
  };

  const handleBulkRevoke = async () => {
    if (selectedLinks.length === 0) return;
    
    if (!window.confirm(`정말로 선택된 ${selectedLinks.length}개의 링크를 모두 취소하시겠습니까?`)) return;
    
    try {
      await Promise.all(selectedLinks.map(token => secureShareService.revokeShareLink(token)));
      showToast({
        type: 'success',
        title: '성공',
        message: `${selectedLinks.length}개의 링크가 성공적으로 취소되었습니다.`
      });
      setSelectedLinks([]);
      loadShareLinks();
    } catch (error) {
      showToast({
        type: 'error',
        title: '오류',
        message: '일괄 취소 중 오류가 발생했습니다.'
      });
    }
  };

  const handleRevokeExpired = async () => {
    try {
      const count = await secureShareService.revokeExpiredLinks();
      showToast({
        type: 'success',
        title: '성공',
        message: `${count}개의 만료된 링크가 취소되었습니다.`
      });
      loadShareLinks();
    } catch (error) {
      showToast({
        type: 'error',
        title: '오류',
        message: '만료된 링크 취소 중 오류가 발생했습니다.'
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ko-KR');
  };

  const getStatusBadge = (link: SharedSnapshot) => {
    if (link.is_revoked) {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">취소됨</span>;
    }
    
    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">만료됨</span>;
    }
    
    if (link.is_single_use && link.access_count > 0) {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">사용됨</span>;
    }
    
    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">활성</span>;
  };

  const formatToken = (token: string) => {
    return `${token.substring(0, 8)}...${token.substring(token.length - 8)}`;
  };

  if (showDetails && selectedLink) {
    return (
      <div className="min-h-screen bg-gray-50 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-6">
            <div className="flex justify-between items-center">
              <h1 className="text-3xl font-bold text-gray-900">공유 링크 세부 정보</h1>
              <AccessibleButton
                variant="secondary"
                onClick={() => setShowDetails(false)}
              >
                ← 목록으로 돌아가기
              </AccessibleButton>
            </div>
          </div>

          {/* Link Info */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">링크 정보</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">토큰</label>
                <p className="text-sm text-gray-900 font-mono">{formatToken(selectedLink.share_token)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">상태</label>
                <div className="mt-1">{getStatusBadge(selectedLink)}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">생성일</label>
                <p className="text-sm text-gray-900">{formatDate(selectedLink.created_at)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">만료일</label>
                <p className="text-sm text-gray-900">
                  {selectedLink.expires_at ? formatDate(selectedLink.expires_at) : '만료 없음'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">접근 횟수</label>
                <p className="text-sm text-gray-900">{selectedLink.access_count}회</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">마지막 접근</label>
                <p className="text-sm text-gray-900">
                  {selectedLink.last_accessed_at ? formatDate(selectedLink.last_accessed_at) : '없음'}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex space-x-3">
              {!selectedLink.is_revoked && (
                <>
                  <AccessibleButton
                    variant="secondary"
                    onClick={() => handleRotateToken(selectedLink.share_token)}
                  >
                    🔄 토큰 재생성
                  </AccessibleButton>
                  <AccessibleButton
                    variant="danger"
                    onClick={() => handleRevokeLink(selectedLink.share_token)}
                  >
                    🚫 링크 취소
                  </AccessibleButton>
                </>
              )}
            </div>
          </div>

          {/* Access Logs */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">접근 로그</h2>
            {detailsLoading ? (
              <LoadingSpinner />
            ) : accessLogs.length === 0 ? (
              <p className="text-gray-500">접근 로그가 없습니다.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">접근 시간</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IP 주소</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">성공 여부</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">실패 사유</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {accessLogs.map((log) => (
                      <tr key={log.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(log.accessed_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {log.ip_address}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            log.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {log.success ? '성공' : '실패'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {log.failure_reason || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Audit Trail */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">감사 추적</h2>
            {detailsLoading ? (
              <LoadingSpinner />
            ) : auditTrail.length === 0 ? (
              <p className="text-gray-500">감사 추적이 없습니다.</p>
            ) : (
              <div className="space-y-4">
                {auditTrail.map((trail) => (
                  <div key={trail.id} className="border-l-4 border-blue-400 pl-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {trail.action === 'created' && '링크 생성'}
                          {trail.action === 'rotated' && '토큰 재생성'}
                          {trail.action === 'revoked' && '링크 취소'}
                          {trail.action === 'expired' && '링크 만료'}
                          {trail.action === 'accessed' && '접근 성공'}
                          {trail.action === 'failed_access' && '접근 실패'}
                        </p>
                        <p className="text-sm text-gray-600">{trail.details}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">{formatDate(trail.performed_at)}</p>
                        {trail.performed_by && (
                          <p className="text-xs text-gray-400">by {trail.performed_by}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">공유 링크 관리</h1>
          <p className="mt-2 text-gray-600">
            모든 공유 링크를 관리하고 보안을 모니터링할 수 있습니다.
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">필터 및 검색</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">상태</label>
              <select
                value={filters.isRevoked === undefined ? '' : filters.isRevoked.toString()}
                onChange={(e) => setFilters(prev => ({ 
                  ...prev, 
                  isRevoked: e.target.value === '' ? undefined : e.target.value === 'true'
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">모든 상태</option>
                <option value="false">활성</option>
                <option value="true">취소됨</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">만료</label>
              <select
                value={filters.expired === undefined ? '' : filters.expired.toString()}
                onChange={(e) => setFilters(prev => ({ 
                  ...prev, 
                  expired: e.target.value === '' ? undefined : e.target.value === 'true'
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">모든 링크</option>
                <option value="false">활성</option>
                <option value="true">만료됨</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">공개 여부</label>
              <select
                value={filters.isPublic === undefined ? '' : filters.isPublic.toString()}
                onChange={(e) => setFilters(prev => ({ 
                  ...prev, 
                  isPublic: e.target.value === '' ? undefined : e.target.value === 'true'
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">모든 링크</option>
                <option value="true">공개</option>
                <option value="false">비공개</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">검색</label>
              <input
                type="text"
                placeholder="토큰으로 검색..."
                value={filters.searchTerm || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value || undefined }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Bulk Actions */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              총 {totalCount}개 링크 • {selectedLinks.length}개 선택됨
            </div>
            
            <div className="flex space-x-3">
              {selectedLinks.length > 0 && (
                <AccessibleButton
                  variant="danger"
                  onClick={handleBulkRevoke}
                >
                  선택된 링크 취소 ({selectedLinks.length})
                </AccessibleButton>
              )}
              
              <AccessibleButton
                variant="secondary"
                onClick={handleRevokeExpired}
              >
                만료된 링크 취소
              </AccessibleButton>
              
              <AccessibleButton
                variant="secondary"
                onClick={loadShareLinks}
                disabled={loading}
              >
                새로고침
              </AccessibleButton>
            </div>
          </div>
        </div>

        {/* Links List */}
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
                onClick={loadShareLinks}
                className="mt-4"
              >
                다시 시도
              </AccessibleButton>
            </div>
          ) : shareLinks.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-500 text-lg">공유 링크가 없습니다.</div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="w-12 px-6 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={selectedLinks.length === shareLinks.length && shareLinks.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedLinks(shareLinks.map(link => link.share_token));
                            } else {
                              setSelectedLinks([]);
                            }
                          }}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">토큰</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">상태</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">접근</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">생성일</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">만료일</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">작업</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {shareLinks.map((link) => (
                      <tr key={link.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedLinks.includes(link.share_token)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedLinks(prev => [...prev, link.share_token]);
                              } else {
                                setSelectedLinks(prev => prev.filter(token => token !== link.share_token));
                              }
                            }}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-mono text-gray-900">{formatToken(link.share_token)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(link)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {link.access_count}회
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(link.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {link.expires_at ? formatDate(link.expires_at) : '만료 없음'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <AccessibleButton
                              variant="secondary"
                              size="sm"
                              onClick={() => loadLinkDetails(link)}
                            >
                              세부정보
                            </AccessibleButton>
                            {!link.is_revoked && (
                              <AccessibleButton
                                variant="danger"
                                size="sm"
                                onClick={() => handleRevokeLink(link.share_token)}
                              >
                                취소
                              </AccessibleButton>
                            )}
                          </div>
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
