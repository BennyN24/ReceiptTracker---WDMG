import React, { createContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { ProfileService } from '../services/ProfileService';
import type { Profile } from '../types';

interface ProfileContextType {
  activeProfile: Profile | null;
  profiles: Profile[];
  loading: boolean;
  switchProfile: (profileId: string) => Promise<void>;
  refreshProfiles: () => Promise<void>;
  createProfile: (name: string, color: string, avatar?: string) => Promise<Profile>;
  updateProfile: (profileId: string, updates: { name?: string; color?: string; avatar?: string }) => Promise<Profile>;
  deleteProfile: (profileId: string) => Promise<void>;
}

export const ProfileContext = createContext<ProfileContextType>({
  activeProfile: null,
  profiles: [],
  loading: true,
  switchProfile: async () => {},
  refreshProfiles: async () => {},
  createProfile: async () => ({} as Profile),
  updateProfile: async () => ({} as Profile),
  deleteProfile: async () => {},
});

interface ProfileProviderProps {
  children: ReactNode;
}

export const ProfileProvider: React.FC<ProfileProviderProps> = ({ children }) => {
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const loadProfiles = useCallback(async () => {
    try {
      const [profilesList, active] = await Promise.all([
        ProfileService.getProfiles(),
        ProfileService.getActiveProfile(),
      ]);
      setProfiles(profilesList);
      setActiveProfile(active);
    } catch (error) {
      console.error('Error loading profiles:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  const switchProfile = useCallback(async (profileId: string) => {
    try {
      await ProfileService.switchProfile(profileId);
      const newActiveProfile = await ProfileService.getActiveProfile();
      setActiveProfile(newActiveProfile);
    } catch (error) {
      console.error('Error switching profile:', error);
      throw error;
    }
  }, []);

  const refreshProfiles = useCallback(async () => {
    await loadProfiles();
  }, [loadProfiles]);

  const createProfile = useCallback(async (name: string, color: string, avatar?: string) => {
    try {
      const newProfile = await ProfileService.createProfile({ name, color, avatar });
      await refreshProfiles();
      return newProfile;
    } catch (error) {
      console.error('Error creating profile:', error);
      throw error;
    }
  }, [refreshProfiles]);

  const updateProfile = useCallback(async (profileId: string, updates: { name?: string; color?: string; avatar?: string }) => {
    try {
      const updatedProfile = await ProfileService.updateProfile(profileId, updates);
      await refreshProfiles();
      return updatedProfile;
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  }, [refreshProfiles]);

  const deleteProfile = useCallback(async (profileId: string) => {
    try {
      await ProfileService.deleteProfile(profileId);
      await refreshProfiles();
    } catch (error) {
      console.error('Error deleting profile:', error);
      throw error;
    }
  }, [refreshProfiles]);

  return (
    <ProfileContext.Provider
      value={{
        activeProfile,
        profiles,
        loading,
        switchProfile,
        refreshProfiles,
        createProfile,
        updateProfile,
        deleteProfile,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
};
