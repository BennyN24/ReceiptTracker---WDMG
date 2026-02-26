const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.sourceExts = ['web.tsx', 'web.ts', 'web.jsx', 'web.js', 'native.tsx', 'native.ts', 'native.jsx', 'native.js', 'tsx', 'ts', 'jsx', 'js', 'json', 'cjs', 'mjs'];
config.resolver.assetExts = ['glb', 'gltf', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'ttf', 'otf', 'woff', 'woff2'];

module.exports = config;
