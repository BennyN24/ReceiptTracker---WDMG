import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native';
import {
  Card,
  Button,
  List,
  TextInput,
  Divider,
} from 'react-native-paper';
import Icon from '@expo/vector-icons/MaterialIcons';
import { StorageService } from '../services/StorageService';

const SettingsScreen = ({ navigation }) => {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [editingBudget, setEditingBudget] = useState(false);
  const [tempBudget, setTempBudget] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const settingsData = await StorageService.getSettings();
      setSettings(settingsData);
      setTempBudget(settingsData.monthlyBudget?.toString() || '1550');
    } catch (error) {
      Alert.alert('Error', 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key, value) => {
    try {
      const updatedSettings = { ...settings, [key]: value };
      await StorageService.saveSettings(updatedSettings);
      setSettings(updatedSettings);
    } catch (error) {
      Alert.alert('Error', 'Failed to update setting');
    }
  };

  const handleSaveBudget = async () => {
    const budgetAmount = parseFloat(tempBudget);
    
    if (!tempBudget || isNaN(budgetAmount) || budgetAmount <= 0) {
      Alert.alert('Error', 'Please enter a valid budget amount');
      return;
    }

    await updateSetting('monthlyBudget', budgetAmount);
    setEditingBudget(false);
    Alert.alert('Success', 'Monthly budget updated successfully');
  };

  const handleExportData = async () => {
    try {
      const [expenses, budgets] = await Promise.all([
        StorageService.getExpenses(),
        StorageService.getBudgets(),
      ]);

      const exportData = {
        expenses,
        budgets,
        settings,
        exportDate: new Date().toISOString(),
      };

      // In a real app, you'd share this data or save to a file
      Alert.alert(
        'Export Data',
        'Data exported successfully! (In a real app, this would save to a file or share)',
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to export data');
    }
  };

  const handleClearData = () => {
    Alert.alert(
      'Clear All Data',
      'This will permanently delete all your expenses, budgets, and settings. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Everything',
          style: 'destructive',
          onPress: async () => {
            try {
              await StorageService.saveExpenses([]);
              await StorageService.saveBudgets([]);
              await StorageService.saveSettings(StorageService.getDefaultSettings());
              await loadSettings();
              Alert.alert('Success', 'All data has been cleared');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear data');
            }
          },
        },
      ]
    );
  };

  const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading settings...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>Manage your app preferences</Text>
      </View>

      {/* Budget Settings */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Budget Settings</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Monthly Budget</Text>
              <Text style={styles.settingValue}>
                {formatCurrency(settings.monthlyBudget || 1550)}
              </Text>
            </View>
            <Button
              mode="outlined"
              onPress={() => setEditingBudget(true)}
              style={styles.editButton}
            >
              Edit
            </Button>
          </View>

          {editingBudget && (
            <View style={styles.budgetEditor}>
              <TextInput
                label="Monthly Budget Amount"
                value={tempBudget}
                onChangeText={(text) => {
                  // Only allow numeric input with decimal point
                  const numericValue = text.replace(/[^0-9.]/g, '');
                  // Ensure only one decimal point
                  const parts = numericValue.split('.');
                  if (parts.length > 2) {
                    setTempBudget(parts[0] + '.' + parts[1]);
                  } else {
                    setTempBudget(numericValue);
                  }
                }}
                mode="outlined"
                keyboardType="numeric"
                style={styles.budgetInput}
              />
              <View style={styles.budgetButtons}>
                <Button
                  mode="contained"
                  onPress={handleSaveBudget}
                  style={styles.saveButton}
                >
                  Save
                </Button>
                <Button
                  mode="text"
                  onPress={() => {
                    setEditingBudget(false);
                    setTempBudget(settings.monthlyBudget?.toString() || '1550');
                  }}
                >
                  Cancel
                </Button>
              </View>
            </View>
          )}
        </Card.Content>
      </Card>

      {/* App Preferences */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>App Preferences</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Push Notifications</Text>
              <Text style={styles.settingDescription}>
                Get alerts for budget limits and reminders
              </Text>
            </View>
            <Switch
              value={settings.notifications}
              onValueChange={(value) => updateSetting('notifications', value)}
              trackColor={{ false: '#e2e8f0', true: '#c7d2fe' }}
              thumbColor={settings.notifications ? '#6366f1' : '#ffffff'}
            />
          </View>

          <Divider style={styles.divider} />

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Dark Mode</Text>
              <Text style={styles.settingDescription}>
                Use dark theme across the app
              </Text>
            </View>
            <Switch
              value={settings.darkMode}
              onValueChange={(value) => updateSetting('darkMode', value)}
              trackColor={{ false: '#e2e8f0', true: '#c7d2fe' }}
              thumbColor={settings.darkMode ? '#6366f1' : '#ffffff'}
            />
          </View>
        </Card.Content>
      </Card>

      {/* Data Management */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Data Management</Text>
          
          <TouchableOpacity
            style={styles.actionItem}
            onPress={handleExportData}
          >
            <View style={styles.actionInfo}>
              <Icon name="file-download" size={24} color="#6366f1" />
              <View style={styles.actionText}>
                <Text style={styles.actionLabel}>Export Data</Text>
                <Text style={styles.actionDescription}>
                  Download all your expenses and budgets
                </Text>
              </View>
            </View>
            <Icon name="chevron-right" size={24} color="#94a3b8" />
          </TouchableOpacity>

          <Divider style={styles.divider} />

          <TouchableOpacity
            style={styles.actionItem}
            onPress={handleClearData}
          >
            <View style={styles.actionInfo}>
              <Icon name="delete-forever" size={24} color="#ef4444" />
              <View style={styles.actionText}>
                <Text style={[styles.actionLabel, { color: '#ef4444' }]}>
                  Clear All Data
                </Text>
                <Text style={styles.actionDescription}>
                  Permanently delete all expenses and budgets
                </Text>
              </View>
            </View>
            <Icon name="chevron-right" size={24} color="#94a3b8" />
          </TouchableOpacity>
        </Card.Content>
      </Card>

      {/* About */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>About</Text>
          
          <View style={styles.aboutItem}>
            <Text style={styles.aboutLabel}>App Version</Text>
            <Text style={styles.aboutValue}>1.0.0</Text>
          </View>

          <View style={styles.aboutItem}>
            <Text style={styles.aboutLabel}>Developer</Text>
            <Text style={styles.aboutValue}>Receipt Tracker Pro</Text>
          </View>
        </Card.Content>
      </Card>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 20,
    paddingTop: 40,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
  },
  card: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: '#ffffff',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1e293b',
    marginBottom: 4,
  },
  settingValue: {
    fontSize: 16,
    color: '#6366f1',
    fontWeight: '600',
  },
  settingDescription: {
    fontSize: 14,
    color: '#64748b',
  },
  editButton: {
    borderColor: '#6366f1',
  },
  budgetEditor: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  budgetInput: {
    marginBottom: 12,
  },
  budgetButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  saveButton: {
    backgroundColor: '#6366f1',
  },
  divider: {
    marginVertical: 16,
  },
  actionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  actionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  actionText: {
    marginLeft: 12,
    flex: 1,
  },
  actionLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1e293b',
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 14,
    color: '#64748b',
  },
  aboutItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  aboutLabel: {
    fontSize: 16,
    color: '#64748b',
  },
  aboutValue: {
    fontSize: 16,
    color: '#1e293b',
    fontWeight: '500',
  },
  bottomPadding: {
    height: 20,
  },
});

export default SettingsScreen;
