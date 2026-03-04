import React, { useState } from 'react';
import { Box } from '@gluestack-ui/themed';
import { useThemeColors } from '../hooks/useThemeColors';
import type { ColorPalette } from '../styles/theme';

let GoogleBannerAd: any;
let BannerAdSize: any;

try {
  const adModule = require('react-native-google-mobile-ads');
  GoogleBannerAd = adModule.BannerAd;
  BannerAdSize = adModule.BannerAdSize;
} catch (error) {
  console.log('Google Mobile Ads not available (Expo Go mode)');
}

interface BannerAdProps {
  adUnitId: string;
  size?: any;
}

const BannerAd: React.FC<BannerAdProps> = ({ 
  adUnitId, 
  size = BannerAdSize?.ANCHORED_ADAPTIVE_BANNER 
}) => {
  const colors: ColorPalette = useThemeColors();
  const [adError, setAdError] = useState(false);

  const handleAdLoaded = (): void => {
    setAdError(false);
  };

  const handleAdFailedToLoad = (error: Error): void => {
    console.error('Banner ad failed to load:', error);
    setAdError(true);
  };

  if (!GoogleBannerAd) {
    return null;
  }

  if (adError) {
    return null;
  }

  return (
    <Box
      width="100%"
      alignItems="center"
      justifyContent="center"
      backgroundColor={colors.background}
      paddingVertical={8}
    >
      <GoogleBannerAd
        unitId={adUnitId}
        size={size}
        requestOptions={{
          requestNonPersonalizedAdsOnly: false,
        }}
        onAdLoaded={handleAdLoaded}
        onAdFailedToLoad={handleAdFailedToLoad}
      />
    </Box>
  );
};

export default BannerAd;
