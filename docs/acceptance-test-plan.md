# Acceptance Test Plan for Unified Schedule Generator

## Overview

This document outlines comprehensive acceptance tests for the unified schedule generator, covering feasibility scenarios, constraint validation, fairness optimization, and error handling across various edge cases.

## Test Environment Setup

### Prerequisites
- Database with RLS policies enabled
- Test user with ADMIN role
- Clean test data environment
- Both MWF and TT slot configurations available

### Test Data Templates

#### Base Teacher Pool
```typescript
const baseTeachers = {
  homeroomKoreanPool: [
    "김선생", "이선생", "박선생", "최선생", "정선생"
  ],
  foreignPool: [
    "John", "Sarah", "Mike"
  ]
};
```

#### Base Constraints
```typescript
const baseConstraints = {
  "김선생": { maxHomerooms: 2 },
  "이선생": { maxHomerooms: 1 },
  "박선생": { maxHomerooms: 3 },
  "최선생": { maxHomerooms: 2 },
  "정선생": { maxHomerooms: 1 }
};
```

---

## Scenario A: Optimal Feasibility - No Unassignments

### Test Objective
Verify successful schedule generation when all constraints are satisfied and capacity is sufficient.

### Input Template
```typescript
const scenarioA = {
  mwfSlot: {
    teachers: {
      homeroomKoreanPool: ["김선생", "이선생", "박선생"],
      foreignPool: ["John", "Sarah"],
      constraints: {
        "김선생": { maxHomerooms: 2 },
        "이선생": { maxHomerooms: 1 },
        "박선생": { maxHomerooms: 2 }
      }
    },
    globalOptions: {
      roundClassCounts: { 1: 2, 2: 2, 3: 2, 4: 2 }
    }
  },
  ttSlot: {
    teachers: {
      homeroomKoreanPool: ["김선생", "이선생", "박선생"],
      foreignPool: ["John"], // F=1
      constraints: {
        "김선생": { maxHomerooms: 2 },
        "이선생": { maxHomerooms: 1 },
        "박선생": { maxHomerooms: 2 }
      }
    },
    globalOptions: {
      roundClassCounts: { 1: 3, 2: 3 } // TT.R1 classes=3
    }
  },
  options: {
    includeExams: true,
    fairnessMode: "balanced",
    enableMicroSwaps: true
  }
};
```

### Expected Outcomes
- ✅ **Generation Status**: Success
- ✅ **Unassigned Slots**: 0
- ✅ **TT.R1 Feasibility**: `3 classes ≤ (1 foreign × 3) = 3` ✓
- ✅ **TT.R2 Feasibility**: H demand=6, K demand=3, both satisfied
- ✅ **Warnings**: None or informational only
- ✅ **Fairness Metrics**: All teachers within reasonable variance
- ✅ **Schedule Completeness**: All classes have full assignments
- ✅ **Exam Assignments**: All exams properly assigned with homeroom proctors

### Validation Points
- **MWF Schedule**: All 4 rounds (8 classes) fully assigned
- **TT Schedule**: R1 (3 classes) and R2 (3 classes) fully assigned
- **Foreign Utilization**: John assigned to exactly 3 TT.R1 slots
- **Homeroom Distribution**: Respects maxHomerooms constraints
- **Weekly Totals**: Balanced workload across all teachers

---

## Scenario B: Foreign Capacity Shortage - Infeasible TT.R1

### Test Objective
Verify proper handling when foreign teacher capacity is insufficient for TT.R1 demand.

### Input Template
```typescript
const scenarioB = {
  mwfSlot: {
    // Same as Scenario A
  },
  ttSlot: {
    teachers: {
      homeroomKoreanPool: ["김선생", "이선생", "박선생"],
      foreignPool: ["John"], // F=1
      constraints: {
        "김선생": { maxHomerooms: 2 },
        "이선생": { maxHomerooms: 1 },
        "박선생": { maxHomerooms: 2 }
      }
    },
    globalOptions: {
      roundClassCounts: { 1: 4, 2: 3 } // TT.R1 classes=4 (INFEASIBLE)
    }
  },
  options: {
    includeExams: true,
    fairnessMode: "F-priority",
    enableMicroSwaps: false
  }
};
```

### Expected Outcomes
- ⚠️ **Generation Status**: Partial success with warnings
- 🔴 **Unassigned Slots**: 1 foreign assignment in TT.R1
- ❌ **TT.R1 Feasibility**: `4 classes > (1 foreign × 3) = 3` ✗
- ✅ **TT.R2 Feasibility**: H demand=6, K demand=3, both satisfied
- 🔴 **Critical Warnings**: 
  - "TT.R1 INFEASIBLE: Foreign capacity insufficient (3/4 slots)"
  - "TT.R1 Class TT1C4: Foreign role unassigned - no available teachers"
- ⚠️ **Recommendation Warnings**:
  - "Consider adding 1 more foreign teacher for TT.R1"
  - "Consider reducing TT.R1 class count to 3"
- ✅ **Partial Schedule**: 3/4 TT.R1 classes fully assigned
- ✅ **Other Assignments**: All H/K assignments successful

### Validation Points
- **Feasibility Report**: Shows TT.R1 as infeasible
- **Unassigned Tracking**: Exactly 1 foreign slot marked as "(미배정)"
- **Fallback Behavior**: System continues generation for feasible parts
- **Warning Severity**: Critical warnings for capacity issues
- **Policy Compliance**: Respects F-priority mode (tries to maximize foreign assignments)

---

## Scenario C: Constraint Violation - MaxHomerooms Exceeded

### Test Objective
Verify validation catches constraint violations before generation and prevents invalid configurations.

### Input Template
```typescript
const scenarioC = {
  mwfSlot: {
    teachers: {
      homeroomKoreanPool: ["김선생", "이선생", "박선생"],
      foreignPool: ["John", "Sarah"],
      constraints: {
        "김선생": { maxHomerooms: 2 },
        "이선생": { maxHomerooms: 1 }, // LIMIT: 1 homeroom
        "박선생": { maxHomerooms: 2 }
      }
    },
    fixedHomerooms: {
      "이선생": "R1C1", // First homeroom assignment
      "이선생": "R2C1"  // VIOLATION: Second assignment exceeds limit
    },
    globalOptions: {
      roundClassCounts: { 1: 2, 2: 2, 3: 2, 4: 2 }
    }
  },
  ttSlot: {
    // Same as Scenario A
  },
  options: {
    includeExams: true,
    fairnessMode: "balanced"
  }
};
```

### Expected Outcomes
- ❌ **Validation Status**: Pre-generation validation failure
- 🔴 **Error Type**: Constraint validation error
- 🔴 **Error Message**: 
  - "Teacher 이선생 assigned to multiple homerooms (R1C1, R2C1) but maxHomerooms=1"
  - "Fixed homeroom assignments exceed teacher constraints"
- ❌ **Generation Status**: Not attempted
- ❌ **Database Save**: No schedules saved
- ✅ **UI Feedback**: Clear error message with specific violations
- ✅ **Recovery Options**: "Fix Constraints" button to edit configuration

### Validation Points
- **Pre-validation**: Constraint check runs before generation
- **Error Specificity**: Exact teacher and constraint violation identified
- **Data Integrity**: No partial or invalid data saved
- **User Guidance**: Clear instructions for fixing violations
- **Constraint Enforcement**: System prevents invalid configurations

---

## Scenario D: Korean Pool Shortage - TT.R2 K Unassignments

### Test Objective
Verify proper handling when Korean teachers are unavailable for TT.R2 assignments.

### Input Template
```typescript
const scenarioD = {
  mwfSlot: {
    // Same as Scenario A
  },
  ttSlot: {
    teachers: {
      homeroomKoreanPool: ["김선생", "이선생", "박선생"],
      foreignPool: ["John", "Sarah"],
      constraints: {
        "김선생": { maxHomerooms: 2 },
        "이선생": { 
          maxHomerooms: 1,
          unavailable: new Set(["화|4", "화|5", "화|6", "목|4", "목|5", "목|6"]) // Heavy TT.R2 unavailability
        },
        "박선생": { maxHomerooms: 2 }
      }
    },
    globalOptions: {
      roundClassCounts: { 1: 3, 2: 3 } // TT.R2 classes=3, K demand=3
    }
  },
  options: {
    includeExams: true,
    fairnessMode: "H-priority",
    enableMicroSwaps: false
  }
};
```

### Expected Outcomes
- ⚠️ **Generation Status**: Partial success with warnings
- 🔴 **Unassigned Slots**: 2-3 Korean assignments in TT.R2
- ✅ **TT.R1 Feasibility**: Satisfied (foreign capacity sufficient)
- ❌ **TT.R2 Feasibility**: K demand=3, available K=1-2 (김선생, 박선생 only)
- 🔴 **Critical Warnings**:
  - "TT.R2 Korean capacity insufficient: need 3, available 2"
  - "Teacher 이선생 unavailable for all TT.R2 periods"
- 🟡 **Assignment Warnings**:
  - "TT.R2 Class TT2C2: Korean role unassigned - no available teachers"
  - "TT.R2 Class TT2C3: Korean role unassigned - no available teachers"
- ✅ **Homeroom Assignments**: All H assignments successful (H-priority mode)
- ⚠️ **Workload Imbalance**: Heavy load on available Korean teachers

### Validation Points
- **Capacity Analysis**: Correctly identifies Korean teacher shortage
- **Unavailability Handling**: Properly excludes unavailable teachers
- **Priority Mode**: Respects H-priority (homerooms assigned first)
- **Warning Accuracy**: Specific classes and periods identified
- **Fallback Behavior**: Continues generation for feasible assignments

---

## Scenario E: Fairness Optimization - Micro-Swaps Success

### Test Objective
Verify micro-swaps optimization reduces workload variance and improves fairness metrics.

### Input Template
```typescript
const scenarioE = {
  mwfSlot: {
    teachers: {
      homeroomKoreanPool: ["김선생", "이선생", "박선생", "최선생"],
      foreignPool: ["John", "Sarah", "Mike"],
      constraints: {
        "김선생": { maxHomerooms: 3 },
        "이선생": { maxHomerooms: 2 },
        "박선생": { maxHomerooms: 2 },
        "최선생": { maxHomerooms: 1 }
      }
    },
    globalOptions: {
      roundClassCounts: { 1: 3, 2: 3, 3: 3, 4: 3 }
    }
  },
  ttSlot: {
    teachers: {
      homeroomKoreanPool: ["김선생", "이선생", "박선생", "최선생"],
      foreignPool: ["John", "Sarah"],
      constraints: {
        "김선생": { maxHomerooms: 3 },
        "이선생": { maxHomerooms: 2 },
        "박선생": { maxHomerooms: 2 },
        "최선생": { maxHomerooms: 1 }
      }
    },
    globalOptions: {
      roundClassCounts: { 1: 3, 2: 3 }
    }
  },
  options: {
    includeExams: true,
    fairnessMode: "balanced",
    enableMicroSwaps: true,
    maxSwapAttempts: 10
  }
};
```

### Expected Outcomes
- ✅ **Generation Status**: Success with optimization
- ✅ **Pre-Optimization Variance**: High (e.g., σ = 2.5)
- ✅ **Post-Optimization Variance**: Low (σ ≤ 1.0)
- ✅ **Micro-Swaps Applied**: 3-5 successful swaps
- ✅ **Fairness Metrics**:
  - Mean workload: ~12 assignments
  - Standard deviation: ≤ 1.0
  - Coefficient of variation: ≤ 8%
  - Max-min gap: ≤ 3 assignments
- ✅ **Optimization Warnings**:
  - "Micro-swaps applied: 4 swaps reduced variance by 60%"
  - "Workload balance improved: σ reduced from 2.5 to 0.8"
- ✅ **Constraint Preservation**: All swaps respect original constraints
- ✅ **Schedule Integrity**: All assignments remain valid

### Validation Points
- **Variance Reduction**: Significant improvement in fairness metrics
- **Swap Validity**: All swaps respect role, day, and constraint requirements
- **Convergence**: Optimization reaches stable state
- **Performance**: Swaps complete within reasonable time
- **Data Consistency**: Final schedule maintains all original assignments

---

## Test Execution Matrix

### Test Sequence
1. **Setup**: Initialize test environment and data
2. **Scenario A**: Verify optimal case functionality
3. **Scenario B**: Test foreign capacity handling
4. **Scenario C**: Validate constraint enforcement
5. **Scenario D**: Test Korean availability handling
6. **Scenario E**: Verify optimization effectiveness

### Success Criteria
- **Functional**: All scenarios produce expected outcomes
- **Performance**: Generation completes within 30 seconds
- **Security**: RLS policies enforced correctly
- **Data Integrity**: No corruption or invalid data saved
- **User Experience**: Clear feedback and error messages

### Regression Testing
- Re-run all scenarios after code changes
- Verify no degradation in working scenarios
- Confirm error handling remains robust
- Validate performance maintains acceptable levels

---

## Test Data Cleanup

### Post-Test Actions
- Remove all test-generated schedules
- Clean up test slot configurations
- Reset database constraints
- Clear application caches

### Data Validation
- Verify no test data remains in production
- Confirm database integrity
- Check for orphaned references
- Validate RLS policy effectiveness

---

This acceptance test plan provides comprehensive coverage of the unified schedule generator's functionality, edge cases, and optimization features while ensuring robust error handling and data integrity.


