import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { secureShareService, type SharedSnapshot, type ShareAccessLog } from '../services/secureShareService';
import { PrintScheduleView } from '../components/print/PrintScheduleView';
import { AccessibleButton } from '../components/a11y/AccessibleButton';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorState } from '../components/ErrorStates';
import { useToast } from '../components/Toast/ToastProvider';

export const SecureSharedSnapshotPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const { showToast } = useToast();
  
  const [snapshot, setSnapshot] = useState<SharedSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accessLogs, setAccessLogs] = useState<ShareAccessLog[]>([]);
  const [showAccessLogs, setShowAccessLogs] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('유효하지 않은 공유 링크입니다.');
      setLoading(false);
      return;
    }

    loadSharedSnapshot();
  }, [token]);

  const loadSharedSnapshot = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await secureShareService.getSharedSnapshot(token!);
      
      if (!data) {
        setError('공유 링크를 찾을 수 없거나 만료되었습니다.');
        return;
      }

      setSnapshot(data);

      // Load access logs if user has permission
      if (data.created_by) {
        try {
          const logs = await secureShareService.getAccessLogs(token!);
          setAccessLogs(logs);
        } catch (err) {
          console.warn('Failed to load access logs:', err);
        }
      }

    } catch (err) {
      console.error('Error loading shared snapshot:', err);
      setError('공유 스케줄을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    if (!snapshot?.allow_download) {
      showToast({
        type: 'error',
        title: '다운로드 불가',
        message: '이 링크에서는 다운로드가 허용되지 않습니다.'
      });
      return;
    }
    
    showToast({
      type: 'info',
      title: '다운로드 안내',
      message: '다운로드 기능은 준비 중입니다. 브라우저의 "인쇄" 기능을 사용하여 PDF로 저장할 수 있습니다.'
    });
    handlePrint();
  };

  const handleCopyLink = async () => {
    const shareUrl = `${window.location.origin}/shared/${token}`;
    const success = await secureShareService.copyShareUrl(shareUrl);
    
    if (success) {
      showToast({
        type: 'success',
        title: '복사 완료',
        message: '링크가 클립보드에 복사되었습니다!'
      });
    } else {
      showToast({
        type: 'error',
        title: '복사 실패',
        message: '링크 복사에 실패했습니다.'
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ko-KR');
  };

  const getStatusBadge = (snapshot: SharedSnapshot) => {
    if (snapshot.is_revoked) {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">취소됨</span>;
    }
    
    if (snapshot.expires_at && new Date(snapshot.expires_at) < new Date()) {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">만료됨</span>;
    }
    
    if (snapshot.is_single_use && snapshot.access_count > 0) {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">사용됨</span>;
    }
    
    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">활성</span>;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner size="lg" />
        <p className="ml-4 text-gray-600 dark:text-gray-300">공유 스케줄을 불러오는 중...</p>
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        title="스케줄을 불러올 수 없습니다."
        message={error}
        onRetry={() => window.location.reload()}
      />
    );
  }

  if (!snapshot || !snapshot.snapshot) {
    return (
      <ErrorState
        title="스케줄 데이터 없음"
        message="공유된 스케줄 데이터가 유효하지 않습니다."
      />
    );
  }

  const { snapshot: scheduleData } = snapshot;

  return (
    <div className="shared-snapshot-page p-4 md:p-8 lg:p-12 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="max-w-6xl mx-auto bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                공유된 스케줄: {scheduleData.slot_name}
              </h1>
              <div className="mt-2 flex items-center space-x-4">
                {getStatusBadge(snapshot)}
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  생성일: {formatDate(snapshot.created_at)}
                </span>
                {snapshot.expires_at && (
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    만료일: {formatDate(snapshot.expires_at)}
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex space-x-2">
              <AccessibleButton
                onClick={handleCopyLink}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
              >
                📋 링크 복사
              </AccessibleButton>
              
              {accessLogs.length > 0 && (
                <AccessibleButton
                  onClick={() => setShowAccessLogs(!showAccessLogs)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                >
                  📊 접근 로그
                </AccessibleButton>
              )}
            </div>
          </div>

          <div className="text-gray-600 dark:text-gray-300 text-sm">
            <p>이 스케줄은 읽기 전용으로 공유되었습니다.</p>
            {snapshot.is_single_use && (
              <p className="text-yellow-600">⚠️ 이 링크는 1회만 사용할 수 있습니다.</p>
            )}
            {snapshot.max_access_count && (
              <p>최대 접근 횟수: {snapshot.max_access_count}회 (현재: {snapshot.access_count}회)</p>
            )}
          </div>
        </div>

        {/* Access Logs */}
        {showAccessLogs && accessLogs.length > 0 && (
          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">접근 로그</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
                <thead className="bg-gray-100 dark:bg-gray-600">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      접근 시간
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      IP 주소
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      성공 여부
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      실패 사유
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-600">
                  {accessLogs.map((log) => (
                    <tr key={log.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {formatDate(log.accessed_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {log.ip_address}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          log.success 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}>
                          {log.success ? '성공' : '실패'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {log.failure_reason || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end space-x-4 mb-6 no-print">
          <AccessibleButton
            onClick={handlePrint}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
          >
            🖨️ 인쇄
          </AccessibleButton>
          
          {snapshot.allow_download && (
            <AccessibleButton
              onClick={handleDownload}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
            >
              ⬇️ 다운로드
            </AccessibleButton>
          )}
        </div>

        {/* Schedule Content */}
        <PrintScheduleView
          mwfResult={scheduleData.mwf_result || undefined}
          ttResult={scheduleData.tt_result || undefined}
          slotName={scheduleData.slot_name}
          generatedAt={scheduleData.generated_at}
        />

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-600 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>
            이 링크는 {snapshot.access_count}번째로 접근되었습니다.
            {snapshot.last_accessed_at && (
              <span> 마지막 접근: {formatDate(snapshot.last_accessed_at)}</span>
            )}
          </p>
          {snapshot.is_revoked && (
            <p className="text-red-600 mt-2">⚠️ 이 공유 링크는 취소되었습니다.</p>
          )}
        </div>
      </div>
    </div>
  );
};
