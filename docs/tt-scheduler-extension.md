# TT Scheduler Extension Specification

## Overview

This document outlines the specification for extending the weekly scheduler to support TT (Tuesday/Thursday) days alongside the existing MWF (Monday/Wednesday/Friday) system. The extension will maintain backward compatibility while providing a unified scheduling experience.

## 1. Type System Extensions

### 1.1 Day Group Types

```typescript
type DayGroup = "MWF" | "TT";
```

### 1.2 Extended Day Types

```typescript
type Day = "월" | "화" | "수" | "목" | "금";
```

### 1.3 TT Period Configuration

```typescript
type Period_TT = 1 | 2 | 3 | 4 | 5 | 6;

const PERIOD_TIMES_TT: Record<Period_TT, string> = {
  1: "15:20–16:05",
  2: "16:10–16:55", 
  3: "17:00–17:45",
  4: "18:10–19:00",
  5: "19:05–19:55",
  6: "20:00–20:50"
};

const EXAM_TIME_TT = "17:50–18:10"; // Between periods 3 and 4
```

### 1.4 Unified Period Types

```typescript
type Period = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8; // MWF periods
type Period_TT = 1 | 2 | 3 | 4 | 5 | 6;     // TT periods
```

## 2. Role Patterns

### 2.1 TT Round Configurations

#### TT.R1 (Tuesday Round 1)
- **Daily Pattern**: `[H, K, F]` (order agnostic)
- **Periods**: 1, 2, 3 (15:20–17:45)
- **Constraints**: Each class gets exactly 3 slots per day
- **Role Distribution**: 1 Homeroom, 1 Korean, 1 Foreign per class per day

#### TT.R2 (Thursday Round 2) 
- **Daily Pattern**: `[H, H, K]`
- **Periods**: 4, 5, 6 (18:10–20:50)
- **Constraints**: F (Foreign) role is forbidden for periods 4–6
- **Role Distribution**: 2 Homeroom, 1 Korean per class per day

### 2.2 Role Pattern Constants

```typescript
const TT_ROLE_PATTERNS: Record<1 | 2, Role[]> = {
  1: ["H", "K", "F"], // TT.R1: 3 roles distributed across 3 periods
  2: ["H", "H", "K"]  // TT.R2: 2H + 1K, F forbidden
};

const TT_PERIOD_MAPPINGS: Record<1 | 2, Period_TT[]> = {
  1: [1, 2, 3], // TT.R1 uses periods 1-3
  2: [4, 5, 6]  // TT.R2 uses periods 4-6
};
```

## 3. Slot Selection Model

### 3.1 Option A: Dual Slot Selection (Recommended)

**Implementation**: Choose two slots at generation time - one for MWF, one for TT.

```typescript
interface DualSlotConfig {
  mwfSlot: SchedulerSlot;
  ttSlot: TTSchedulerSlot;
  activeSlotId: {
    mwf: string;
    tt: string;
  };
}

interface TTSchedulerSlot {
  teachers: {
    homeroomKoreanPool: Teacher[];
    foreignPool: Teacher[];
    constraints: Record<Teacher, TeacherConstraints>;
  };
  fixedHomerooms?: FixedHomerooms;
  globalOptions: {
    roundClassCounts: Record<1 | 2, number>; // TT has only 2 rounds
    includeHomeroomsInK?: boolean;
    preferOtherHomeroomsForK?: boolean;
    disallowHomeroomAsKForOwnClass?: boolean;
  };
}
```

**Advantages**:
- Minimal database migration required
- Clear separation of MWF and TT configurations
- Independent teacher pools per day group
- Backward compatibility maintained

**Database Schema**:
```typescript
interface SlotConfig {
  id: string;
  name: string;
  dayGroup: DayGroup;
  slot: SchedulerSlot | TTSchedulerSlot;
  createdAt: Date;
  updatedAt: Date;
}
```

### 3.2 Option B: Unified Slot (Alternative)

```typescript
interface UnifiedSchedulerSlot {
  dayGroups: {
    MWF: SchedulerSlot;
    TT: TTSchedulerSlot;
  };
}
```

**Note**: Option A is recommended for initial implementation to minimize complexity and database changes.

## 4. Fairness Counters

### 4.1 FairnessLedger Interface

```typescript
interface FairnessLedger {
  // Weekly counters per teacher across both MWF and TT
  weeklyCounts: Record<Teacher, {
    HCount: number;  // Total homeroom assignments per week
    KCount: number;  // Total Korean role assignments per week  
    FCount: number;  // Total foreign role assignments per week
    totalLoad: number; // Sum of all assignments
  }>;
  
  // Methods
  incrementCount(teacher: Teacher, role: Role): void;
  getCount(teacher: Teacher, role: Role): number;
  getTotalLoad(teacher: Teacher): number;
  resetWeekly(): void; // Called at start of new week
  getSortedCandidates(role: Role, candidates: Teacher[]): Teacher[];
}
```

### 4.2 Shared Fairness Logic

Both MWF and TT schedulers will:
- Initialize shared FairnessLedger instance
- Use `getSortedCandidates()` for role assignment decisions
- Update counters via `incrementCount()` after each assignment
- Maintain weekly totals across all day groups

## 5. Warnings & Feasibility Checks

### 5.1 TT.R1 Feasibility

```typescript
interface TT_R1_FeasibilityCheck {
  // Constraint: classCount ≤ (numForeign * 3)
  // Explanation: Each foreign teacher can handle up to 3 classes per day
  // (one class per period across 3 periods)
  
  checkFeasibility(slot: TTSchedulerSlot): {
    isFeasible: boolean;
    warnings: string[];
    details: {
      totalClasses: number;
      availableForeignSlots: number; // numForeign * 3
      shortage?: number;
    };
  };
}
```

### 5.2 TT.R2 Feasibility

```typescript
interface TT_R2_FeasibilityCheck {
  // Demand calculations:
  // - Homeroom demand: 2 * classCount (2H per class)
  // - Korean demand: 1 * classCount (1K per class)
  // - Foreign demand: 0 (F forbidden)
  
  checkFeasibility(slot: TTSchedulerSlot): {
    isFeasible: boolean;
    warnings: string[];
    details: {
      homeroomDemand: number;
      homeroomSupply: number;
      koreanDemand: number;
      koreanSupply: number;
      shortages?: {
        homeroom?: number;
        korean?: number;
      };
    };
  };
}
```

### 5.3 Warning Generation

```typescript
interface WarningSystem {
  generateWarnings(mwfResult: ScheduleResult, ttResult: TTScheduleResult): string[];
  
  // Specific warning types:
  // - "TT.R1: Foreign teacher shortage - need X more teachers"
  // - "TT.R2: Homeroom overload - teacher Y assigned X homerooms"
  // - "Weekly fairness: Teacher Z has 80% more load than average"
  // - "Cross-day conflict: Teacher A unavailable on both MWF and TT"
}
```

## 6. Output Format Extensions

### 6.1 Extended ScheduleResult

```typescript
interface UnifiedScheduleResult {
  mwfResult: ScheduleResult;
  ttResult: TTScheduleResult;
  warnings: string[];
  summary: {
    totalClasses: number;
    totalTeachers: number;
    weeklyDistribution: Record<Teacher, {
      mwf: { H: number; K: number; F: number; };
      tt: { H: number; K: number; F: number; };
      total: { H: number; K: number; F: number; };
    }>;
  };
}

interface TTScheduleResult {
  classSummary: Record<string, Record<"화" | "목", Assignment[]>>;
  teacherSummary: Record<Teacher, Record<"화" | "목", Assignment[]>>;
  dayGrid: Record<"화" | "목", Record<Period_TT, Assignment[]>>;
  warnings: string[];
}
```

### 6.2 Exam Handling

```typescript
// TT exams are anchored between periods 3 and 4
interface TTExamAssignment {
  classId: string;
  round: 1 | 2;
  period: 3; // Anchored to period 3 for proximity
  time: "17:50–18:10";
  role: "EXAM";
  teacher: Teacher; // Homeroom teacher
}
```

### 6.3 Extended Assignment Types

```typescript
interface Assignment {
  classId: string;
  round: 1 | 2 | 3 | 4; // MWF rounds + TT rounds
  period: Period | Period_TT;
  time: string;
  role: Role | "EXAM";
  teacher: Teacher | "(미배정)";
  dayGroup: DayGroup; // "MWF" or "TT"
}
```

## 7. Implementation Phases

### Phase 1: Type System & Data Models
- [ ] Extend type definitions for TT support
- [ ] Create TTSchedulerSlot interface
- [ ] Implement FairnessLedger
- [ ] Update database schema for dual slots

### Phase 2: TT Scheduler Engine
- [ ] Implement TT role patterns and constraints
- [ ] Create feasibility checking system
- [ ] Build TT schedule generation logic
- [ ] Integrate with FairnessLedger

### Phase 3: UI Extensions
- [ ] Add TT slot management to SlotManager
- [ ] Extend TeacherEditor for TT constraints
- [ ] Update schedule views to show TT days
- [ ] Add TT-specific metrics and charts

### Phase 4: Integration & Testing
- [ ] Unified schedule generation (MWF + TT)
- [ ] Cross-day conflict detection
- [ ] Comprehensive warning system
- [ ] Export/import functionality for dual slots

## 8. Migration Strategy

### 8.1 Existing Data Compatibility
- Current MWF slots remain unchanged
- New `dayGroup` field added to existing slots (defaults to "MWF")
- Gradual migration path for users to adopt TT functionality

### 8.2 UI Migration Path
1. **Phase 1**: TT functionality hidden behind feature flag
2. **Phase 2**: TT options available but optional
3. **Phase 3**: Full TT integration with unified workflow
4. **Phase 4**: Advanced features (cross-day optimization, etc.)

## 9. Configuration Examples

### 9.1 Sample TT Slot Configuration

```typescript
const sampleTTSlot: TTSchedulerSlot = {
  teachers: {
    homeroomKoreanPool: ["김선생", "이선생", "박선생"],
    foreignPool: ["John", "Sarah", "Mike"],
    constraints: {
      "김선생": {
        unavailable: new Set(["화|4", "목|5"]),
        maxHomerooms: 2
      }
    }
  },
  globalOptions: {
    roundClassCounts: { 1: 4, 2: 3 }, // TT.R1: 4 classes, TT.R2: 3 classes
    includeHomeroomsInK: true,
    preferOtherHomeroomsForK: true
  }
};
```

### 9.2 Expected Output Structure

```typescript
const unifiedResult: UnifiedScheduleResult = {
  mwfResult: { /* existing MWF schedule */ },
  ttResult: {
    classSummary: {
      "TT1C1": {
        "화": [/* TT.R1 assignments for Tuesday */],
        "목": [/* TT.R2 assignments for Thursday */]
      }
    },
    teacherSummary: {
      "김선생": {
        "화": [/* Tuesday assignments */],
        "목": [/* Thursday assignments */]
      }
    },
    dayGrid: {
      "화": {
        1: [/* Period 1 assignments */],
        2: [/* Period 2 assignments */],
        // ... periods 3-6
      },
      "목": {
        // ... similar structure
      }
    },
    warnings: []
  },
  warnings: [
    "TT.R1: All foreign teachers fully utilized",
    "Weekly load: 김선생 has 12 total assignments"
  ]
};
```

## 10. Future Considerations

### 10.1 Advanced Features
- Cross-day teacher optimization
- Dynamic slot selection based on demand
- Integration with external calendar systems
- Advanced reporting and analytics

### 10.2 Performance Considerations
- Efficient algorithm for large teacher pools
- Caching strategies for frequently accessed data
- Background processing for complex schedules

### 10.3 Extensibility
- Framework for additional day groups (e.g., weekend classes)
- Plugin architecture for custom role patterns
- API endpoints for external integrations

---

This specification provides a comprehensive roadmap for extending the scheduler to support TT days while maintaining the existing MWF functionality and ensuring a smooth user experience.


