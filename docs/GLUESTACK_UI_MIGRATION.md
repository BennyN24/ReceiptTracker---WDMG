# Gluestack-UI Migration & Money Green Theme

## Overview

The ReceiptTracker app has been migrated from `react-native-paper` components to `@gluestack-ui/themed` components with a custom **Money Green** color theme.

## Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `primary` | `#16a34a` | Primary actions, active states, links |
| `primaryDark` | `#15803d` | Hover/pressed states |
| `primaryDarker` | `#166534` | Dark accents |
| `primaryLight` | `#22c55e` | Secondary highlights |
| `primaryLighter` | `#bbf7d0` | Switch tracks, light accents |
| `primaryLightest` | `#f0fdf4` | Backgrounds, selected states |
| `primaryMuted` | `#dcfce7` | Subtle backgrounds |
| `background` | `#ffffff` | Main background |
| `backgroundSecondary` | `#f0fdf4` | Screen backgrounds (green-50 tint) |
| `surface` | `#ffffff` | Card surfaces |
| `text` | `#1e293b` | Primary text |
| `textSecondary` | `#64748b` | Secondary/muted text |
| `textMuted` | `#94a3b8` | Placeholder/disabled text |
| `border` | `#e2e8f0` | Borders and dividers |
| `error` | `#ef4444` | Error states, delete actions |
| `success` | `#10b981` | Success states |
| `warning` | `#f59e0b` | Warning states |
| `info` | `#3b82f6` | Informational states |

## Architecture

### Theme Configuration

- **`src/styles/theme.js`** — Central theme file exporting:
  - `colors` — Flat color palette object used across all screens
  - `theme` — React Native Paper theme (kept for backward compatibility with `ProgressBar`, `Portal`)
  - `gluestackThemeConfig` — Gluestack-UI config with money green primary token overrides

### Provider Setup

**`App.js`** wraps the app with both providers:

```jsx
<GluestackUIProvider config={gluestackThemeConfig}>
  <PaperProvider theme={theme}>
    <NavigationContainer>
      <AppNavigator />
    </NavigationContainer>
  </PaperProvider>
</GluestackUIProvider>
```

> `PaperProvider` is kept because `ProgressBar` and `Portal` from react-native-paper are still used in some screens.

## Migrated Files

### Screens
| File | Status |
|------|--------|
| `DashboardScreen.js` | Migrated |
| `ExpensesScreen.js` | Migrated |
| `CaptureScreen.js` | Migrated |
| `BudgetsScreen.js` | Migrated |
| `SettingsScreen.js` | Migrated |
| `AnalyticsScreen.js` | Migrated |
| `CurrencySettingsScreen.js` | Migrated |
| `RecurringExpensesScreen.js` | Migrated |
| `SecuritySettingsScreen.js` | Migrated |

### Components
| File | Status |
|------|--------|
| `AddExpenseModal.js` | Migrated |

### Navigation
| File | Status |
|------|--------|
| `AppNavigator.js` | Updated tab bar active tint to `#16a34a` |

## Gluestack-UI Components Used

- `Box` — Layout container (replaces `View`)
- `Text` — Typography (replaces RN `Text` and Paper `Text`)
- `Heading` — Section headings
- `HStack` / `VStack` — Horizontal/vertical flex layouts
- `Pressable` — Touchable areas (replaces `TouchableOpacity`, Paper `Button`, `FAB`, `Chip`)
- `ScrollView` — Scrollable container
- `Divider` — Visual separator
- `Spinner` — Loading indicator (replaces Paper `ActivityIndicator`)
- `Input` / `InputField` — Text inputs (replaces Paper `TextInput`, `Searchbar`)
- `Textarea` / `TextareaInput` — Multiline inputs
- `InputSlot` / `InputIcon` — Input decorators

## Remaining Paper Dependencies

These Paper components are still in use and can be removed once fully replaced:
- `ProgressBar` — Used in Dashboard and Budgets screens
- `Portal` — Used in AddExpenseModal and BudgetsScreen modals

## Dependencies Added

```
@gluestack-ui/themed
@gluestack-style/react
@gluestack-ui/config
@legendapp/motion
```

Installed with `--legacy-peer-deps` due to React 19 peer dependency conflicts.
