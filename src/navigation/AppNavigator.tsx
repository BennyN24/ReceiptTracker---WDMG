import React, { useState, useEffect } from 'react';
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
import SplashScreen from '../screens/SplashScreen';
import BiometricLockScreen from '../screens/BiometricLockScreen';
import ProfileManagementScreen from '../screens/ProfileManagementScreen';
import BiometricService from '../services/BiometricService';
import type { MainTabParamList, ExpensesStackParamList, BudgetsStackParamList, RootStackParamList } from '../types';

const Tab = createBottomTabNavigator<MainTabParamList>();
const RootStack = createStackNavigator<RootStackParamList>();
const ExpensesStackObj = createStackNavigator<ExpensesStackParamList>();
const BudgetsStackObj = createStackNavigator<BudgetsStackParamList>();

const ExpensesStack = () => (
  <ExpensesStackObj.Navigator id="expenses-stack">
    <ExpensesStackObj.Screen 
      name="ExpensesList" 
      component={ExpensesScreen}
      options={{ headerShown: false }}
    />
    <ExpensesStackObj.Screen 
      name="RecurringExpenses" 
      component={RecurringExpensesScreen}
      options={{ title: 'Recurring Expenses' }}
    />
  </ExpensesStackObj.Navigator>
);

const BudgetsStack = () => (
  <BudgetsStackObj.Navigator id="budgets-stack">
    <BudgetsStackObj.Screen 
      name="BudgetsList" 
      component={BudgetsScreen}
      options={{ headerShown: false }}
    />
  </BudgetsStackObj.Navigator>
);

const MainTabNavigator = () => {
  return (
    <Tab.Navigator
      id="main-tabs"
      screenOptions={({ route }) => ({
        tabBarShowLabel: false,
        tabBarIcon: ({ color, size }) => {
          let iconName: keyof typeof Icon.prototype.props | string = '';

          if (route.name === 'Dashboard') {
            iconName = 'dashboard';
          } else if (route.name === 'Expenses') {
            iconName = 'receipt';
          } else if (route.name === 'Capture') {
            iconName = 'photo-camera';
            return (
              <View style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: '#16a34a',
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 8,
              }}>
                <Icon name={iconName as any} size={32} color="#ffffff" />
              </View>
            );
          } else if (route.name === 'Budgets') {
            iconName = 'account-balance-wallet';
          } else if (route.name === 'Settings') {
            iconName = 'settings';
          }

          return <Icon name={iconName as any} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#16a34a',
        tabBarInactiveTintColor: '#94a3b8',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#e2e8f0',
          height: 80,
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
        options={{ headerShown: false }}
      />
      <Tab.Screen 
        name="Expenses" 
        component={ExpensesStack}
        options={{ headerShown: false }}
      />
      <Tab.Screen 
        name="Capture" 
        component={CaptureScreen}
        options={{ headerShown: false }}
      />
      <Tab.Screen 
        name="Budgets" 
        component={BudgetsStack}
        options={{ headerShown: false }}
      />
      <Tab.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{ headerShown: false }}
      />
    </Tab.Navigator>
  );
};

const AppNavigator: React.FC = () => {
  const [isSplashVisible, setIsSplashVisible] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsSplashVisible(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const checkBiometricLock = async () => {
      try {
        const enabled = await BiometricService.isBiometricEnabled();
        setIsLocked(enabled);
      } catch (error) {
        console.error('Biometric check error:', error);
        setIsLocked(false);
      } finally {
        setCheckingAuth(false);
      }
    };

    checkBiometricLock();
  }, []);

  if (isSplashVisible || checkingAuth) {
    return <SplashScreen />;
  }

  if (isLocked) {
    return <BiometricLockScreen onAuthenticated={() => setIsLocked(false)} />;
  }

  return (
    <RootStack.Navigator id="root-stack" screenOptions={{ headerShown: false }}>
      <RootStack.Screen name="MainTabs" component={MainTabNavigator} />
      <RootStack.Screen 
        name="ProfileManagement" 
        component={ProfileManagementScreen}
        options={{ headerShown: false }}
      />
    </RootStack.Navigator>
  );
};

export default AppNavigator;
