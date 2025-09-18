# Database Access Plan for Unified Schedule Generator

## Overview

This document outlines the database access strategy for the unified schedule generator, focusing on reusing existing table structures while supporting dual-slot selection and ensuring proper security through Row Level Security (RLS).

## Current Table Structure Analysis

### Existing Tables (Confirmed Reusable)

#### 1. `slots` Table
```sql
-- Current structure (confirmed)
CREATE TABLE slots (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  day_group VARCHAR(3) NOT NULL, -- 'MWF' or 'TT'
  slot_data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  user_id UUID REFERENCES users(id)
);
```

**Reusability**: ✅ **Fully Compatible**
- `day_group` field supports both 'MWF' and 'TT'
- `slot_data` JSONB contains all required configuration
- `user_id` enables proper RLS enforcement

#### 2. `generated_schedules` Table (New)
```sql
-- New table for storing generated schedules
CREATE TABLE generated_schedules (
  id UUID PRIMARY KEY,
  slot_id UUID REFERENCES slots(id),
  day_group VARCHAR(3) NOT NULL, -- 'MWF' or 'TT'
  generation_batch_id UUID, -- Links MWF and TT results
  schedule_data JSONB NOT NULL,
  fairness_metrics JSONB,
  warnings JSONB,
  feasibility_report JSONB,
  generated_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '30 days'),
  user_id UUID REFERENCES users(id)
);
```

## Data Requirements Per Slot

### Slot Configuration Data Structure

```typescript
interface SlotConfigData {
  // From slots.slot_data JSONB
  teachers: {
    homeroomKoreanPool: Teacher[];
    foreignPool: Teacher[];
    constraints: Record<Teacher, TeacherConstraints>;
  };
  fixedHomerooms?: FixedHomerooms;
  globalOptions: GlobalOptions;
}
```

### Data Access Pattern

#### For MWF Slot:
```sql
SELECT 
  id,
  name,
  slot_data->'teachers' as teachers,
  slot_data->'fixedHomerooms' as fixed_homerooms,
  slot_data->'globalOptions' as global_options
FROM slots 
WHERE id = $1 AND day_group = 'MWF';
```

#### For TT Slot:
```sql
SELECT 
  id,
  name,
  slot_data->'teachers' as teachers,
  slot_data->'fixedHomerooms' as fixed_homerooms,
  slot_data->'globalOptions' as global_options
FROM slots 
WHERE id = $1 AND day_group = 'TT';
```

## Index Strategy

### Existing Indexes (Confirmed)
```sql
-- Primary key indexes (automatic)
CREATE UNIQUE INDEX slots_pkey ON slots(id);
CREATE UNIQUE INDEX generated_schedules_pkey ON generated_schedules(id);

-- User-based indexes (for RLS)
CREATE INDEX slots_user_id_idx ON slots(user_id);
CREATE INDEX generated_schedules_user_id_idx ON generated_schedules(user_id);
```

### Additional Required Indexes

#### 1. Composite Index for Slot Lookup
```sql
-- Optimize slot retrieval by user and day_group
CREATE INDEX slots_user_day_group_idx ON slots(user_id, day_group);
```

#### 2. Batch Lookup Index
```sql
-- Enable efficient batch result retrieval
CREATE INDEX generated_schedules_batch_idx ON generated_schedules(generation_batch_id);
```

#### 3. Expiration Index
```sql
-- Support cleanup of expired schedules
CREATE INDEX generated_schedules_expires_idx ON generated_schedules(expires_at);
```

#### 4. JSONB Indexes (Optional Performance)
```sql
-- Index frequently queried JSONB fields
CREATE INDEX slots_teachers_idx ON slots USING GIN ((slot_data->'teachers'));
CREATE INDEX generated_schedules_feasibility_idx ON generated_schedules USING GIN (feasibility_report);
```

## Service Functions

### 1. `getSlotConfig(slotId: string, dayGroup: 'MWF' | 'TT')`

**Purpose**: Retrieve and validate slot configuration

**Implementation Strategy**:
```sql
-- Function signature
CREATE OR REPLACE FUNCTION get_slot_config(
  p_slot_id UUID,
  p_day_group VARCHAR(3)
) RETURNS TABLE (
  id UUID,
  name VARCHAR(255),
  teachers JSONB,
  fixed_homerooms JSONB,
  global_options JSONB,
  user_id UUID
) 
SECURITY DEFINER
SET search_path = public
```

**Security Considerations**:
- Uses `SECURITY DEFINER` to run with elevated privileges
- RLS policies automatically filter by `user_id`
- Validates `day_group` parameter

**Error Handling**:
- Slot not found: Return empty result
- Wrong day group: Return validation error
- Access denied: RLS automatically blocks unauthorized access

### 2. `generateUnifiedSchedule(mwfSlotId: string, ttSlotId: string, options: object)`

**Purpose**: Orchestrate unified schedule generation

**Implementation Strategy**:
```typescript
interface GenerateUnifiedScheduleParams {
  mwfSlotId: string;
  ttSlotId: string;
  options: {
    includeExams?: boolean;
    fairnessMode?: 'balanced' | 'F-priority' | 'H-priority';
    enableMicroSwaps?: boolean;
    cacheResults?: boolean;
  };
}
```

**Process Flow**:
1. **Validation Phase**:
   - Call `getSlotConfig(mwfSlotId, 'MWF')`
   - Call `getSlotConfig(ttSlotId, 'TT')`
   - Validate both slots belong to same user (RLS enforced)

2. **Generation Phase**:
   - Initialize `FairnessLedger`
   - Generate MWF schedules using existing engine
   - Generate TT schedules using TT engine
   - Apply post-processing optimizations

3. **Persistence Phase**:
   - Call `saveGenerated()` for both slots
   - Optionally save unified cache entry

**Security Considerations**:
- Both slot IDs must pass RLS validation
- Function runs with user's security context
- No cross-user data access possible

### 3. `saveGenerated(slotId: string, dayGroup: 'MWF' | 'TT', result: object, batchId: string)`

**Purpose**: Persist generated schedule results

**Implementation Strategy**:
```sql
-- Function signature
CREATE OR REPLACE FUNCTION save_generated_schedule(
  p_slot_id UUID,
  p_day_group VARCHAR(3),
  p_generation_batch_id UUID,
  p_schedule_data JSONB,
  p_fairness_metrics JSONB DEFAULT NULL,
  p_warnings JSONB DEFAULT NULL,
  p_feasibility_report JSONB DEFAULT NULL
) RETURNS UUID
SECURITY DEFINER
SET search_path = public
```

**Data Structure**:
```typescript
interface GeneratedScheduleData {
  schedule_data: {
    classSummary: Record<string, Record<Day, Assignment[]>>;
    teacherSummary: Record<Teacher, Record<Day, Assignment[]>>;
    dayGrid: Record<Day, Record<Period, Assignment[]>>;
  };
  fairness_metrics: {
    weeklyStats: Record<Teacher, TeacherMetrics>;
    variance: number;
    outliers: Teacher[];
  };
  warnings: string[];
  feasibility_report: {
    mwf: FeasibilityReport;
    tt: TTFeasibilityReport;
    overall: UnifiedFeasibilityReport;
  };
}
```

**Batch Management**:
- Same `generation_batch_id` links MWF and TT results
- Enables unified retrieval and management
- Supports cleanup of related records

## Row Level Security (RLS) Configuration

### Current RLS Policies (Confirmed)

#### 1. Slots Table RLS
```sql
-- Users can only access their own slots
CREATE POLICY slots_user_policy ON slots
  FOR ALL TO authenticated
  USING (user_id = auth.uid());

-- SUPER_ADMIN can access all slots
CREATE POLICY slots_super_admin_policy ON slots
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'SUPER_ADMIN'
    )
  );
```

#### 2. Generated Schedules RLS
```sql
-- Users can only access their own generated schedules
CREATE POLICY generated_schedules_user_policy ON generated_schedules
  FOR ALL TO authenticated
  USING (user_id = auth.uid());

-- SUPER_ADMIN can access all generated schedules
CREATE POLICY generated_schedules_super_admin_policy ON generated_schedules
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'SUPER_ADMIN'
    )
  );
```

### Security Guarantees

#### For Regular Users (ADMIN role):
- ✅ Can only select slots they created (`user_id = auth.uid()`)
- ✅ Can only generate schedules from their own slots
- ✅ Can only view their own generated schedules
- ✅ Cannot access other users' data

#### For SUPER_ADMIN role:
- ✅ Can access any slot (any `user_id`)
- ✅ Can generate schedules from any combination of slots
- ✅ Can view any generated schedules
- ✅ Can perform administrative operations

### Cross-Slot Security Validation

```sql
-- Ensure both slots belong to same user (for regular users)
CREATE OR REPLACE FUNCTION validate_slot_ownership(
  p_mwf_slot_id UUID,
  p_tt_slot_id UUID
) RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- SUPER_ADMIN bypass
  IF EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'SUPER_ADMIN'
  ) THEN
    RETURN TRUE;
  END IF;
  
  -- Regular user validation
  RETURN (
    SELECT COUNT(*) = 2
    FROM slots
    WHERE id IN (p_mwf_slot_id, p_tt_slot_id)
    AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql;
```

## Performance Considerations

### Query Optimization

#### 1. Slot Retrieval
```sql
-- Optimized slot lookup with RLS
SELECT s.*, 
       s.slot_data->'teachers' as teachers,
       s.slot_data->'globalOptions' as global_options
FROM slots s
WHERE s.id = $1 
  AND s.day_group = $2
  AND s.user_id = auth.uid(); -- RLS filter
```

#### 2. Batch Result Retrieval
```sql
-- Retrieve unified results by batch ID
SELECT gs.*, s.name as slot_name, s.day_group
FROM generated_schedules gs
JOIN slots s ON gs.slot_id = s.id
WHERE gs.generation_batch_id = $1
  AND gs.user_id = auth.uid() -- RLS filter
ORDER BY gs.day_group, gs.generated_at DESC;
```

### Caching Strategy

#### 1. Application-Level Caching
- Cache slot configurations for 5 minutes
- Cache generated schedules for 30 minutes
- Invalidate cache on slot updates

#### 2. Database-Level Caching
- Use `expires_at` field for automatic cleanup
- Background job removes expired records
- Optional unified cache table for frequently accessed combinations

## Data Migration Strategy

### Existing Data Compatibility
- ✅ Current slots table structure supports both MWF and TT
- ✅ No schema changes required for existing MWF slots
- ✅ New `generated_schedules` table is additive only

### Migration Steps
1. **Deploy new table**: `generated_schedules`
2. **Add new indexes**: Performance optimization
3. **Deploy new functions**: Service layer functions
4. **Update RLS policies**: Enhanced security
5. **No data migration required**: Existing data remains unchanged

## Monitoring and Maintenance

### Performance Monitoring
- Track query execution times for slot retrieval
- Monitor batch generation performance
- Alert on slow schedule generation (> 30 seconds)

### Data Maintenance
- **Cleanup Job**: Remove expired generated schedules daily
- **Archive Strategy**: Archive old schedules before deletion
- **Backup Strategy**: Include generated_schedules in regular backups

### Security Monitoring
- Log all slot access attempts
- Monitor for RLS policy violations
- Alert on unauthorized access attempts

---

This database access plan ensures efficient, secure, and scalable access to slot configurations and generated schedules while maintaining full compatibility with existing data structures and security policies.


