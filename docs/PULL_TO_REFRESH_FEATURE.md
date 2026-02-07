# Pull-to-Refresh Feature

## Overview
Added pull-to-refresh functionality across all scrollable screens in the app. Users can swipe down from the top of any screen to refresh the data.

## Screens Updated

| Screen | Scroll Component | Data Reload Function |
|--------|-----------------|---------------------|
| DashboardScreen | ScrollView | `loadData()` |
| ExpensesScreen | FlatList | `loadData()` |
| BudgetsScreen | ScrollView | `loadData()` |
| AnalyticsScreen | ScrollView | `loadAnalytics()` |
| SettingsScreen | ScrollView | `loadSettings()` |
| RecurringExpensesScreen | ScrollView | `loadRecurringExpenses()` |
| SecuritySettingsScreen | ScrollView | `loadSecuritySettings()` |
| CurrencySettingsScreen | ScrollView | `loadCurrencySettings()` |

## Implementation Details

### Pattern Used
Each screen follows the same consistent pattern:

1. **Import** `RefreshControl` from `react-native`
2. **State**: `const [refreshing, setRefreshing] = useState(false);`
3. **Handler**:
   ```js
   const onRefresh = async () => {
     setRefreshing(true);
     await loadData(); // screen-specific load function
     setRefreshing(false);
   };
   ```
4. **Attach** to `ScrollView` or `FlatList`:
   ```jsx
   refreshControl={
     <RefreshControl
       refreshing={refreshing}
       onRefresh={onRefresh}
       colors={['#6366f1']}
       tintColor="#6366f1"
     />
   }
   ```

### Styling
- **Android** spinner color: `#6366f1` (indigo, matching app theme)
- **iOS** tint color: `#6366f1`

## Date
February 8, 2026
