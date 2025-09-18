# Generate Panel UI Specification

## Overview

This document outlines the user interface specification for the Generate panel, which allows users to create unified weekly schedules by combining MWF and TT slot configurations with various fairness and optimization options.

## Panel Layout

### Header Section
```
┌─────────────────────────────────────────────────────────────┐
│ 📅 Generate Weekly Schedule                                 │
├─────────────────────────────────────────────────────────────┤
│ Configure your unified MWF + TT schedule generation        │
└─────────────────────────────────────────────────────────────┘
```

### Configuration Form
```
┌─────────────────────────────────────────────────────────────┐
│ Slot Selection                                             │
│ ┌─────────────────┐  ┌─────────────────┐                   │
│ │ MWF Slot        │  │ TT Slot         │                   │
│ │ ▼ Select slot   │  │ ▼ Select slot   │                   │
│ └─────────────────┘  └─────────────────┘                   │
│                                                             │
│ Options                                                      │
│ ☑ Include Exams    🎯 Fairness Mode: [Balanced ▼]          │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │                    [Generate Schedule]                   │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Form Fields Specification

### 1. MWF Slot Dropdown

**Purpose**: Select the Monday/Wednesday/Friday slot configuration

**Behavior**:
- **Data Source**: Query slots where `dayGroup = "MWF"`
- **Display Format**: `"Slot Name" (X teachers, Y classes)`
- **Empty State**: "No MWF slots available - Create one first"
- **Loading State**: "Loading MWF slots..."
- **Validation**: Required field, must select valid slot

**Accessibility**:
- `aria-label="Select MWF slot configuration"`
- `aria-required="true"`
- `role="combobox"`
- Keyboard navigation with arrow keys

### 2. TT Slot Dropdown

**Purpose**: Select the Tuesday/Thursday slot configuration

**Behavior**:
- **Data Source**: Query slots where `dayGroup = "TT"`
- **Display Format**: `"Slot Name" (X teachers, Y classes)`
- **Empty State**: "No TT slots available - Create one first"
- **Loading State**: "Loading TT slots..."
- **Validation**: Required field, must select valid slot

**Accessibility**:
- `aria-label="Select TT slot configuration"`
- `aria-required="true"`
- `role="combobox"`
- Keyboard navigation with arrow keys

### 3. Include Exams Toggle

**Purpose**: Control whether exams are included in the generated schedule

**Behavior**:
- **Default State**: Checked (exams included)
- **Visual**: Standard checkbox with clear label
- **Impact**: Affects schedule generation and output format

**Accessibility**:
- `aria-label="Include exams in schedule"`
- `aria-checked="true/false"`
- Keyboard accessible with Space key

### 4. Fairness Mode Selector

**Purpose**: Choose the fairness optimization strategy

**Options**:
- **"Balanced"** (default): Equal weight to all roles
- **"F-Priority"**: Prioritize foreign teacher availability
- **"H-Priority"**: Prioritize homeroom teacher workload balance

**Behavior**:
- **Default**: "Balanced"
- **Display Format**: Dropdown with descriptive labels
- **Tooltip**: Brief explanation of each mode on hover

**Accessibility**:
- `aria-label="Select fairness optimization mode"`
- `aria-describedby="fairness-help"`
- Keyboard navigation with arrow keys

## Generate Button

### Visual Design
- **Style**: Primary button, prominent placement
- **Size**: Large, full-width within form
- **Color**: Green/primary theme color
- **Icon**: ⚡ or 🔄 (indicating generation action)

### States

#### Default State
```
┌─────────────────────────────────────────────────────────┐
│ ⚡ Generate Schedule                                     │
└─────────────────────────────────────────────────────────┘
```

#### Loading State
```
┌─────────────────────────────────────────────────────────┐
│ ⟳ Generating... (2/7 steps completed)                   │
└─────────────────────────────────────────────────────────┘
```
- Show progress indicator
- Display current step (e.g., "Generating MWF schedules...")
- Disable button during generation

#### Disabled State
```
┌─────────────────────────────────────────────────────────┐
│ Generate Schedule (Select both slots first)            │
└─────────────────────────────────────────────────────────┘
```
- Grayed out when slots not selected
- Tooltip explaining requirement

### Accessibility
- `aria-label="Generate unified weekly schedule"`
- `aria-busy="true"` during generation
- Keyboard accessible with Enter/Space keys

## Results Display

### Tab Navigation
```
┌─────────────────────────────────────────────────────────────┐
│ [Class View] [Teacher View] [Day View]                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Tab Content Area                                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Tab Specifications

**Class View Tab**:
- **Purpose**: Show schedule organized by class
- **Content**: Class → Day → Period assignments
- **Default**: Active tab
- **Accessibility**: `aria-selected="true"`

**Teacher View Tab**:
- **Purpose**: Show schedule organized by teacher
- **Content**: Teacher → Day → Period assignments
- **Accessibility**: `aria-selected="false"`

**Day View Tab**:
- **Purpose**: Show schedule organized by day
- **Content**: Day → Period → Class/Teacher assignments
- **Accessibility**: `aria-selected="false"`

### Warnings Panel

#### Panel Header
```
┌─────────────────────────────────────────────────────────────┐
│ ⚠️ Warnings & Issues (3 found)                             │
├─────────────────────────────────────────────────────────────┤
```

#### Filter Controls
```
┌─────────────────────────────────────────────────────────────┐
│ Filters: [MWF ▼] [All Roles ▼] [All Severity ▼] [Clear]   │
├─────────────────────────────────────────────────────────────┤
```

**Filter Options**:
- **Day Group**: All, MWF, TT
- **Role**: All, H, K, F, EXAM
- **Severity**: All, Critical, Warning, Info

#### Warning Items
```
┌─────────────────────────────────────────────────────────────┐
│ 🔴 Critical: TT.R1 foreign teacher shortage - need 2 more   │
│ 🟡 Warning: Teacher 김선생 overloaded (15 assignments)      │
│ 🔵 Info: TT.R2 Korean demand fully satisfied               │
└─────────────────────────────────────────────────────────────┘
```

**Warning Types**:
- **Critical**: Schedule generation failures, capacity issues
- **Warning**: Constraint violations, workload imbalances
- **Info**: Optimization results, feasibility confirmations

### Feasibility Report Cards

#### Card Layout
```
┌─────────────────────────────────────────────────────────────┐
│ 📊 Feasibility Report                                      │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │
│ │ TT.R1 F-Cap │ │ TT.R2 H/K   │ │ Unassigned  │            │
│ │ ✅ 12/12    │ │ ⚠️  H: 8/10 │ │ 🔴 3 slots  │            │
│ │ Satisfied   │ │ K: 4/4 OK   │ │ Critical    │            │
│ └─────────────┘ └─────────────┘ └─────────────┘            │
└─────────────────────────────────────────────────────────────┘
```

#### Individual Card Specifications

**TT.R1 Foreign Capacity Card**:
- **Purpose**: Show foreign teacher capacity vs demand
- **Format**: `Available/Required (Status)`
- **Status Indicators**:
  - ✅ Green: Capacity sufficient
  - ⚠️ Yellow: Capacity tight (90-100%)
  - 🔴 Red: Capacity insufficient

**TT.R2 H/K Demand Card**:
- **Purpose**: Show homeroom and Korean teacher demand
- **Format**: `H: Available/Demand, K: Available/Demand`
- **Status Indicators**:
  - ✅ Green: Both roles satisfied
  - ⚠️ Yellow: One role tight
  - 🔴 Red: One or both roles insufficient

**Unassigned Slots Card**:
- **Purpose**: Show count of unassigned assignments
- **Format**: `X slots (Severity)`
- **Status Indicators**:
  - ✅ Green: 0 unassigned
  - 🟡 Yellow: 1-3 unassigned
  - 🔴 Red: 4+ unassigned

### Weekly Fairness Summary

#### Summary Table
```
┌─────────────────────────────────────────────────────────────┐
│ 📈 Weekly Fairness Summary                                 │
├─────────────────────────────────────────────────────────────┤
│ Teacher    │ H │ K │ F │ Total │ Deviation │ Status        │
│ 김선생     │ 8 │ 4 │ 2 │  14   │  +2.3σ   │ ⚠️ Overloaded  │
│ 이선생     │ 6 │ 3 │ 1 │  10   │  +0.1σ   │ ✅ Balanced    │
│ 박선생     │ 4 │ 2 │ 0 │   6   │  -1.8σ   │ ⚠️ Underused   │
└─────────────────────────────────────────────────────────────┘
```

#### Column Specifications

**Teacher**: Teacher name
**H/K/F**: Role-specific assignment counts
**Total**: Sum of all assignments
**Deviation**: Statistical deviation from mean
**Status**: Workload assessment with visual indicators

**Status Indicators**:
- ✅ Green: Within 1σ of mean
- 🟡 Yellow: 1-2σ from mean (over/under loaded)
- 🔴 Red: >2σ from mean (extreme imbalance)

## Accessibility Specifications

### Keyboard Navigation

**Tab Order**:
1. MWF Slot dropdown
2. TT Slot dropdown
3. Include Exams checkbox
4. Fairness Mode dropdown
5. Generate button
6. Tab navigation (Class/Teacher/Day)
7. Warning filters
8. Content areas

**Keyboard Shortcuts**:
- `Tab`: Move to next focusable element
- `Shift+Tab`: Move to previous focusable element
- `Enter/Space`: Activate buttons and checkboxes
- `Arrow Keys`: Navigate dropdown options
- `Escape`: Close dropdowns

### ARIA Labels and Roles

**Form Elements**:
- `role="form"` on main form
- `aria-label` on all form controls
- `aria-required="true"` on required fields
- `aria-describedby` linking to help text

**Results Area**:
- `role="tablist"` on tab navigation
- `role="tab"` on individual tabs
- `role="tabpanel"` on tab content
- `aria-live="polite"` on dynamic content updates

**Status Indicators**:
- `aria-label` describing status (e.g., "Capacity sufficient")
- `role="status"` on warning messages
- `aria-expanded` on collapsible sections

## Empty States

### No Slots Available
```
┌─────────────────────────────────────────────────────────────┐
│ 📝 No Slots Found                                          │
│                                                             │
│ Create slot configurations before generating schedules.    │
│                                                             │
│ [Create MWF Slot] [Create TT Slot]                         │
└─────────────────────────────────────────────────────────────┘
```

### No Results Generated
```
┌─────────────────────────────────────────────────────────────┐
│ ⚠️ Generation Failed                                       │
│                                                             │
│ Unable to generate schedule with current configurations.   │
│ Check the warnings below for details.                      │
│                                                             │
│ [Retry] [Adjust Settings]                                  │
└─────────────────────────────────────────────────────────────┘
```

## Error States

### Validation Errors
```
┌─────────────────────────────────────────────────────────────┐
│ ❌ Configuration Error                                      │
│                                                             │
│ • Please select both MWF and TT slots                      │
│ • TT slot must have at least 1 foreign teacher             │
│                                                             │
│ [Fix Issues]                                               │
└─────────────────────────────────────────────────────────────┘
```

### Generation Errors
```
┌─────────────────────────────────────────────────────────────┐
│ 🔴 Generation Failed                                       │
│                                                             │
│ Critical error occurred during schedule generation:        │
│ "Insufficient foreign teachers for TT.R1"                  │
│                                                             │
│ [View Details] [Try Again]                                 │
└─────────────────────────────────────────────────────────────┘
```

### Network Errors
```
┌─────────────────────────────────────────────────────────────┐
│ 🌐 Connection Error                                        │
│                                                             │
│ Unable to connect to the server. Please check your         │
│ internet connection and try again.                          │
│                                                             │
│ [Retry] [Work Offline]                                     │
└─────────────────────────────────────────────────────────────┘
```

## Responsive Design

### Mobile Layout (< 768px)
- Stack form fields vertically
- Full-width buttons
- Collapsible warnings panel
- Horizontal scroll for tables
- Touch-friendly tap targets (44px minimum)

### Tablet Layout (768px - 1024px)
- Two-column form layout
- Side-by-side dropdowns
- Expandable card details
- Optimized tab navigation

### Desktop Layout (> 1024px)
- Full multi-column layout
- Hover states for interactive elements
- Keyboard shortcuts tooltips
- Advanced filtering options

## Performance Considerations

### Loading States
- Show skeleton loaders for slow operations
- Progress indicators for generation steps
- Lazy load tab content
- Debounce filter inputs

### Data Management
- Cache slot configurations
- Paginate large teacher lists
- Virtual scrolling for large tables
- Optimize re-renders with React.memo

---

This specification provides a comprehensive guide for implementing the Generate panel UI with full accessibility support, responsive design, and robust error handling.


