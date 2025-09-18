# Analytics Extension Specification

## Overview

This document outlines the analytics extension for the unified schedule generator, providing comprehensive visualization and reporting capabilities for schedule quality, teacher workload distribution, and system performance metrics.

## Graph Specifications

### 1. Stacked Bar Chart: Teacher Weekly Totals

#### Purpose
Visualize per-teacher workload distribution across the entire week (Mon-Fri) with role breakdown.

#### Data Structure
```typescript
interface TeacherWeeklyData {
  teacher: string;
  totals: {
    H: number;  // Homeroom assignments
    K: number;  // Korean role assignments  
    F: number;  // Foreign role assignments
    total: number; // Sum of all assignments
  };
  byDay: Record<Day, {
    H: number;
    K: number;
    F: number;
  }>;
}
```

#### Chart Configuration
- **Type**: Stacked Bar Chart
- **X-Axis**: Teacher names (sorted by total workload)
- **Y-Axis**: Assignment count
- **Stacks**: H (blue), K (red), F (green)
- **Interactive**: Click to drill down to daily breakdown

#### Data Source Priority
1. **Primary**: `generated_schedules.result.teacherSummary`
2. **Fallback**: Compute from raw schedule data
3. **Cache**: Store computed results for performance

#### Visual Design
```
┌─────────────────────────────────────────────────────────────┐
│ 📊 Teacher Weekly Workload Distribution                     │
├─────────────────────────────────────────────────────────────┤
│ Teacher    │ ████████H ████K ██F │ Total: 14              │
│ 김선생     │ ████████H ████K ██F │ Total: 14              │
│ 이선생     │ ██████H   ███K  █F  │ Total: 10              │
│ 박선생     │ ████H     ██K   █F  │ Total: 7               │
└─────────────────────────────────────────────────────────────┘
```

### 2. Line/Bar Chart: Fairness Deviation by Role

#### Purpose
Track fairness metrics and identify workload imbalances across different roles.

#### Data Structure
```typescript
interface FairnessDeviationData {
  role: 'H' | 'K' | 'F';
  metrics: {
    mean: number;
    standardDeviation: number;
    min: number;
    max: number;
    coefficientOfVariation: number;
  };
  teacherDeviations: Array<{
    teacher: string;
    count: number;
    deviation: number; // σ from mean
    status: 'balanced' | 'overloaded' | 'underused';
  }>;
}
```

#### Chart Configuration
- **Type**: Line Chart (trend over time) or Bar Chart (current state)
- **X-Axis**: Role (H, K, F)
- **Y-Axis**: Standard deviation or coefficient of variation
- **Interactive**: Hover to show individual teacher deviations

#### Visual Design
```
┌─────────────────────────────────────────────────────────────┐
│ 📈 Fairness Deviation by Role                               │
├─────────────────────────────────────────────────────────────┤
│ Role │ Mean │ StdDev │ CV% │ Status                        │
│ H    │ 6.2  │ 1.8    │ 29% │ ⚠️ Moderate variance          │
│ K    │ 3.1  │ 0.9    │ 29% │ ✅ Well balanced              │
│ F    │ 2.0  │ 1.2    │ 60% │ 🔴 High variance              │
└─────────────────────────────────────────────────────────────┘
```

### 3. Heatmap: Teacher Day×Period Assignment Count

#### Purpose
Visualize individual teacher schedules across all days and periods for workload analysis.

#### Data Structure
```typescript
interface TeacherHeatmapData {
  teacher: string;
  schedule: Record<Day, Record<Period, {
    assignmentCount: number;
    roles: Role[];
    classes: string[];
    conflicts?: string[];
  }>>;
}
```

#### Chart Configuration
- **Type**: Heatmap Grid
- **X-Axis**: Days (Mon, Tue, Wed, Thu, Fri)
- **Y-Axis**: Periods (1-8 for MWF, 1-6 for TT)
- **Color Scale**: Light (0 assignments) → Dark (multiple assignments)
- **Interactive**: Click cell for assignment details

#### Visual Design
```
┌─────────────────────────────────────────────────────────────┐
│ 🔥 김선생 - Weekly Schedule Heatmap                         │
├─────────────────────────────────────────────────────────────┤
│     │ Mon │ Tue │ Wed │ Thu │ Fri │                        │
│ 1교시 │ 🔴2 │ 🟡1 │ 🔴2 │ 🟡1 │ 🔴2 │                        │
│ 2교시 │ 🟡1 │ 🔴2 │ 🟡1 │ 🔴2 │ 🟡1 │                        │
│ 3교시 │ 🟡1 │ 🟡1 │ 🟡1 │ 🟡1 │ 🟡1 │                        │
│ 4교시 │ 🟡1 │ ⚪0 │ 🟡1 │ ⚪0 │ 🟡1 │                        │
│ 5교시 │ 🟡1 │ ⚪0 │ 🟡1 │ ⚪0 │ 🟡1 │                        │
│ 6교시 │ ⚪0 │ ⚪0 │ ⚪0 │ ⚪0 │ ⚪0 │                        │
│ 7교시 │ 🟡1 │ ⚪0 │ 🟡1 │ ⚪0 │ 🟡1 │                        │
│ 8교시 │ 🟡1 │ ⚪0 │ 🟡1 │ ⚪0 │ 🟡1 │                        │
└─────────────────────────────────────────────────────────────┘
```

**Legend**: ⚪0 assignments, 🟡1 assignment, 🔴2+ assignments

## Data Sources

### Primary Data Source: Generated Schedules

#### Database Query
```sql
SELECT 
  gs.schedule_data->'teacherSummary' as teacher_summary,
  gs.fairness_metrics,
  gs.feasibility_report,
  gs.generated_at,
  s.name as slot_name,
  s.day_group
FROM generated_schedules gs
JOIN slots s ON gs.slot_id = s.id
WHERE gs.generation_batch_id = $1
  AND gs.user_id = auth.uid() -- RLS filter
ORDER BY s.day_group;
```

#### Data Processing
1. **Merge MWF and TT Results**: Combine teacher summaries
2. **Calculate Metrics**: Compute weekly totals and deviations
3. **Validate Data**: Check for missing or incomplete data
4. **Cache Results**: Store processed data for performance

### Fallback: On-the-Fly Computation

#### When to Use
- Generated schedules not available
- Data corruption detected
- Real-time analysis required

#### Computation Process
1. **Load Raw Schedule Data**: From `generated_schedules.schedule_data`
2. **Parse Assignments**: Extract teacher-role-day-period mappings
3. **Aggregate Metrics**: Calculate totals and deviations
4. **Cache Results**: Store for future use

#### Performance Considerations
- **Caching**: Store computed results for 1 hour
- **Lazy Loading**: Compute only when requested
- **Background Processing**: Pre-compute popular combinations

## Interactive Features

### Slot Filter Chips

#### Purpose
Allow users to filter analytics by specific slot combinations.

#### Implementation
```typescript
interface SlotFilter {
  selectedIds: string[]; // Array of slot IDs
  displayNames: string[]; // Human-readable names
  dayGroups: ('MWF' | 'TT')[]; // Day group types
}
```

#### Visual Design
```
┌─────────────────────────────────────────────────────────────┐
│ 🏷️ Selected Slots: [MWF-Spring-2024 ✕] [TT-Spring-2024 ✕]  │
│                                                             │
│ Available: [MWF-Fall-2024] [TT-Fall-2024] [MWF-Summer-2024]│
└─────────────────────────────────────────────────────────────┘
```

#### Behavior
- **Multi-Select**: Choose multiple slot combinations
- **Real-Time Updates**: Charts update immediately
- **Validation**: Ensure compatible slot combinations
- **Persistence**: Remember selections across sessions

### Teacher Search

#### Purpose
Filter analytics to specific teachers or teacher groups.

#### Implementation
```typescript
interface TeacherSearch {
  query: string; // Search term
  filters: {
    role?: 'H' | 'K' | 'F'; // Filter by role
    workload?: 'high' | 'medium' | 'low'; // Filter by workload
    availability?: 'available' | 'busy'; // Filter by availability
  };
}
```

#### Visual Design
```
┌─────────────────────────────────────────────────────────────┐
│ 🔍 Search Teachers: [김선생                    ] [🔍]        │
│                                                             │
│ Filters: [All Roles ▼] [All Workload ▼] [All Availability ▼]│
└─────────────────────────────────────────────────────────────┘
```

#### Behavior
- **Real-Time Search**: Filter as user types
- **Fuzzy Matching**: Handle name variations
- **Advanced Filters**: Role, workload, availability
- **Search History**: Remember recent searches

### Export CSV

#### Purpose
Allow users to export analytics data for external analysis.

#### Export Options
```typescript
interface ExportOptions {
  format: 'csv' | 'excel' | 'json';
  data: {
    teacherTotals: boolean;
    fairnessMetrics: boolean;
    heatmapData: boolean;
    rawSchedule: boolean;
  };
  filters: {
    selectedSlots: string[];
    selectedTeachers: string[];
    dateRange: [Date, Date];
  };
}
```

#### Implementation
- **CSV Export**: Standard comma-separated format
- **Excel Export**: Multi-sheet workbook with formatting
- **JSON Export**: Structured data for API consumption
- **Progress Tracking**: Show export progress for large datasets

## Security & Access Control

### SUPER_ADMIN Privileges

#### Full Access
- ✅ View analytics for any slot combination
- ✅ Access cross-user data comparisons
- ✅ Export system-wide reports
- ✅ View performance metrics

#### UI Indicators
```typescript
interface AdminIndicator {
  role: 'SUPER_ADMIN';
  capabilities: {
    crossUserAccess: true;
    systemMetrics: true;
    bulkExport: true;
  };
}
```

### ADMIN Restrictions

#### Limited Access
- ✅ View analytics only for own slots
- ✅ Export only own data
- ✅ No cross-user comparisons
- ❌ No system-wide metrics

#### UI Indicators
```typescript
interface UserIndicator {
  role: 'ADMIN';
  capabilities: {
    ownSlotsOnly: true;
    limitedExport: true;
    noCrossUser: true;
  };
}
```

#### Access Control Implementation
```sql
-- RLS policy for analytics access
CREATE POLICY analytics_access_policy ON generated_schedules
  FOR SELECT TO authenticated
  USING (
    -- SUPER_ADMIN can access all
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'SUPER_ADMIN'
    )
    OR
    -- ADMIN can only access own data
    user_id = auth.uid()
  );
```

## KPI Cards

### 1. Unassigned Slots Count

#### Purpose
Track schedule completeness and identify assignment failures.

#### Data Structure
```typescript
interface UnassignedSlotsKPI {
  total: number;
  byRole: {
    H: number;
    K: number;
    F: number;
    EXAM: number;
  };
  byDay: Record<Day, number>;
  severity: 'low' | 'medium' | 'high' | 'critical';
  trend: 'improving' | 'stable' | 'worsening';
}
```

#### Visual Design
```
┌─────────────────────────────────────────────────────────────┐
│ 📊 Unassigned Slots                                         │
│                                                             │
│ Total: 3 slots                                              │
│ H: 1, K: 1, F: 1                                           │
│                                                             │
│ Status: 🟡 Medium (3-5 slots)                              │
│ Trend: 📈 Improving (↓2 from last week)                    │
└─────────────────────────────────────────────────────────────┘
```

### 2. TT.R1 Foreign Capacity Usage

#### Purpose
Monitor foreign teacher utilization efficiency.

#### Data Structure
```typescript
interface TTR1CapacityKPI {
  totalCapacity: number; // numForeign × 3
  utilizedCapacity: number; // Actual assignments
  utilizationPercentage: number;
  efficiency: 'optimal' | 'underutilized' | 'overloaded';
  recommendations: string[];
}
```

#### Visual Design
```
┌─────────────────────────────────────────────────────────────┐
│ 🎯 TT.R1 Foreign Capacity                                  │
│                                                             │
│ Usage: 12/15 slots (80%)                                   │
│ ████████████████░░░░                                        │
│                                                             │
│ Status: 🟡 Underutilized                                   │
│ Rec: Add 1 more class or reduce teachers                   │
└─────────────────────────────────────────────────────────────┘
```

### 3. TT.R2 H/K Coverage

#### Purpose
Track homeroom and Korean teacher demand satisfaction.

#### Data Structure
```typescript
interface TTR2CoverageKPI {
  homeroom: {
    demand: number; // 2 × classCount
    supply: number; // Available homeroom teachers
    coverage: number; // percentage
    status: 'sufficient' | 'tight' | 'insufficient';
  };
  korean: {
    demand: number; // 1 × classCount
    supply: number; // Available Korean teachers
    coverage: number; // percentage
    status: 'sufficient' | 'tight' | 'insufficient';
  };
  overall: 'healthy' | 'warning' | 'critical';
}
```

#### Visual Design
```
┌─────────────────────────────────────────────────────────────┐
│ 🎯 TT.R2 H/K Coverage                                      │
│                                                             │
│ Homeroom: 8/10 (80%) 🟡 Tight                             │
│ Korean:   4/4 (100%) ✅ Sufficient                         │
│                                                             │
│ Overall: 🟡 Warning - H capacity tight                    │
└─────────────────────────────────────────────────────────────┘
```

## Performance Considerations

### Data Loading Strategy

#### Lazy Loading
- Load chart data only when tab is active
- Cache results for 5 minutes
- Background refresh for real-time updates

#### Pagination
- Limit teacher list to 50 items per page
- Virtual scrolling for large datasets
- Progressive loading for heatmaps

#### Caching Strategy
```typescript
interface CacheConfig {
  teacherTotals: { ttl: 300 }; // 5 minutes
  fairnessMetrics: { ttl: 600 }; // 10 minutes
  heatmapData: { ttl: 900 }; // 15 minutes
  kpiData: { ttl: 120 }; // 2 minutes
}
```

### Optimization Techniques

#### Chart Rendering
- Use Canvas for large datasets (>100 teachers)
- Implement data sampling for real-time updates
- Lazy load chart libraries

#### Data Processing
- Background computation for heavy calculations
- Web Workers for statistical analysis
- IndexedDB for client-side caching

## Responsive Design

### Mobile Layout (< 768px)
- Stack KPI cards vertically
- Collapsible chart sections
- Touch-friendly filter controls
- Simplified heatmap (periods only)

### Tablet Layout (768px - 1024px)
- Two-column KPI layout
- Side-by-side charts
- Expandable filter panel
- Full heatmap with zoom

### Desktop Layout (> 1024px)
- Multi-column dashboard
- Side-by-side charts
- Advanced filtering options
- Full-featured heatmap with details

---

This analytics specification provides comprehensive visualization and reporting capabilities while maintaining security boundaries and ensuring optimal performance across all device types.


