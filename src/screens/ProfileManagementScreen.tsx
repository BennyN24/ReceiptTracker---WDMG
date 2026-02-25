import React, { useState, useEffect, useContext, useCallback, useMemo, memo } from 'react';
import {
  ScrollView,
  Alert,
  TextInput as RNTextInput,
} from 'react-native';
import {
  Box,
  Text,
  VStack,
  HStack,
  Heading,
  Pressable,
  Spinner,
  Input,
  InputField,
  Modal,
  ModalBackdrop,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  Button,
  ButtonText,
} from '@gluestack-ui/themed';
import Icon from '@expo/vector-icons/MaterialIcons';
import Toast from 'react-native-toast-message';
import { ProfileContext } from '../context/ProfileContext';
import { ProfileService } from '../services/ProfileService';
import { useThemeColors } from '../hooks/useThemeColors';
import { ThemeContext } from '../context/ThemeContext';
import type { ColorPalette } from '../styles/theme';
import type { Profile, ProfileStats } from '../types';

interface ProfileManagementScreenProps {
  navigation: any;
}

const ProfileManagementScreen: React.FC<ProfileManagementScreenProps> = ({ navigation }) => {
  const colors: ColorPalette = useThemeColors();
  const { isDarkMode } = useContext(ThemeContext);
  const { activeProfile, profiles, switchProfile, createProfile, updateProfile, deleteProfile, refreshProfiles } = useContext(ProfileContext);
  
  const [loading, setLoading] = useState<boolean>(false);
  const [profileStats, setProfileStats] = useState<Map<string, ProfileStats>>(new Map());
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [newProfileName, setNewProfileName] = useState<string>('');
  const [newProfileColor, setNewProfileColor] = useState<string>('');
  const [editProfileName, setEditProfileName] = useState<string>('');
  const [editProfileColor, setEditProfileColor] = useState<string>('');

  const availableColors = ProfileService.getDefaultProfileColors();

  const loadProfileStats = useCallback(async () => {
    try {
      // Parallel loading instead of sequential
      const statsPromises = profiles.map(profile => 
        ProfileService.getProfileStats(profile.id)
          .then(stats => ({ profileId: profile.id, stats }))
      );
      
      const results = await Promise.all(statsPromises);
      const statsMap = new Map<string, ProfileStats>();
      results.forEach(({ profileId, stats }) => {
        statsMap.set(profileId, stats);
      });
      
      setProfileStats(statsMap);
    } catch (error) {
      console.error('Error loading profile stats:', error);
    }
  }, [profiles]);

  useEffect(() => {
    loadProfileStats();
  }, [loadProfileStats]);

  const handleSwitchProfile = async (profileId: string) => {
    try {
      setLoading(true);
      await switchProfile(profileId);
      Toast.show({
        type: 'success',
        text1: 'Profile Switched',
        text2: 'Successfully switched to the selected profile',
        position: 'top',
        visibilityTime: 2000,
      });
      navigation.goBack();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to switch profile',
        position: 'top',
        visibilityTime: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProfile = async () => {
    if (!newProfileName.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Profile name is required',
        position: 'top',
        visibilityTime: 3000,
      });
      return;
    }

    try {
      setLoading(true);
      const color = newProfileColor || availableColors[profiles.length % availableColors.length];
      await createProfile(newProfileName, color);
      setShowCreateModal(false);
      setNewProfileName('');
      setNewProfileColor('');
      Toast.show({
        type: 'success',
        text1: 'Profile Created',
        text2: 'New profile has been created successfully',
        position: 'top',
        visibilityTime: 2000,
      });
      await loadProfileStats();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create profile';
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: message,
        position: 'top',
        visibilityTime: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!selectedProfile) return;

    if (!editProfileName.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Profile name is required',
        position: 'top',
        visibilityTime: 3000,
      });
      return;
    }

    try {
      setLoading(true);
      await updateProfile(selectedProfile.id, {
        name: editProfileName,
        color: editProfileColor,
      });
      setShowEditModal(false);
      setSelectedProfile(null);
      setEditProfileName('');
      setEditProfileColor('');
      Toast.show({
        type: 'success',
        text1: 'Profile Updated',
        text2: 'Profile has been updated successfully',
        position: 'top',
        visibilityTime: 2000,
      });
      await loadProfileStats();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update profile';
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: message,
        position: 'top',
        visibilityTime: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProfile = (profile: Profile) => {
    if (profile.id === 'default') {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Cannot delete the default profile',
        position: 'top',
        visibilityTime: 3000,
      });
      return;
    }

    Alert.alert(
      'Delete Profile',
      `Are you sure you want to delete "${profile.name}"? All expenses, budgets, and settings for this profile will be permanently deleted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await deleteProfile(profile.id);
              Toast.show({
                type: 'success',
                text1: 'Profile Deleted',
                text2: 'Profile has been deleted successfully',
                position: 'top',
                visibilityTime: 2000,
              });
              await loadProfileStats();
            } catch (error) {
              const message = error instanceof Error ? error.message : 'Failed to delete profile';
              Toast.show({
                type: 'error',
                text1: 'Error',
                text2: message,
                position: 'top',
                visibilityTime: 3000,
              });
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const openEditModal = (profile: Profile) => {
    setSelectedProfile(profile);
    setEditProfileName(profile.name);
    setEditProfileColor(profile.color);
    setShowEditModal(true);
  };

  const formatCurrency = useCallback((amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  }, []);

  const handleSwitchProfileMemoized = useCallback(handleSwitchProfile, [switchProfile, navigation]);
  const handleDeleteProfileMemoized = useCallback(handleDeleteProfile, [deleteProfile]);
  const openEditModalMemoized = useCallback(openEditModal, []);

  return (
    <Box flex={1} bg={colors.backgroundSecondary}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Box px="$5" pt="$16" pb="$4">
          <HStack alignItems="center" mb="$4">
            <Pressable onPress={() => navigation.goBack()} mr="$3">
              <Icon name="arrow-back" size={24} color={isDarkMode ? '#ffffff' : colors.text} />
            </Pressable>
            <Heading size="2xl" color={isDarkMode ? '#ffffff' : colors.text}>Profiles</Heading>
          </HStack>
          <Text color={colors.textSecondary} fontSize="$md">
            Manage your profiles and switch between different expense tracking contexts.
          </Text>
        </Box>

        <Box px="$5" mb="$5">
          <Pressable
            onPress={() => setShowCreateModal(true)}
            bg={colors.primary}
            borderRadius="$lg"
            py="$3.5"
            alignItems="center"
            flexDirection="row"
            justifyContent="center"
          >
            <Icon name="add" size={20} color={colors.white} />
            <Text color={colors.white} fontWeight="$semibold" fontSize="$md" ml="$2">
              Create New Profile
            </Text>
          </Pressable>
        </Box>

        <VStack px="$5" space="md">
          {profiles.map((profile) => (
            <ProfileCard
              key={profile.id}
              profile={profile}
              stats={profileStats.get(profile.id)}
              isActive={activeProfile?.id === profile.id}
              colors={colors}
              onSwitch={handleSwitchProfileMemoized}
              onEdit={openEditModalMemoized}
              onDelete={handleDeleteProfileMemoized}
              formatCurrency={formatCurrency}
            />
          ))}
        </VStack>
      </ScrollView>

      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)}>
        <ModalBackdrop />
        <ModalContent bg={colors.white}>
          <ModalHeader>
            <Heading size="lg" color={colors.text}>Create New Profile</Heading>
            <ModalCloseButton>
              <Icon name="close" size={24} color={colors.text} />
            </ModalCloseButton>
          </ModalHeader>
          <ModalBody>
            <VStack space="md">
              <Box>
                <Text fontSize="$sm" fontWeight="$medium" color={colors.text} mb="$2">
                  Profile Name
                </Text>
                <Input variant="outline" size="md">
                  <InputField
                    placeholder="e.g., Business, Family"
                    value={newProfileName}
                    onChangeText={setNewProfileName}
                  />
                </Input>
              </Box>

              <Box>
                <Text fontSize="$sm" fontWeight="$medium" color={colors.text} mb="$2">
                  Profile Color
                </Text>
                <HStack flexWrap="wrap" space="sm">
                  {availableColors.map((color) => (
                    <Pressable
                      key={color}
                      onPress={() => setNewProfileColor(color)}
                      w={40}
                      h={40}
                      borderRadius="$full"
                      bg={color}
                      borderWidth={newProfileColor === color ? 3 : 0}
                      borderColor={colors.primary}
                      mb="$2"
                    />
                  ))}
                </HStack>
              </Box>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <HStack space="md" w="$full">
              <Button
                flex={1}
                variant="outline"
                onPress={() => {
                  setShowCreateModal(false);
                  setNewProfileName('');
                  setNewProfileColor('');
                }}
              >
                <ButtonText>Cancel</ButtonText>
              </Button>
              <Button
                flex={1}
                bg={colors.primary}
                onPress={handleCreateProfile}
                isDisabled={loading}
              >
                {loading ? <Spinner color={colors.white} /> : <ButtonText>Create</ButtonText>}
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)}>
        <ModalBackdrop />
        <ModalContent bg={colors.white}>
          <ModalHeader>
            <Heading size="lg" color={colors.text}>Edit Profile</Heading>
            <ModalCloseButton>
              <Icon name="close" size={24} color={colors.text} />
            </ModalCloseButton>
          </ModalHeader>
          <ModalBody>
            <VStack space="md">
              <Box>
                <Text fontSize="$sm" fontWeight="$medium" color={colors.text} mb="$2">
                  Profile Name
                </Text>
                <Input variant="outline" size="md">
                  <InputField
                    placeholder="Profile name"
                    value={editProfileName}
                    onChangeText={setEditProfileName}
                  />
                </Input>
              </Box>

              <Box>
                <Text fontSize="$sm" fontWeight="$medium" color={colors.text} mb="$2">
                  Profile Color
                </Text>
                <HStack flexWrap="wrap" space="sm">
                  {availableColors.map((color) => (
                    <Pressable
                      key={color}
                      onPress={() => setEditProfileColor(color)}
                      w={40}
                      h={40}
                      borderRadius="$full"
                      bg={color}
                      borderWidth={editProfileColor === color ? 3 : 0}
                      borderColor={colors.primary}
                      mb="$2"
                    />
                  ))}
                </HStack>
              </Box>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <HStack space="md" w="$full">
              <Button
                flex={1}
                variant="outline"
                onPress={() => {
                  setShowEditModal(false);
                  setSelectedProfile(null);
                  setEditProfileName('');
                  setEditProfileColor('');
                }}
              >
                <ButtonText>Cancel</ButtonText>
              </Button>
              <Button
                flex={1}
                bg={colors.primary}
                onPress={handleUpdateProfile}
                isDisabled={loading}
              >
                {loading ? <Spinner color={colors.white} /> : <ButtonText>Update</ButtonText>}
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {loading && (
        <Box
          position="absolute"
          top={0}
          left={0}
          right={0}
          bottom={0}
          bg="rgba(0,0,0,0.3)"
          alignItems="center"
          justifyContent="center"
        >
          <Spinner size="large" color={colors.primary} />
        </Box>
      )}
    </Box>
  );
};

interface ProfileCardProps {
  profile: Profile;
  stats: ProfileStats | undefined;
  isActive: boolean;
  colors: ColorPalette;
  onSwitch: (profileId: string) => void;
  onEdit: (profile: Profile) => void;
  onDelete: (profile: Profile) => void;
  formatCurrency: (amount: number) => string;
}

const ProfileCard = memo<ProfileCardProps>(({ 
  profile, 
  stats, 
  isActive, 
  colors, 
  onSwitch, 
  onEdit, 
  onDelete,
  formatCurrency 
}) => (
  <Pressable
    onPress={() => !isActive && onSwitch(profile.id)}
    bg={colors.white}
    borderRadius="$xl"
    p="$4"
    borderWidth={isActive ? 2 : 0}
    borderColor={isActive ? colors.primary : 'transparent'}
    shadowColor={colors.black}
    shadowOffset={{ width: 0, height: 2 }}
    shadowOpacity={0.08}
    shadowRadius={8}
    elevation={3}
  >
    <HStack justifyContent="space-between" alignItems="center">
      <HStack alignItems="center" flex={1}>
        <Box
          w={48}
          h={48}
          borderRadius="$full"
          bg={profile.color}
          alignItems="center"
          justifyContent="center"
          mr="$3"
        >
          <Text color={colors.white} fontWeight="$bold" fontSize="$xl">
            {profile.name.charAt(0).toUpperCase()}
          </Text>
        </Box>
        <VStack flex={1}>
          <HStack alignItems="center" space="xs">
            <Text fontWeight="$semibold" fontSize="$lg" color={colors.text}>
              {profile.name}
            </Text>
            {isActive && (
              <Box bg={colors.primary} borderRadius="$md" px="$2" py="$0.5">
                <Text color={colors.white} fontSize="$xs" fontWeight="$semibold">
                  Active
                </Text>
              </Box>
            )}
          </HStack>
          {stats && (
            <Text fontSize="$sm" color={colors.textSecondary} mt="$1">
              {stats.totalExpenses} expenses • {formatCurrency(stats.totalSpent)} spent
            </Text>
          )}
        </VStack>
      </HStack>

      <HStack space="xs">
        <Pressable
          onPress={() => onEdit(profile)}
          bg={colors.backgroundSecondary}
          borderRadius="$lg"
          p="$2"
        >
          <Icon name="edit" size={20} color={colors.primary} />
        </Pressable>
        {profile.id !== 'default' && (
          <Pressable
            onPress={() => onDelete(profile)}
            bg={colors.errorLight}
            borderRadius="$lg"
            p="$2"
          >
            <Icon name="delete" size={20} color={colors.error} />
          </Pressable>
        )}
      </HStack>
    </HStack>
  </Pressable>
));

ProfileCard.displayName = 'ProfileCard';

export default ProfileManagementScreen;
