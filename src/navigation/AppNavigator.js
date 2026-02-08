import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { View } from 'react-native';
import Icon from '@expo/vector-icons/MaterialIcons';

import DashboardScreen from '../screens/DashboardScreen';
import ExpensesScreen from '../screens/ExpensesScreen';
import RecurringExpensesScreen from '../screens/RecurringExpensesScreen';
import CaptureScreen from '../screens/CaptureScreen';
import BudgetsScreen from '../screens/BudgetsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import AddExpenseModal from '../components/AddExpenseModal';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const ExpensesStack = () => (
  <Stack.Navigator>
    <Stack.Screen 
      name="ExpensesList" 
      component={ExpensesScreen}
      options={{ headerShown: false }}
    />
    <Stack.Screen 
      name="RecurringExpenses" 
      component={RecurringExpensesScreen}
      options={{ title: 'Recurring Expenses' }}
    />
  </Stack.Navigator>
);

const BudgetsStack = () => (
  <Stack.Navigator>
    <Stack.Screen 
      name="BudgetsList" 
      component={BudgetsScreen}
      options={{ headerShown: false }}
    />
  </Stack.Navigator>
);

const AppNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Dashboard') {
            iconName = 'dashboard';
          } else if (route.name === 'Expenses') {
            iconName = 'receipt';
          } else if (route.name === 'Capture') {
            iconName = 'photo-camera';
            return (
              <View style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: '#16a34a',
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 8,
              }}>
                <Icon name={iconName} size={32} color="#ffffff" />
              </View>
            );
          } else if (route.name === 'Budgets') {
            iconName = 'account-balance-wallet';
          } else if (route.name === 'Settings') {
            iconName = 'settings';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#16a34a',
        tabBarInactiveTintColor: '#94a3b8',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#e2e8f0',
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        headerStyle: {
          backgroundColor: '#ffffff',
          borderBottomColor: '#e2e8f0',
          shadowColor: 'transparent',
        },
        headerTintColor: '#1e293b',
        headerTitleStyle: {
          fontWeight: '600',
        },
      })}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={DashboardScreen}
        options={{ title: 'Dashboard' }}
      />
      <Tab.Screen 
        name="Expenses" 
        component={ExpensesStack}
        options={{ title: 'Expenses' }}
      />
      <Tab.Screen 
        name="Capture" 
        component={CaptureScreen}
      />
      <Tab.Screen 
        name="Budgets" 
        component={BudgetsStack}
        options={{ title: 'Budgets' }}
      />
      <Tab.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
    </Tab.Navigator>
  );
};

export default AppNavigator;
