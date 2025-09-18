import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { shareService, type ShareableSnapshot } from '../services/shareService';
import { PrintScheduleView } from '../components/print/PrintScheduleView';
import { AccessibleButton } from '../components/a11y/AccessibleButton';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorState } from '../components/ErrorStates';

export const SharedSnapshotPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [snapshot, setSnapshot] = useState<ShareableSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPrintView, setShowPrintView] = useState(false);

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

      const result = await shareService.getSharedSnapshot(token!);
      
      if (result.success && result.snapshot) {
        setSnapshot(result.snapshot);
        // Record access for analytics
        await shareService.recordAccess(token!);
      } else {
        setError(result.message);
      }
    } catch (error) {
      console.error('Failed to load shared snapshot:', error);
      setError('공유 스케줄을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    setShowPrintView(true);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const handleDownload = async () => {
    if (!snapshot) return;

    try {
      const dataStr = JSON.stringify(snapshot.data, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `${snapshot.slotName}_${snapshot.scheduleType}_${new Date(snapshot.generatedAt).toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">공유 스케줄을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error || !snapshot) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <ErrorState
            title="공유 스케줄을 찾을 수 없습니다"
            message={error || '요청하신 공유 스케줄이 존재하지 않거나 접근할 수 없습니다.'}
            action={{
              label: '홈으로 돌아가기',
              onClick: () => navigate('/')
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                공유 스케줄: {snapshot.slotName}
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                생성일시: {new Date(snapshot.generatedAt).toLocaleString('ko-KR')}
              </p>
              {snapshot.expiresAt && (
                <p className="text-xs text-orange-600 mt-1">
                  만료일: {new Date(snapshot.expiresAt).toLocaleString('ko-KR')}
                </p>
              )}
            </div>
            
            <div className="flex space-x-3">
              <AccessibleButton
                variant="secondary"
                onClick={handlePrint}
                aria-label="스케줄 인쇄"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                인쇄
              </AccessibleButton>
              
              <AccessibleButton
                variant="secondary"
                onClick={handleDownload}
                aria-label="스케줄 데이터 다운로드"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                다운로드
              </AccessibleButton>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Schedule Type Badge */}
        <div className="mb-6">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
            snapshot.scheduleType === 'MWF' 
              ? 'bg-blue-100 text-blue-800'
              : snapshot.scheduleType === 'TT'
              ? 'bg-green-100 text-green-800'
              : 'bg-purple-100 text-purple-800'
          }`}>
            {snapshot.scheduleType === 'MWF' ? '월수금 스케줄' :
             snapshot.scheduleType === 'TT' ? '화목 스케줄' : '통합 스케줄'}
          </span>
        </div>

        {/* Print View Toggle */}
        <div className="mb-6 no-print">
          <AccessibleButton
            variant={showPrintView ? 'primary' : 'secondary'}
            onClick={() => setShowPrintView(!showPrintView)}
            aria-label={`${showPrintView ? '일반' : '인쇄용'} 보기로 전환`}
          >
            {showPrintView ? '일반 보기' : '인쇄용 보기'}
          </AccessibleButton>
        </div>

        {/* Schedule Content */}
        {showPrintView ? (
          <PrintScheduleView
            mwfResult={snapshot.scheduleType === 'MWF' || snapshot.scheduleType === 'UNIFIED' ? snapshot.data : undefined}
            ttResult={snapshot.scheduleType === 'TT' || snapshot.scheduleType === 'UNIFIED' ? snapshot.data : undefined}
            slotName={snapshot.slotName}
            generatedAt={snapshot.generatedAt}
          />
        ) : (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-4">스케줄 데이터</h2>
              <div className="bg-gray-50 rounded-lg p-4 overflow-auto">
                <pre className="text-sm text-gray-800 whitespace-pre-wrap">
                  {JSON.stringify(snapshot.data, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="mt-12 pt-8 border-t border-gray-200 text-center text-sm text-gray-500">
          <p>이 스케줄은 읽기 전용으로 공유되었습니다.</p>
          <p className="mt-2">
            스케줄러에 직접 접근하려면{' '}
            <button
              onClick={() => navigate('/')}
              className="text-blue-600 hover:text-blue-800 underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
            >
              홈페이지
            </button>
            를 방문하세요.
          </p>
        </footer>
      </main>
    </div>
  );
};
