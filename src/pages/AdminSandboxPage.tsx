import React, { useState, useEffect } from 'react';
import { sandboxService } from '../services/sandboxService';
import { useToast } from '../components/Toast/ToastProvider';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Card } from '../components/ui/Card';

interface SandboxStatus {
  hasSeededData: boolean;
  seededSlots: string[];
  seededSchedules: string[];
  existingSlots: number;
  existingSchedules: number;
  hasExistingSeededData: boolean;
}

export const AdminSandboxPage: React.FC = () => {
  const toast = useToast();
  const [status, setStatus] = useState<SandboxStatus>({
    hasSeededData: false,
    seededSlots: [],
    seededSchedules: [],
    existingSlots: 0,
    existingSchedules: 0,
    hasExistingSeededData: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Load initial status
  useEffect(() => {
    loadSandboxStatus();
  }, []);

  const loadSandboxStatus = async () => {
    setIsLoading(true);
    try {
      const [seededStatus, existingStatus] = await Promise.all([
        sandboxService.getSeededDataStatus(),
        sandboxService.checkExistingSeededData()
      ]);

      setStatus({
        ...seededStatus,
        ...existingStatus
      });
    } catch (error) {
      console.error('상태 로드 실패:', error);
      toast.error('상태 로드를 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSeedData = async () => {
    setIsSeeding(true);
    try {
      const result = await sandboxService.seedDemoData();
      
      if (result.success) {
        toast.success(result.message);
        await loadSandboxStatus(); // Reload status
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('데이터 생성 실패:', error);
      toast.error('데이터 생성 중 오류가 발생했습니다.');
    } finally {
      setIsSeeding(false);
    }
  };

  const handleResetData = async () => {
    // Confirm before reset
    if (!window.confirm('모든 데모 데이터를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      return;
    }

    setIsResetting(true);
    try {
      const result = await sandboxService.resetSeededData();
      
      if (result.success) {
        toast.success(result.message);
        await loadSandboxStatus(); // Reload status
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('데이터 초기화 실패:', error);
      toast.error('데이터 초기화 중 오류가 발생했습니다.');
    } finally {
      setIsResetting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-secondary transition-theme">
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center h-64">
            <LoadingSpinner size="lg" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary transition-theme">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">Sandbox 관리</h1>
          <p className="text-tertiary">
            데모 데이터를 생성하고 관리합니다. 테스트 및 시연 목적으로 사용됩니다.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Status Card */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-primary">현재 상태</h2>
              <button
                onClick={loadSandboxStatus}
                className="px-3 py-1 text-sm bg-secondary text-primary rounded-md hover:bg-tertiary transition-colors"
              >
                새로고침
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-tertiary">기존 데모 데이터</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  status.hasExistingSeededData 
                    ? 'bg-yellow-100 text-yellow-800' 
                    : 'bg-green-100 text-green-800'
                }`}>
                  {status.hasExistingSeededData ? '존재함' : '없음'}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-tertiary">데모 슬롯</span>
                <span className="font-medium text-primary">
                  {status.existingSlots}개
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-tertiary">데모 스케줄</span>
                <span className="font-medium text-primary">
                  {status.existingSchedules}개
                </span>
              </div>

              {status.hasSeededData && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>현재 세션:</strong> {status.seededSlots.length}개 슬롯, {status.seededSchedules.length}개 스케줄이 생성됨
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* Actions Card */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-primary mb-4">데모 데이터 관리</h2>

            <div className="space-y-4">
              {/* Seed Button */}
              <div>
                <button
                  onClick={handleSeedData}
                  disabled={isSeeding || isResetting}
                  className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {isSeeding ? (
                    <>
                      <LoadingSpinner size="sm" />
                      생성 중...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      데모 데이터 생성
                    </>
                  )}
                </button>
                <p className="text-sm text-tertiary mt-2">
                  3개의 데모 슬롯과 1개의 샘플 스케줄을 생성합니다.
                </p>
              </div>

              {/* Reset Button */}
              <div>
                <button
                  onClick={handleResetData}
                  disabled={isSeeding || isResetting || (!status.hasSeededData && !status.hasExistingSeededData)}
                  className="w-full px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {isResetting ? (
                    <>
                      <LoadingSpinner size="sm" />
                      초기화 중...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      데모 데이터 초기화
                    </>
                  )}
                </button>
                <p className="text-sm text-tertiary mt-2">
                  모든 데모 데이터를 삭제합니다. 되돌릴 수 없습니다.
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Demo Data Information */}
        <Card className="mt-6 p-6">
          <h2 className="text-xl font-semibold text-primary mb-4">생성되는 데모 데이터</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* MWF Slot */}
            <div className="border border-primary rounded-lg p-4">
              <h3 className="font-semibold text-primary mb-2">MWF 데모 슬롯</h3>
              <ul className="text-sm text-tertiary space-y-1">
                <li>• 3학년 4개반</li>
                <li>• 담임교사 7명</li>
                <li>• 외국어교사 5명</li>
                <li>• 제약조건 4개</li>
                <li>• 고정 담임 4개</li>
              </ul>
            </div>

            {/* TT Slot */}
            <div className="border border-primary rounded-lg p-4">
              <h3 className="font-semibold text-primary mb-2">TT 데모 슬롯</h3>
              <ul className="text-sm text-tertiary space-y-1">
                <li>• 2학년 3개반</li>
                <li>• 담임교사 5명</li>
                <li>• 외국어교사 4명</li>
                <li>• 제약조건 3개</li>
                <li>• 고정 담임 3개</li>
              </ul>
            </div>

            {/* Complex Slot */}
            <div className="border border-primary rounded-lg p-4">
              <h3 className="font-semibold text-primary mb-2">복잡한 데모 슬롯</h3>
              <ul className="text-sm text-tertiary space-y-1">
                <li>• 4학년 6개반</li>
                <li>• 담임교사 9명</li>
                <li>• 외국어교사 6명</li>
                <li>• 복잡한 제약조건</li>
                <li>• 고정 담임 6개</li>
              </ul>
            </div>
          </div>

          <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div>
                <h4 className="font-medium text-yellow-800">주의사항</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  데모 데이터는 테스트 및 시연 목적으로만 사용하세요. 
                  실제 운영 데이터와 혼동하지 않도록 주의하세요.
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Quick Actions */}
        <Card className="mt-6 p-6">
          <h2 className="text-xl font-semibold text-primary mb-4">빠른 액션</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              onClick={() => window.location.href = '/slots'}
              className="p-4 border border-primary rounded-lg hover:bg-tertiary transition-colors text-left"
            >
              <div className="font-medium text-primary mb-1">슬롯 관리</div>
              <div className="text-sm text-tertiary">생성된 슬롯 확인</div>
            </button>

            <button
              onClick={() => window.location.href = '/mwf-scheduler'}
              className="p-4 border border-primary rounded-lg hover:bg-tertiary transition-colors text-left"
            >
              <div className="font-medium text-primary mb-1">MWF 스케줄러</div>
              <div className="text-sm text-tertiary">MWF 스케줄 생성</div>
            </button>

            <button
              onClick={() => window.location.href = '/tt-scheduler'}
              className="p-4 border border-primary rounded-lg hover:bg-tertiary transition-colors text-left"
            >
              <div className="font-medium text-primary mb-1">TT 스케줄러</div>
              <div className="text-sm text-tertiary">TT 스케줄 생성</div>
            </button>

            <button
              onClick={() => window.location.href = '/schedule-history'}
              className="p-4 border border-primary rounded-lg hover:bg-tertiary transition-colors text-left"
            >
              <div className="font-medium text-primary mb-1">스케줄 히스토리</div>
              <div className="text-sm text-tertiary">생성된 스케줄 확인</div>
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
};
