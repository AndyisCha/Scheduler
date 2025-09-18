import React, { useState, useEffect } from 'react';
import { shareService } from '../../services/shareService';
import { AccessibleButton } from '../a11y/AccessibleButton';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { useToast } from '../Toast/ToastProvider';

interface ShareLink {
  id: string;
  snapshotId: string;
  shareToken: string;
  snapshotName: string;
  scheduleType: string;
  createdAt: string;
  expiresAt?: string;
  isActive: boolean;
  accessCount: number;
}

interface ShareLinkManagerProps {
  snapshotId: string;
  snapshotName: string;
  onClose?: () => void;
}

export const ShareLinkManager: React.FC<ShareLinkManagerProps> = ({
  snapshotId,
  snapshotName,
  onClose
}) => {
  const toast = useToast();
  const [shareLinks, setShareLinks] = useState<ShareLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newLinkOptions, setNewLinkOptions] = useState({
    expiresInDays: 30,
    isPublic: false,
    allowDownload: true
  });

  useEffect(() => {
    loadShareLinks();
  }, [snapshotId]);

  const loadShareLinks = async () => {
    setLoading(true);
    try {
      const result = await shareService.getUserShareLinks();
      if (result.success && result.shareLinks) {
        // Filter links for current snapshot
        const filteredLinks = result.shareLinks.filter(link => 
          link.snapshotId === snapshotId
        );
        setShareLinks(filteredLinks);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Failed to load share links:', error);
      toast.error('공유 링크를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const createShareLink = async () => {
    setCreating(true);
    try {
      const result = await shareService.createShareLink({
        snapshotId,
        expiresInDays: newLinkOptions.expiresInDays,
        isPublic: newLinkOptions.isPublic,
        allowDownload: newLinkOptions.allowDownload
      });

      if (result.success && result.shareUrl) {
        toast.success(result.message);
        setShowCreateForm(false);
        await loadShareLinks();
        
        // Copy URL to clipboard
        const copied = await shareService.copyShareUrl(result.shareUrl);
        if (copied) {
          toast.success('공유 링크가 클립보드에 복사되었습니다.');
        }
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Failed to create share link:', error);
      toast.error('공유 링크 생성 중 오류가 발생했습니다.');
    } finally {
      setCreating(false);
    }
  };

  const deleteShareLink = async (shareToken: string) => {
    if (!window.confirm('이 공유 링크를 삭제하시겠습니까?')) {
      return;
    }

    try {
      const result = await shareService.deleteShareLink(shareToken);
      if (result.success) {
        toast.success(result.message);
        await loadShareLinks();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Failed to delete share link:', error);
      toast.error('공유 링크 삭제 중 오류가 발생했습니다.');
    }
  };

  const copyShareUrl = async (shareToken: string) => {
    const shareUrl = `${window.location.origin}/shared/${shareToken}`;
    const copied = await shareService.copyShareUrl(shareUrl);
    
    if (copied) {
      toast.success('공유 링크가 클립보드에 복사되었습니다.');
    } else {
      toast.error('링크 복사에 실패했습니다.');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ko-KR');
  };

  const isExpired = (expiresAt?: string) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  return (
    <div className="bg-white rounded-lg shadow-lg max-w-4xl mx-auto">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">공유 링크 관리</h2>
            <p className="text-sm text-gray-600 mt-1">{snapshotName}</p>
          </div>
          <div className="flex space-x-3">
            <AccessibleButton
              variant="primary"
              onClick={() => setShowCreateForm(!showCreateForm)}
              aria-label="새 공유 링크 생성"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              새 링크 생성
            </AccessibleButton>
            {onClose && (
              <AccessibleButton
                variant="secondary"
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

      {/* Create Form */}
      {showCreateForm && (
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h3 className="text-md font-medium text-gray-900 mb-4">새 공유 링크 생성</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                만료 기간 (일)
              </label>
              <select
                value={newLinkOptions.expiresInDays}
                onChange={(e) => setNewLinkOptions(prev => ({
                  ...prev,
                  expiresInDays: parseInt(e.target.value)
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={7}>7일</option>
                <option value={30}>30일</option>
                <option value={90}>90일</option>
                <option value={0}>만료 없음</option>
              </select>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="isPublic"
                checked={newLinkOptions.isPublic}
                onChange={(e) => setNewLinkOptions(prev => ({
                  ...prev,
                  isPublic: e.target.checked
                }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="isPublic" className="ml-2 block text-sm text-gray-700">
                공개 링크
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="allowDownload"
                checked={newLinkOptions.allowDownload}
                onChange={(e) => setNewLinkOptions(prev => ({
                  ...prev,
                  allowDownload: e.target.checked
                }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="allowDownload" className="ml-2 block text-sm text-gray-700">
                다운로드 허용
              </label>
            </div>
          </div>

          <div className="flex space-x-3">
            <AccessibleButton
              variant="primary"
              onClick={createShareLink}
              loading={creating}
              disabled={creating}
              aria-label="공유 링크 생성"
            >
              생성
            </AccessibleButton>
            <AccessibleButton
              variant="secondary"
              onClick={() => setShowCreateForm(false)}
              aria-label="취소"
            >
              취소
            </AccessibleButton>
          </div>
        </div>
      )}

      {/* Share Links List */}
      <div className="px-6 py-4">
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <LoadingSpinner size="md" />
            <span className="ml-2 text-gray-600">로딩 중...</span>
          </div>
        ) : shareLinks.length === 0 ? (
          <div className="text-center py-8">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">공유 링크가 없습니다</h3>
            <p className="mt-1 text-sm text-gray-500">새 공유 링크를 생성하여 스케줄을 공유하세요.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {shareLinks.map((link) => (
              <div
                key={link.id}
                className={`border rounded-lg p-4 ${
                  !link.isActive || isExpired(link.expiresAt)
                    ? 'border-red-200 bg-red-50'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-medium text-gray-900">
                        {link.snapshotName}
                      </h4>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        link.scheduleType === 'MWF'
                          ? 'bg-blue-100 text-blue-800'
                          : link.scheduleType === 'TT'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        {link.scheduleType}
                      </span>
                      {!link.isActive || isExpired(link.expiresAt) && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          만료됨
                        </span>
                      )}
                    </div>
                    
                    <div className="mt-2 text-sm text-gray-600">
                      <p>생성일: {formatDate(link.createdAt)}</p>
                      {link.expiresAt && (
                        <p>만료일: {formatDate(link.expiresAt)}</p>
                      )}
                      <p>접근 횟수: {link.accessCount}회</p>
                    </div>
                  </div>

                  <div className="flex space-x-2 ml-4">
                    <AccessibleButton
                      variant="secondary"
                      size="sm"
                      onClick={() => copyShareUrl(link.shareToken)}
                      aria-label="공유 링크 복사"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </AccessibleButton>
                    
                    <AccessibleButton
                      variant="danger"
                      size="sm"
                      onClick={() => deleteShareLink(link.shareToken)}
                      aria-label="공유 링크 삭제"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </AccessibleButton>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
