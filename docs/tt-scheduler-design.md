# TT Scheduler Engine Design Note

## Overview

This document outlines the design for a TT-specific scheduler engine that operates alongside the existing MWF scheduler. The TT engine handles Tuesday/Thursday scheduling with distinct role patterns and constraints while sharing fairness logic through a common FairnessLedger.

## Core Architecture

### Input Interface

```typescript
interface TTSchedulerInput {
  ttSlot: TTSchedulerSlot;        // Same schema as mwfSlot but for TT-specific data
  fairnessLedger: FairnessLedger; // Mutable counters shared with MWF scheduler
  targetDay: "화" | "목";          // Specific day to generate schedule for
}
```

### Output Interface

```typescript
interface TTScheduleResult {
  classSummary: Record<string, Record<"화" | "목", Assignment[]>>;
  teacherSummary: Record<Teacher, Record<"화" | "목", Assignment[]>>;
  dayGrid: Record<"화" | "목", Record<Period_TT, Assignment[]>>;
  warnings: string[];
  feasibilityReport: {
    r1Feasible: boolean;
    r2Feasible: boolean;
    bottlenecks: string[];
  };
}
```

## Fixed Round Structure

### Round 1 (R1): Periods [1, 2, 3]

**Role Multiset**: `{H: 1, K: 1, F: 1}` per class
- **Time Range**: 15:20–17:45
- **Constraint**: Each class receives exactly 3 assignments
- **Staggering Logic**: Phase by class index and foreign capacity
- **Feasibility Check**: `totalClasses ≤ (numForeignTeachers × 3)`

**Assignment Pattern**:
```
Class 1: Period 1→H, Period 2→K, Period 3→F
Class 2: Period 1→K, Period 2→F, Period 3→H
Class 3: Period 1→F, Period 2→H, Period 3→K
... (staggered to distribute foreign demand)
```

### Round 2 (R2): Periods [4, 5, 6]

**Role Multiset**: `{H: 2, K: 1}` per class, F forbidden
- **Time Range**: 18:10–20:50
- **Constraint**: Each class receives exactly 3 assignments
- **Staggering Logic**: Phase by class index and Korean capacity
- **Feasibility Check**: `demand(H) = 2×classCount`, `demand(K) = 1×classCount`

**Assignment Pattern**:
```
Class 1: Period 4→H, Period 5→H, Period 6→K
Class 2: Period 4→H, Period 5→K, Period 6→H
Class 3: Period 4→K, Period 5→H, Period 6→H
... (staggered to distribute Korean demand)
```

## Staggering Algorithms

### R1 Staggering (Foreign Capacity-Based)

```typescript
interface R1StaggeringLogic {
  // Calculate phase offset based on foreign capacity
  calculatePhase(classIndex: number, foreignCapacity: number): number;
  
  // Distribute foreign assignments to avoid capacity overflow
  distributeForeignAssignments(classes: string[], foreignPool: Teacher[]): AssignmentPlan;
  
  // Ensure no period exceeds foreign capacity
  validateForeignDistribution(plan: AssignmentPlan): ValidationResult;
}
```

**Algorithm**:
1. Calculate phase: `phase = Math.floor(classIndex / foreignCapacity)`
2. Rotate role pattern: `pattern[phase % 3]` determines starting role
3. Validate: For each period, count F assignments ≤ foreignCapacity
4. Adjust: If overflow detected, shift assignments to adjacent periods

### R2 Staggering (Korean Capacity-Based)

```typescript
interface R2StaggeringLogic {
  // Calculate phase offset based on Korean capacity
  calculatePhase(classIndex: number, koreanCapacity: number): number;
  
  // Distribute Korean assignments across periods 4-6
  distributeKoreanAssignments(classes: string[], koreanPool: Teacher[]): AssignmentPlan;
  
  // Ensure balanced Korean distribution
  validateKoreanDistribution(plan: AssignmentPlan): ValidationResult;
}
```

**Algorithm**:
1. Calculate phase: `phase = Math.floor(classIndex / koreanCapacity)`
2. Rotate Korean position: `koreanPeriod = (4 + phase) % 6 + 1`
3. Fill remaining periods with homeroom assignments
4. Validate: Ensure Korean assignments are evenly distributed

## Candidate Selection Logic

### Filtering Pipeline

```typescript
interface CandidateSelectionPipeline {
  // Step 1: Role eligibility filter
  filterByRoleEligibility(candidates: Teacher[], role: Role, slot: TTSchedulerSlot): Teacher[];
  
  // Step 2: Constraint filter
  filterByConstraints(candidates: Teacher[], day: Day, period: Period_TT, constraints: Record<Teacher, TeacherConstraints>): Teacher[];
  
  // Step 3: Availability filter
  filterByAvailability(candidates: Teacher[], day: Day, period: Period_TT, busyMatrix: BusyMatrix): Teacher[];
  
  // Step 4: Fairness sorting
  sortByFairness(candidates: Teacher[], role: Role, ledger: FairnessLedger): Teacher[];
}
```

### Sorting Criteria

**Primary Sort**: Lowest total count for the specific role
**Secondary Sort**: Lowest total count across all roles
**Tertiary Sort**: Lexicographic order (for deterministic results)

```typescript
interface FairnessComparator {
  compare(teacherA: Teacher, teacherB: Teacher, role: Role, ledger: FairnessLedger): number;
  
  // Implementation:
  // 1. Compare ledger.getCount(teacherA, role) vs ledger.getCount(teacherB, role)
  // 2. If equal, compare ledger.getTotalLoad(teacherA) vs ledger.getTotalLoad(teacherB)
  // 3. If still equal, compare teacherA.localeCompare(teacherB, "ko")
}
```

## Exam Management

### Exam Insertion Logic

```typescript
interface TTExamManager {
  // Insert exams between periods 3 and 4
  insertExams(classes: string[], homerooms: Record<string, Teacher>, day: "화" | "목"): ExamAssignment[];
  
  // Resolve proctor conflicts
  resolveProctorConflicts(exams: ExamAssignment[]): ExamAssignment[];
  
  // Fallback hierarchy: homeroom → other homeroom → Korean pool → unassigned
  findFallbackProctor(classId: string, conflictedTeacher: Teacher, slot: TTSchedulerSlot): Teacher | null;
}
```

### Proctor Conflict Resolution

**Conflict Detection**: Same teacher assigned as homeroom to multiple classes in same round
**Resolution Hierarchy**:
1. **Primary**: Original homeroom teacher (if no conflict)
2. **Fallback 1**: Other available homeroom teacher
3. **Fallback 2**: Korean pool teacher
4. **Final**: Unassigned with warning

**Warning Generation**:
- `"EXAM CONFLICT: Class ${classId} exam unassigned - no available proctors"`

## Integration with FairnessLedger

### Counter Updates

```typescript
interface FairnessLedgerIntegration {
  // Update counters after each assignment
  updateAfterAssignment(teacher: Teacher, role: Role, dayGroup: "TT"): void;
  
  // Weekly reset (called at start of new week)
  resetWeeklyCounters(): void;
  
  // Cross-day balance checking
  checkWeeklyBalance(): BalanceReport;
}
```

### Shared State Management

- **Counters**: Updated immediately after each assignment
- **Locks**: Prevent race conditions during parallel MWF/TT generation
- **Validation**: Ensure weekly totals don't exceed reasonable limits

## Test Scenarios

### Scenario 1: Low Foreign Capacity

**Setup**:
- TT.R1 with 6 classes
- Only 1 foreign teacher available
- Foreign capacity: 1 × 3 = 3 slots
- Demand: 6 classes × 1 foreign = 6 slots

**Expected Behavior**:
- Feasibility check fails: `6 > 3`
- Warning: `"TT.R1 INFEASIBLE: Need 2 more foreign teachers"`
- Partial schedule generated with 3 classes assigned
- 3 classes marked as "(미배정)" for foreign role

**Test Assertions**:
- `result.feasibilityReport.r1Feasible === false`
- `result.warnings.includes("foreign teacher shortage")`
- Foreign assignments ≤ 3
- Unassigned foreign slots = 3

### Scenario 2: Heavy Unavailability

**Setup**:
- Teacher "김선생" unavailable: ["화|1", "화|2", "화|3", "화|4", "화|5", "화|6"]
- Teacher "이선생" unavailable: ["화|4", "화|5", "화|6"]
- 4 classes requiring homeroom assignments
- Limited homeroom pool: ["김선생", "이선생", "박선생"]

**Expected Behavior**:
- 김선생 completely unavailable on Tuesday
- 이선생 unavailable for R2 (periods 4-6)
- Heavy load on 박선생 for Tuesday assignments
- Warnings about teacher unavailability

**Test Assertions**:
- 김선생 has 0 Tuesday assignments
- 이선생 has 0 R2 assignments but may have R1 assignments
- 박선생 has maximum load on Tuesday
- `result.warnings.includes("teacher unavailability")`

### Scenario 3: MaxHomerooms Limits

**Setup**:
- Teacher "김선생": `maxHomerooms: 1`
- Teacher "이선생": `maxHomerooms: 2`
- 6 classes requiring homeroom assignments
- Homeroom pool: ["김선생", "이선생", "박선생"]

**Expected Behavior**:
- 김선생 assigned to exactly 1 homeroom class
- 이선생 assigned to exactly 2 homeroom classes
- 박선생 assigned to remaining 3 homeroom classes
- Fair distribution respecting individual limits

**Test Assertions**:
- 김선생 homeroom count ≤ 1
- 이선생 homeroom count ≤ 2
- Total homeroom assignments = 6
- No warnings about homeroom limit violations

## Error Handling & Edge Cases

### Insufficient Teacher Pool

**Detection**: Feasibility checks fail
**Response**: Generate partial schedule with warnings
**Recovery**: Suggest additional teachers or reduced class count

### Constraint Violations

**Detection**: No valid candidates for assignment
**Response**: Mark as "(미배정)" with detailed warning
**Recovery**: Highlight constraint conflicts in UI

### Fairness Imbalance

**Detection**: Weekly counters show extreme imbalance
**Response**: Log warnings for manual review
**Recovery**: Suggest schedule adjustments or teacher reallocation

## Performance Considerations

### Algorithm Complexity

- **R1 Generation**: O(classes × periods × teachers)
- **R2 Generation**: O(classes × periods × teachers)
- **Exam Insertion**: O(classes × teachers)
- **Overall**: O(n²) where n = max(classes, teachers)

### Optimization Strategies

- **Early Termination**: Stop if feasibility checks fail
- **Caching**: Reuse candidate lists for similar roles
- **Batch Updates**: Update FairnessLedger in batches
- **Parallel Processing**: Generate R1 and R2 simultaneously

## Validation & Quality Assurance

### Schedule Validation

```typescript
interface ScheduleValidator {
  validateRoleDistribution(result: TTScheduleResult): ValidationResult;
  validateConstraintCompliance(result: TTScheduleResult, slot: TTSchedulerSlot): ValidationResult;
  validateFairnessBalance(result: TTScheduleResult, ledger: FairnessLedger): ValidationResult;
  validateExamIntegrity(result: TTScheduleResult): ValidationResult;
}
```

### Quality Metrics

- **Completeness**: Percentage of assignments successfully made
- **Fairness**: Standard deviation of teacher workload
- **Constraint Compliance**: Percentage of constraints satisfied
- **Efficiency**: Time taken to generate schedule

---

This design provides a comprehensive framework for implementing the TT scheduler engine while maintaining consistency with the existing MWF scheduler and ensuring robust handling of various edge cases and constraints.


