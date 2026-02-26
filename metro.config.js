const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

const defaultConfig = getDefaultConfig(__dirname);
const customSourceExts = ['ts', 'tsx', 'cjs', 'mjs'];
const customAssetExts = ['glb', 'gltf', 'ttf', 'otf', 'woff', 'woff2'];

config.resolver.sourceExts = [
  ...defaultConfig.resolver.sourceExts.filter(ext => !ext.includes('.')),
  ...customSourceExts
];
config.resolver.assetExts = [
  ...defaultConfig.resolver.assetExts,
  ...customAssetExts
];

module.exports = config;
