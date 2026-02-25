import AsyncStorage from '@react-native-async-storage/async-storage';
import generateSecureId from '../utils/generateSecureId';
import type { Profile, ProfileData, ProfileStats, Expense, AppSettings } from '../types';

const STORAGE_KEYS = {
  PROFILES: '@receipt_tracker_profiles',
  ACTIVE_PROFILE: '@receipt_tracker_active_profile',
} as const;

const DEFAULT_PROFILE_COLORS = [
  '#16a34a', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b',
  '#10b981', '#06b6d4', '#ef4444', '#f97316', '#6366f1',
];

// Cache for active profile ID to prevent repeated AsyncStorage calls
let activeProfileIdCache: string | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 5000; // 5 seconds TTL

// Validation helpers
const validateProfileName = (name: string): void => {
  if (!name || name.trim() === '') {
    throw new Error('Profile name is required');
  }
};

const checkDuplicateName = (profiles: Profile[], name: string, excludeId?: string): void => {
  const duplicateExists = profiles.some(
    (p) => p.id !== excludeId && p.name.toLowerCase() === name.trim().toLowerCase()
  );
  if (duplicateExists) {
    throw new Error('A profile with this name already exists');
  }
};

export const ProfileService = {
  async getProfiles(): Promise<Profile[]> {
    try {
      const profiles = await AsyncStorage.getItem(STORAGE_KEYS.PROFILES);
      if (!profiles) {
        const defaultProfile = await this.createDefaultProfile();
        return [defaultProfile];
      }
      return JSON.parse(profiles);
    } catch (error) {
      console.error('Error getting profiles:', error);
      throw new Error('Failed to load profiles');
    }
  },

  async saveProfiles(profiles: Profile[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(profiles));
    } catch (error) {
      console.error('Error saving profiles:', error);
      throw new Error('Failed to save profiles');
    }
  },

  async createDefaultProfile(): Promise<Profile> {
    const defaultProfile: Profile = {
      id: 'default',
      name: 'Personal',
      color: DEFAULT_PROFILE_COLORS[0],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await this.saveProfiles([defaultProfile]);
    await this.setActiveProfile(defaultProfile.id);
    return defaultProfile;
  },

  async getActiveProfileId(): Promise<string> {
    try {
      // Return cached value if still valid
      const now = Date.now();
      if (activeProfileIdCache && (now - cacheTimestamp) < CACHE_TTL) {
        return activeProfileIdCache;
      }

      const activeId = await AsyncStorage.getItem(STORAGE_KEYS.ACTIVE_PROFILE);
      if (!activeId) {
        const profiles = await this.getProfiles();
        const defaultId = profiles[0]?.id || 'default';
        await this.setActiveProfile(defaultId);
        return defaultId;
      }
      
      // Update cache
      activeProfileIdCache = activeId;
      cacheTimestamp = now;
      return activeId;
    } catch (error) {
      console.error('Error getting active profile:', error);
      return 'default';
    }
  },

  clearActiveProfileCache(): void {
    activeProfileIdCache = null;
    cacheTimestamp = 0;
  },

  async setActiveProfile(profileId: string): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.ACTIVE_PROFILE, profileId);
      // Update cache immediately
      activeProfileIdCache = profileId;
      cacheTimestamp = Date.now();
    } catch (error) {
      console.error('Error setting active profile:', error);
      throw new Error('Failed to set active profile');
    }
  },

  async getActiveProfile(): Promise<Profile> {
    try {
      const activeId = await this.getActiveProfileId();
      const profiles = await this.getProfiles();
      const profile = profiles.find((p) => p.id === activeId);
      
      if (!profile) {
        return await this.createDefaultProfile();
      }
      
      return profile;
    } catch (error) {
      console.error('Error getting active profile:', error);
      return await this.createDefaultProfile();
    }
  },

  async createProfile(data: ProfileData): Promise<Profile> {
    try {
      validateProfileName(data.name);
      const profiles = await this.getProfiles();
      checkDuplicateName(profiles, data.name);

      const newProfile: Profile = {
        id: await generateSecureId(),
        name: data.name.trim(),
        avatar: data.avatar,
        color: data.color || DEFAULT_PROFILE_COLORS[profiles.length % DEFAULT_PROFILE_COLORS.length],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await this.saveProfiles([...profiles, newProfile]);
      return newProfile;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Error creating profile:', error);
      throw new Error(`Failed to create profile: ${message}`);
    }
  },

  async updateProfile(profileId: string, updates: Partial<ProfileData>): Promise<Profile> {
    try {
      const profiles = await this.getProfiles();
      const profileIndex = profiles.findIndex((p) => p.id === profileId);

      if (profileIndex === -1) {
        throw new Error('Profile not found');
      }

      if (updates.name) {
        validateProfileName(updates.name);
        checkDuplicateName(profiles, updates.name, profileId);
      }

      const updatedProfile: Profile = {
        ...profiles[profileIndex],
        ...updates,
        name: updates.name?.trim() || profiles[profileIndex].name,
        updatedAt: new Date().toISOString(),
      };

      const updatedProfiles = [...profiles];
      updatedProfiles[profileIndex] = updatedProfile;

      await this.saveProfiles(updatedProfiles);
      return updatedProfile;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Error updating profile:', error);
      throw new Error(`Failed to update profile: ${message}`);
    }
  },

  async deleteProfile(profileId: string): Promise<void> {
    try {
      if (profileId === 'default') {
        throw new Error('Cannot delete the default profile');
      }

      const profiles = await this.getProfiles();
      const filteredProfiles = profiles.filter((p) => p.id !== profileId);

      if (filteredProfiles.length === profiles.length) {
        throw new Error('Profile not found');
      }

      if (filteredProfiles.length === 0) {
        throw new Error('Cannot delete the last profile');
      }

      const activeId = await this.getActiveProfileId();
      if (activeId === profileId) {
        await this.setActiveProfile(filteredProfiles[0].id);
      }

      await this.saveProfiles(filteredProfiles);
      await this.clearProfileData(profileId);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Error deleting profile:', error);
      throw new Error(`Failed to delete profile: ${message}`);
    }
  },

  async switchProfile(profileId: string): Promise<void> {
    try {
      const profiles = await this.getProfiles();
      const profile = profiles.find((p) => p.id === profileId);

      if (!profile) {
        throw new Error('Profile not found');
      }

      await this.setActiveProfile(profileId);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Error switching profile:', error);
      throw new Error(`Failed to switch profile: ${message}`);
    }
  },

  async getProfileStats(profileId: string): Promise<ProfileStats> {
    try {
      const expensesKey = `@receipt_tracker_expenses_${profileId}`;
      const settingsKey = `@receipt_tracker_settings_${profileId}`;

      const [expensesData, settingsData] = await Promise.all([
        AsyncStorage.getItem(expensesKey),
        AsyncStorage.getItem(settingsKey),
      ]);

      const expenses: Expense[] = expensesData ? JSON.parse(expensesData) : [];
      const settings: AppSettings = settingsData ? JSON.parse(settingsData) : { monthlyBudget: 5000 };

      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      const currentMonthExpenses = expenses.filter((expense) => {
        const expenseDate = new Date(expense.date);
        return expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear;
      });

      const totalSpent = currentMonthExpenses.reduce((sum, e) => sum + e.amount, 0);
      const budgetLimit = settings.monthlyBudget || 5000;
      const budgetUsed = Math.min((totalSpent / budgetLimit) * 100, 100);

      return {
        totalExpenses: expenses.length,
        totalSpent,
        budgetUsed,
      };
    } catch (error) {
      console.error('Error getting profile stats:', error);
      return {
        totalExpenses: 0,
        totalSpent: 0,
        budgetUsed: 0,
      };
    }
  },

  async clearProfileData(profileId: string): Promise<void> {
    try {
      const keysToRemove = [
        `@receipt_tracker_expenses_${profileId}`,
        `@receipt_tracker_budgets_${profileId}`,
        `@receipt_tracker_categories_${profileId}`,
        `@receipt_tracker_settings_${profileId}`,
      ];

      await Promise.all(keysToRemove.map((key) => AsyncStorage.removeItem(key)));
    } catch (error) {
      console.error('Error clearing profile data:', error);
      throw new Error('Failed to clear profile data');
    }
  },

  getProfileStorageKey(baseKey: string, profileId: string): string {
    return `${baseKey}_${profileId}`;
  },

  getDefaultProfileColors(): string[] {
    return DEFAULT_PROFILE_COLORS;
  },
};
