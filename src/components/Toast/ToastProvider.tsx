import React, { createContext, useContext, useState, useCallback } from 'react'
import { ToastContainer } from './ToastContainer'
import { Toast } from './Toast'

export interface ToastMessage {
  id: string
  type: 'success' | 'error' | 'info' | 'warning'
  title: string
  message?: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

interface ToastContextType {
  toasts: ToastMessage[]
  showToast: (toast: Omit<ToastMessage, 'id'>) => string
  hideToast: (id: string) => void
  clearAllToasts: () => void
  success: (message: string, title?: string) => string
  error: (message: string, title?: string) => string
  info: (message: string, title?: string) => string
  warning: (message: string, title?: string) => string
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

interface ToastProviderProps {
  children: React.ReactNode
  maxToasts?: number
}

export function ToastProvider({ children, maxToasts = 5 }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const showToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9)
    const newToast: ToastMessage = {
      id,
      duration: 5000,
      ...toast
    }

    setToasts(prev => {
      const updated = [newToast, ...prev].slice(0, maxToasts)
      return updated
    })

    // Auto-hide toast after duration
    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        hideToast(id)
      }, newToast.duration)
    }

    return id
  }, [maxToasts])

  const hideToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  const clearAllToasts = useCallback(() => {
    setToasts([])
  }, [])

  const success = useCallback((message: string, title?: string) => {
    return showToast({ type: 'success', title: title || '성공', message })
  }, [showToast])

  const error = useCallback((message: string, title?: string) => {
    return showToast({ type: 'error', title: title || '오류', message })
  }, [showToast])

  const info = useCallback((message: string, title?: string) => {
    return showToast({ type: 'info', title: title || '정보', message })
  }, [showToast])

  const warning = useCallback((message: string, title?: string) => {
    return showToast({ type: 'warning', title: title || '경고', message })
  }, [showToast])

  const contextValue: ToastContextType = {
    toasts,
    showToast,
    hideToast,
    clearAllToasts,
    success,
    error,
    info,
    warning
  }

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <ToastContainer>
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            toast={toast}
            onHide={() => hideToast(toast.id)}
          />
        ))}
      </ToastContainer>
    </ToastContext.Provider>
  )
}


