# Dashboard Analytics Charts

## Overview

Added interactive pie chart and bar graph sections to the Dashboard screen to provide at-a-glance expense analytics without navigating to the full Analytics screen.

## New Dependencies

- **react-native-chart-kit** — Chart rendering library for React Native
- **react-native-svg** — SVG support required by react-native-chart-kit

## Features

### Pie Chart — Spending by Category
- Displays current month's expenses broken down by category
- Shows up to 6 top categories with percentage labels
- Color-coded legend below the chart
- Tapping "Details" navigates to the full Analytics screen

### Bar Chart — Monthly Spending Trend
- Shows spending totals for the last 6 months
- Dollar values displayed on top of each bar
- Clean white background with dashed grid lines
- Tapping "Details" navigates to the full Analytics screen

### Empty State
- When no expenses exist, a placeholder with a pie-chart icon and prompt is shown

## Data Source

Both charts leverage the existing `AnalyticsService`:
- **Pie Chart**: `AnalyticsService.getSpendingByCategory()` filtered to current month
- **Bar Chart**: `AnalyticsService.getMonthOverMonthComparison()` for last 6 months

## Files Modified

- `src/screens/DashboardScreen.js` — Added chart imports, data computation, chart UI sections, and styles

## Design

- Charts use the project's existing indigo (`#6366f1`) color scheme
- Card-based layout consistent with existing dashboard sections
- Responsive width based on `Dimensions.get('window').width`
- Charts are placed between Quick Stats and Recent Expenses sections
