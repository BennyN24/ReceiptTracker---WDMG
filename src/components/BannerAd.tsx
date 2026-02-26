import React, { useState } from 'react';
import { Box } from '@gluestack-ui/themed';
import { BannerAd as GoogleBannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { useThemeColors } from '../hooks/useThemeColors';
import type { ColorPalette } from '../styles/theme';

interface BannerAdProps {
  adUnitId: string;
  size?: BannerAdSize;
}

const BannerAd: React.FC<BannerAdProps> = ({ 
  adUnitId, 
  size = BannerAdSize.ANCHORED_ADAPTIVE_BANNER 
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
