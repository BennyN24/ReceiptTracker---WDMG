# Preset Budgets Feature

## Overview
The Preset Budgets feature allows users to quickly add pre-configured budgets based on expense categories. This streamlines the budget creation process by providing sensible default amounts for common spending categories.

## Features

### Quick Add Preset Budgets
- Users can see available preset budgets on the Budgets screen
- One-click addition of preset budgets without manual configuration
- Only shows presets for categories that don't already have budgets

### Default Preset Budgets
The following preset budgets are available by default:

| Category | Monthly Budget | Category ID |
|----------|----------------|------------|
| Food & Dining | $400 | 1 |
| Transportation | $300 | 2 |
| Shopping | $250 | 3 |
| Entertainment | $150 | 4 |
| Bills & Utilities | $500 | 5 |
| Healthcare | $200 | 6 |
| Education | $300 | 7 |

## Implementation Details

### Files Modified/Created

#### New Files
- `src/utils/PresetBudgets.js` - Utility functions for managing preset budgets

#### Modified Files
- `src/services/StorageService.js` - Added methods for preset budget management
- `src/screens/BudgetsScreen.js` - Added UI for displaying and adding preset budgets

### API Methods

#### StorageService Methods

**`getDefaultPresetBudgets()`**
- Returns an array of all available preset budgets
- Synchronous method
- Returns: Array of preset budget objects

**`async addPresetBudget(categoryId)`**
- Adds a preset budget for the specified category
- Validates that no budget already exists for the category
- Creates a new budget with unique ID and timestamps
- Parameters:
  - `categoryId` (string): The category ID to add a preset budget for
- Returns: The newly created budget object
- Throws: Error if budget already exists or category not found

**`async getAvailablePresetBudgets()`**
- Returns preset budgets that haven't been added yet
- Filters out presets for categories that already have budgets
- Returns: Array of available preset budget objects

### UI Components

#### Preset Budgets Section
- Displays as "Quick Add Preset Budgets" section above existing budgets
- Shows only when preset budgets are available
- Each preset displays:
  - Category name
  - Monthly budget amount
  - Add button (add-circle-outline icon)
- Tappable to quickly add the preset budget

#### Empty State
- If no budgets exist and no presets are available, shows empty state message
- If no budgets exist but presets are available, shows preset section instead

#### Your Budgets Section
- Displays below preset budgets when user has created budgets
- Shows all user-created budgets with spending progress

## User Workflow

1. User navigates to Budgets screen
2. If no budgets exist, "Quick Add Preset Budgets" section appears
3. User can tap any preset to instantly add it
4. Preset budget is created with default amount and monthly period
5. Budget appears in "Your Budgets" section
6. User can still create custom budgets using the FAB or modal

## Customization

To modify preset budget amounts, edit `src/utils/PresetBudgets.js`:

```javascript
export const getDefaultPresetBudgets = () => {
  return [
    {
      name: 'Food & Dining',
      amount: 400,  // Modify this value
      period: 'monthly',
      categoryId: '1',
      isPreset: true,
    },
    // ... other presets
  ];
};
```

## Technical Notes

- Preset budgets are linked to categories via `categoryId`
- Each preset has `isPreset: true` flag for identification
- Prevents duplicate budgets for the same category
- Uses same validation and storage as manual budgets
- Preset budgets can be edited or deleted like any other budget
