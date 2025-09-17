import React, { useState, useEffect } from 'react';
import { StyleSheet, Platform } from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as NavigationBar from 'expo-navigation-bar';
import GameBoard from './components/GameBoard';

export default function App() {
  const [key, setKey] = useState(0);

  // Force landscape orientation and hide system UI on app start
  useEffect(() => {
    async function setupImmersiveMode() {
      // Lock to landscape orientation
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
      
      // Hide navigation bar on Android
      if (Platform.OS === 'android') {
        await NavigationBar.setVisibilityAsync('hidden');
        await NavigationBar.setBehaviorAsync('overlay-swipe');
      }
    }
    setupImmersiveMode();
  }, []);

  const handleRestart = () => {
    setKey((prev) => prev + 1);
  };

  return <GameBoard key={key} onRestart={handleRestart} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
