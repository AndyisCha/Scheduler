import React from 'react';
// import { useTranslation } from 'react-i18next';

interface ActionBarProps {
  onGenerateMwf?: () => void;
  onGenerateTt?: () => void;
  onGenerateBoth?: () => void;
  isGenerating?: boolean;
  isLoading?: boolean;
  disabled?: boolean;
}

export const ActionBar: React.FC<ActionBarProps> = ({
  onGenerateMwf,
  onGenerateTt,
  onGenerateBoth,
  isGenerating = false,
  isLoading = false,
  disabled = false
}) => {
  const loading = isGenerating || isLoading;
  return (
    <div className="sticky top-0 z-50 bg-primary shadow-theme-sm border-b border-primary">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-semibold text-primary">
              스케줄 생성
            </h2>
          </div>
          
          <div className="flex items-center space-x-3">
            {onGenerateMwf && (
              <button
                onClick={onGenerateMwf}
                disabled={disabled || loading}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-tertiary disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>MWF 생성</span>
              </button>
            )}

            {onGenerateTt && (
              <button
                onClick={onGenerateTt}
                disabled={disabled || loading}
                className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:bg-tertiary disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>TT 생성</span>
              </button>
            )}

            {onGenerateBoth && (
              <button
                onClick={onGenerateBoth}
                disabled={disabled || loading}
                className="px-6 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 disabled:bg-tertiary disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
              >
                {loading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>생성 중...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span>통합 생성</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};


