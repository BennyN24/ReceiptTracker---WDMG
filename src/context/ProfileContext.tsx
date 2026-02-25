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
      // Optimized: Add to existing profiles instead of refetching
      setProfiles(prev => [...prev, newProfile]);
      return newProfile;
    } catch (error) {
      console.error('Error creating profile:', error);
      throw error;
    }
  }, []);

  const updateProfile = useCallback(async (profileId: string, updates: { name?: string; color?: string; avatar?: string }) => {
    try {
      const updatedProfile = await ProfileService.updateProfile(profileId, updates);
      // Optimized: Update specific profile instead of refetching all
      setProfiles(prev => prev.map(p => p.id === profileId ? updatedProfile : p));
      if (activeProfile?.id === profileId) {
        setActiveProfile(updatedProfile);
      }
      return updatedProfile;
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  }, [activeProfile]);

  const deleteProfile = useCallback(async (profileId: string) => {
    try {
      await ProfileService.deleteProfile(profileId);
      // Optimized: Remove from state and update active if needed
      setProfiles(prev => prev.filter(p => p.id !== profileId));
      if (activeProfile?.id === profileId) {
        const newActive = await ProfileService.getActiveProfile();
        setActiveProfile(newActive);
      }
    } catch (error) {
      console.error('Error deleting profile:', error);
      throw error;
    }
  }, [activeProfile]);

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
