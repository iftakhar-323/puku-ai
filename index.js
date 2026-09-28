import { registerRootComponent } from 'expo';
import { AppRegistry } from 'react-native';
import App from './App';

// Register for both bare React Native (MainActivity: PukuAI) and Expo platform
AppRegistry.registerComponent('PukuAI', () => App);
registerRootComponent(App);
