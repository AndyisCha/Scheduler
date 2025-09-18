import React from 'react'

interface ToastContainerProps {
  children: React.ReactNode
}

export function ToastContainer({ children }: ToastContainerProps) {
  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="fixed top-4 right-4 z-50 w-96 max-w-sm space-y-2"
    >
      {children}
    </div>
  )
}


