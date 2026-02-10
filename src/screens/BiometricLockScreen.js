import React, { useEffect, useContext } from 'react';
import { View, StyleSheet, Animated, Image } from 'react-native';
import {
  Box,
  Text,
  VStack,
  Pressable,
} from '@gluestack-ui/themed';
import Icon from '@expo/vector-icons/MaterialIcons';
import BiometricService from '../services/BiometricService';
import { getColors } from '../styles/theme';
import { ThemeContext } from '../context/ThemeContext';

const logoImage = require('../../assets/logo.png');

const BiometricLockScreen = ({ onAuthenticated }) => {
  const { isDarkMode } = useContext(ThemeContext);
  const colors = getColors(isDarkMode);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const scaleAnim = React.useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    // Automatically prompt biometric on mount
    handleAuthenticate();
  }, []);

  const handleAuthenticate = async () => {
    try {
      const success = await BiometricService.authenticate();
      if (success) {
        onAuthenticated();
      }
    } catch (error) {
      console.error('Biometric lock screen auth error:', error);
    }
  };

  return (
    <Box flex={1} bg={colors.background} justifyContent="center" alignItems="center">
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
          alignItems: 'center',
        }}
      >
        <Image
          source={logoImage}
          style={styles.logo}
          resizeMode="contain"
        />

        <VStack alignItems="center" mt="$8" space="md">
          <Text fontSize="$2xl" fontWeight="$bold" color={colors.text}>
            Receipt Tracker
          </Text>
          <Text fontSize="$md" color={colors.textSecondary} textAlign="center" px="$8">
            Authenticate to access your data
          </Text>
        </VStack>

        <Pressable
          onPress={handleAuthenticate}
          mt="$10"
          bg={colors.primary}
          borderRadius="$full"
          w={80}
          h={80}
          justifyContent="center"
          alignItems="center"
          shadowColor={colors.primary}
          shadowOffset={{ width: 0, height: 4 }}
          shadowOpacity={0.3}
          shadowRadius={8}
          elevation={6}
        >
          <Icon name="fingerprint" size={40} color={colors.white} />
        </Pressable>

        <Text fontSize="$sm" color={colors.textSecondary} mt="$4">
          Tap to authenticate
        </Text>
      </Animated.View>
    </Box>
  );
};

const styles = StyleSheet.create({
  logo: {
    width: 120,
    height: 120,
  },
});

export default BiometricLockScreen;
