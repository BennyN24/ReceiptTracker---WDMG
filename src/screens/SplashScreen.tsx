import React, { useEffect } from 'react';
import { View, StyleSheet, Animated, Text, Image, ImageSourcePropType } from 'react-native';

const logoImage: ImageSourcePropType = require('../../assets/logo.png');

const SplashScreen: React.FC = () => {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const scaleAnim = React.useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, scaleAnim]);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Image
          source={logoImage}
          style={styles.logo}
          resizeMode="contain"
        />

        <View style={styles.textContainer}>
          <Text style={styles.titleText}>RECEIPT <Text style={styles.trackerText}>TRACKER</Text></Text>
        </View>
      </Animated.View>

      <View style={styles.loaderContainer}>
        <View style={styles.loaderBar} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    marginBottom: 60,
  },
  logo: {
    width: 220,
    height: 220,
  },
  textContainer: {
    marginTop: 40,
    alignItems: 'center',
  },
  titleText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: 1,
  },
  trackerText: {
    fontSize: 28,
    fontWeight: '400',
    color: '#64748b',
    letterSpacing: 0.5,
  },
  loaderContainer: {
    position: 'absolute',
    bottom: 60,
    width: 120,
    height: 4,
    backgroundColor: '#e2e8f0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  loaderBar: {
    height: '100%',
    backgroundColor: '#16a34a',
    borderRadius: 2,
    width: '30%',
  },
});

export default SplashScreen;
