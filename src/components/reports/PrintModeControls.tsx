
interface PrintModeControlsProps {
  onPrint: () => void
  onExitPrintMode: () => void
}

export function PrintModeControls({ onPrint, onExitPrintMode }: PrintModeControlsProps) {
  return (
    <div className="print-mode-controls">
      <button
        onClick={onPrint}
        className="btn-print"
        title="인쇄하기"
      >
        <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
        </svg>
        인쇄
      </button>
      
      <button
        onClick={onExitPrintMode}
        className="btn-exit"
        title="인쇄 모드 종료"
      >
        <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
        종료
      </button>
    </div>
  )
}


