// Test for TT components
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TTWarningsPanel } from '../components/TTWarningsPanel'
import { TTFeasibilityCards } from '../components/TTFeasibilityCards'
import { TTFairnessSummary } from '../components/TTFairnessSummary'

describe('TT Components', () => {
  it('should render TTWarningsPanel with warnings', () => {
    const warnings = [
      '[화 1] R1C1 H 배정 실패',
      '[목 4] R2C2 K 배정 실패',
      'TT.R1 INFEASIBLE: Foreign capacity insufficient'
    ]
    
    render(<TTWarningsPanel warnings={warnings} />)
    
    expect(screen.getByText('경고 및 알림')).toBeInTheDocument()
    expect(screen.getByText('3개')).toBeInTheDocument()
    expect(screen.getByText('[화 1] R1C1 H 배정 실패')).toBeInTheDocument()
  })

  it('should render TTFeasibilityCards with feasibility data', () => {
    const feasibility = {
      r1ForeignOk: false,
      r1ForeignDemand: 8,
      r1ForeignCapacity: 6,
      r2HNeeded: 6,
      r2KNeeded: 3
    }
    
    render(<TTFeasibilityCards feasibility={feasibility} />)
    
    expect(screen.getByText('TT 실행 가능성 분석')).toBeInTheDocument()
    expect(screen.getByText('TT.R1 외국인 용량')).toBeInTheDocument()
    expect(screen.getByText('수요:')).toBeInTheDocument()
    expect(screen.getByText('8')).toBeInTheDocument()
    expect(screen.getByText('용량:')).toBeInTheDocument()
    
    // Check for specific capacity value (6) in the capacity field
    const capacityElements = screen.getAllByText('6')
    expect(capacityElements.length).toBeGreaterThan(0)
  })

  it('should render TTFairnessSummary with fairness data', () => {
    const fairness = {
      perTeacher: {
        '김선생': { H: 3, K: 2, F: 1, total: 6 },
        '이선생': { H: 2, K: 3, F: 1, total: 6 },
        '박선생': { H: 3, K: 1, F: 2, total: 6 }
      },
      deviation: { H: 1, K: 2, F: 1, total: 0 }
    }
    
    render(<TTFairnessSummary fairness={fairness} />)
    
    expect(screen.getByText('주간 공정성 요약')).toBeInTheDocument()
    expect(screen.getByText('편차 요약')).toBeInTheDocument()
    expect(screen.getByText('교사별 배정 현황')).toBeInTheDocument()
    expect(screen.getByText('김선생')).toBeInTheDocument()
    expect(screen.getByText('이선생')).toBeInTheDocument()
    expect(screen.getByText('박선생')).toBeInTheDocument()
  })
})
