import { registerRootComponent } from 'expo';
import { LogBox } from 'react-native';

import App from './App';

// Suppress known warnings from dependencies
// These are not errors in application code but from Gluestack UI v1.1.20 and React Native Web
LogBox.ignoreLogs([
  // Gluestack UI uses deprecated shadow props - safe to ignore until upgraded
  'shadow* style props are deprecated',
  // React Native Web renders transform-origin as CSS - safe to ignore
  'Invalid DOM property `transform-origin`',
  // Gluestack UI uses deprecated pointerEvents prop on web - safe to ignore
  'props.pointerEvents is deprecated',
  // Native animated module not available in web - expected fallback behavior
  'Animated: `useNativeDriver` is not supported',
]);

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
