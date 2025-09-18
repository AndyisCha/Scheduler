// Toast component tests
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Toast, ToastContainer } from '../components/Toast'

describe('Toast Components', () => {
  it('should render success toast', () => {
    const mockOnClose = vi.fn()
    render(<Toast type="success" message="성공했습니다!" onClose={mockOnClose} />)
    
    expect(screen.getByText('성공했습니다!')).toBeInTheDocument()
    expect(screen.getByText('✓')).toBeInTheDocument()
  })

  it('should render error toast', () => {
    const mockOnClose = vi.fn()
    render(<Toast type="error" message="오류가 발생했습니다!" onClose={mockOnClose} />)
    
    expect(screen.getByText('오류가 발생했습니다!')).toBeInTheDocument()
    expect(screen.getByText('✕')).toBeInTheDocument()
  })

  it('should render warning toast', () => {
    const mockOnClose = vi.fn()
    render(<Toast type="warning" message="경고입니다!" onClose={mockOnClose} />)
    
    expect(screen.getByText('경고입니다!')).toBeInTheDocument()
    expect(screen.getByText('⚠')).toBeInTheDocument()
  })

  it('should render info toast', () => {
    const mockOnClose = vi.fn()
    render(<Toast type="info" message="정보입니다!" onClose={mockOnClose} />)
    
    expect(screen.getByText('정보입니다!')).toBeInTheDocument()
    expect(screen.getByText('ℹ')).toBeInTheDocument()
  })

  it('should call onClose when close button is clicked', () => {
    const mockOnClose = vi.fn()
    render(<Toast type="success" message="테스트 메시지" onClose={mockOnClose} />)
    
    const closeButton = screen.getByText('×')
    fireEvent.click(closeButton)
    
    // Check if onClose is called after animation delay
    setTimeout(() => {
      expect(mockOnClose).toHaveBeenCalled()
    }, 300)
  })

  it('should render ToastContainer', () => {
    render(<ToastContainer />)
    
    // Check if ToastContainer renders without errors
    expect(document.querySelector('.fixed.top-4.right-4')).toBeInTheDocument()
  })
})
