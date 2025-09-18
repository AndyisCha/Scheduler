# Unified Schedule Generator Runbook

## Overview

This runbook outlines the step-by-step process for generating unified weekly schedules that combine MWF (Monday/Wednesday/Friday) and TT (Tuesday/Thursday) schedules using a shared FairnessLedger to ensure balanced teacher workload across the entire week.

## Input Parameters

```typescript
interface UnifiedGeneratorInput {
  mwfSlotId: string;    // MWF slot configuration ID
  ttSlotId: string;     // TT slot configuration ID
  options?: {
    enableMicroSwaps?: boolean;    // Enable post-processing optimization
    maxSwapAttempts?: number;      // Limit optimization iterations
    cacheResults?: boolean;        // Persist results to cache
  };
}
```

## Step-by-Step Process

### Step 1: Load Slot Configurations

**Objective**: Retrieve and validate both MWF and TT slot configurations from the database.

**Process**:
1. **Load MWF Slot**:
   - Query `slots` table where `id = mwfSlotId` and `dayGroup = "MWF"`
   - Validate slot exists and is properly configured
   - Extract: teacher pools, constraints, global options, round class counts

2. **Load TT Slot**:
   - Query `slots` table where `id = ttSlotId` and `dayGroup = "TT"`
   - Validate slot exists and is properly configured
   - Extract: teacher pools, constraints, global options, round class counts

3. **Validation Checks**:
   - Both slots must have non-empty teacher pools
   - Round class counts must be positive for at least one round
   - Teacher constraint schemas must be compatible

**Error Handling**:
- If slot not found: Return error with slot ID
- If slot malformed: Return validation error with details
- If incompatible configurations: Return configuration conflict error

**Output**: `{ mwfSlot: SchedulerSlot, ttSlot: TTSchedulerSlot }`

### Step 2: Build FairnessLedger

**Objective**: Initialize shared fairness tracking across all teachers from both slots.

**Process**:
1. **Teacher Pool Merging**:
   - Combine teachers from MWF and TT slots
   - Normalize teacher names (handle duplicates, aliases)
   - Create unified teacher list with deduplication

2. **Initialize Counters**:
   ```typescript
   interface TeacherCounters {
     weekly: {
       HCount: number;    // Total homeroom assignments per week
       KCount: number;    // Total Korean role assignments per week
       FCount: number;    // Total foreign role assignments per week
       totalLoad: number; // Sum of all assignments
     };
     daily: Record<Day, {
       HCount: number;
       KCount: number;
       FCount: number;
     }>;
   }
   ```

3. **Name Normalization**:
   - Handle variations: "김선생" vs "김 선생" vs "Kim Teacher"
   - Maintain mapping of normalized names to original names
   - Log any name conflicts for manual review

**Error Handling**:
- If teacher name conflicts detected: Log warning, use first occurrence
- If no teachers found: Return error "No teachers available"

**Output**: `FairnessLedger` instance with zeroed counters for all teachers

### Step 3: Generate MWF Schedules

**Objective**: Generate schedules for Monday, Wednesday, Friday using existing MWF engine.

**Process**:
1. **Engine Initialization**:
   - Initialize MWF scheduler with mwfSlot
   - Inject shared FairnessLedger instance
   - Set day context to "MWF"

2. **Schedule Generation**:
   - Generate Monday schedule (all rounds)
   - Generate Wednesday schedule (all rounds)
   - Generate Friday schedule (all rounds)
   - Each generation updates FairnessLedger counters

3. **Result Collection**:
   - Collect classSummary, teacherSummary, dayGrid for MWF days
   - Collect warnings from MWF generation
   - Track feasibility metrics

**Error Handling**:
- If MWF generation fails: Log error, return partial results
- If critical constraints violated: Return error with details

**Output**: `{ mwfResult: ScheduleResult, mwfWarnings: string[] }`

### Step 4: Generate TT Schedules

**Objective**: Generate schedules for Tuesday, Thursday using TT engine.

**Process**:
1. **Engine Initialization**:
   - Initialize TT scheduler with ttSlot
   - Inject same FairnessLedger instance (now with MWF data)
   - Set day context to "TT"

2. **Schedule Generation**:
   - Generate Tuesday schedule (R1 and R2)
   - Generate Thursday schedule (R1 and R2)
   - Each generation updates FairnessLedger counters

3. **Result Collection**:
   - Collect classSummary, teacherSummary, dayGrid for TT days
   - Collect warnings from TT generation
   - Track feasibility metrics

**Error Handling**:
- If TT generation fails: Log error, return partial results
- If feasibility checks fail: Return warnings, partial schedule

**Output**: `{ ttResult: TTScheduleResult, ttWarnings: string[] }`

### Step 5: Post-Processing

**Objective**: Optimize schedules for better fairness and validate overall feasibility.

#### 5.1 Compute Weekly Fairness Metrics

**Process**:
1. **Calculate Per-Teacher Totals**:
   - Sum H/K/F counts across all days
   - Calculate total weekly load per teacher
   - Identify teachers with extreme workloads

2. **Statistical Analysis**:
   - Calculate mean workload across all teachers
   - Calculate standard deviation of workloads
   - Identify outliers (teachers > 2σ from mean)

3. **Variance Report**:
   ```typescript
   interface WeeklyFairnessReport {
     statistics: {
       meanLoad: number;
       standardDeviation: number;
       minLoad: number;
       maxLoad: number;
       coefficientOfVariation: number;
     };
     outliers: Array<{
       teacher: Teacher;
       load: number;
       deviation: number;
     }>;
     recommendations: string[];
   }
   ```

#### 5.2 Optional Micro-Swaps Optimization

**Objective**: Reduce workload variance through constraint-respecting swaps.

**Process**:
1. **Identify Swap Candidates**:
   - Find teachers with significantly different workloads
   - Identify assignments that could be swapped
   - Ensure swaps respect all constraints

2. **Swap Validation**:
   - Check teacher availability for new assignments
   - Verify role eligibility
   - Ensure no constraint violations

3. **Swap Execution**:
   - Perform swaps that reduce variance
   - Update FairnessLedger counters
   - Limit iterations to prevent infinite loops

**Swap Rules**:
- Only swap within same role type (H↔H, K↔K, F↔F)
- Only swap within same day
- Respect teacher constraints and availability
- Maintain feasibility of both schedules

**Error Handling**:
- If no valid swaps found: Log info, continue
- If swap creates constraint violation: Revert swap
- If max attempts reached: Log warning, continue

**Output**: `{ optimizedSchedules: boolean, swapCount: number, varianceReduction: number }`

### Step 6: Persistence

**Objective**: Save generated schedules and optional cache for future reference.

**Process**:
1. **Database Persistence**:
   - Insert `generated_schedules` rows for MWF slot
   - Insert `generated_schedules` rows for TT slot
   - Link both to same generation batch ID

2. **Optional Cache**:
   - Store unified result in cache with TTL
   - Include metadata: generation timestamp, input parameters
   - Enable quick retrieval for similar requests

3. **Audit Trail**:
   - Log generation parameters and results
   - Store fairness metrics for analysis
   - Track optimization attempts and outcomes

**Database Schema**:
```sql
CREATE TABLE generated_schedules (
  id UUID PRIMARY KEY,
  slot_id VARCHAR NOT NULL,
  day_group VARCHAR NOT NULL,
  generation_timestamp TIMESTAMP NOT NULL,
  schedule_data JSONB NOT NULL,
  fairness_metrics JSONB,
  warnings JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Error Handling**:
- If database write fails: Log error, return results anyway
- If cache write fails: Log warning, continue
- If partial write succeeds: Log info, return partial success

**Output**: `{ persisted: boolean, cacheKey?: string, batchId: string }`

### Step 7: Return Merged Result

**Objective**: Combine all results into unified format for client consumption.

**Process**:
1. **Merge Schedule Data**:
   - Combine classSummary from MWF and TT
   - Combine teacherSummary from MWF and TT
   - Combine dayGrid for all 5 days (Mon-Fri)

2. **Consolidate Warnings**:
   - Merge warnings from MWF and TT generation
   - Add post-processing warnings
   - Deduplicate similar warnings

3. **Generate Feasibility Report**:
   - Analyze overall schedule completeness
   - Report constraint violations
   - Provide recommendations

**Output Structure**:
```typescript
interface UnifiedScheduleResult {
  // Schedule data covering all 5 days
  classSummary: Record<string, Record<Day, Assignment[]>>;
  teacherSummary: Record<Teacher, Record<Day, Assignment[]>>;
  dayGrid: Record<Day, Record<Period, Assignment[]>>;
  
  // Metadata and analysis
  warnings: string[];
  feasibilityReport: FeasibilityReport;
  fairnessMetrics: WeeklyFairnessReport;
  generationInfo: {
    mwfSlotId: string;
    ttSlotId: string;
    generatedAt: Date;
    optimizationApplied: boolean;
  };
}
```

## Feasibility Report Items

### TT F-Capacity Analysis

**Check**: `totalClasses ≤ (numForeignTeachers × 3)`
**Report**:
- Available foreign capacity
- Required foreign capacity
- Shortage/surplus status
- Recommendations for capacity adjustments

### R2 H/K Demand Analysis

**Check**: Demand vs available candidates
**Report**:
- Homeroom demand: `2 × classCount`
- Korean demand: `1 × classCount`
- Available homeroom teachers (after constraints)
- Available Korean teachers (after constraints)
- Bottleneck identification

### Unassigned Slots Analysis

**Check**: Count and categorize unassigned assignments
**Report**:
- Total unassigned slots by role
- Unassigned slots by day and period
- Root cause analysis (capacity, constraints, availability)
- Impact assessment on schedule quality

### Cross-Day Conflicts

**Check**: Teacher availability across MWF and TT
**Report**:
- Teachers with heavy cross-day loads
- Potential schedule conflicts
- Recommendations for load balancing

## Error Handling & Recovery

### Critical Errors (Stop Generation)
- Invalid slot configurations
- No teachers available
- Database connection failures

### Non-Critical Errors (Continue with Warnings)
- Individual assignment failures
- Constraint violations
- Optimization failures
- Cache write failures

### Recovery Strategies
- **Partial Generation**: Return partial results with clear warnings
- **Fallback Options**: Use default configurations for missing data
- **Retry Logic**: Automatic retry for transient failures
- **Manual Override**: Allow manual intervention for complex conflicts

## Performance Considerations

### Expected Runtime
- **Small Scale** (< 10 classes): < 1 second
- **Medium Scale** (10-50 classes): 1-5 seconds
- **Large Scale** (> 50 classes): 5-30 seconds

### Optimization Strategies
- **Parallel Generation**: Generate MWF and TT simultaneously where possible
- **Early Termination**: Stop if critical feasibility checks fail
- **Caching**: Cache intermediate results for repeated requests
- **Batch Processing**: Process multiple requests in batches

### Resource Management
- **Memory**: Monitor FairnessLedger size for large teacher pools
- **CPU**: Limit micro-swap iterations to prevent infinite loops
- **Database**: Use transactions for atomic persistence
- **Network**: Compress large result sets for transmission

## Monitoring & Alerting

### Key Metrics to Track
- Generation success rate
- Average generation time
- Fairness variance reduction
- Unassigned slot percentage
- Constraint violation frequency

### Alert Thresholds
- Generation time > 30 seconds
- Unassigned slots > 10%
- Fairness variance > 50% of mean
- Critical errors > 5% of requests

### Logging Requirements
- All generation attempts (success/failure)
- Performance metrics
- Constraint violations
- Optimization outcomes
- User interactions

---

This runbook provides a comprehensive guide for implementing the unified schedule generator while ensuring robust error handling, performance optimization, and detailed reporting of feasibility and fairness metrics.


