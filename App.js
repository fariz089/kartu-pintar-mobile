import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import AppNavigation from './src/navigation/AppNavigation';
import { COLORS } from './src/utils/theme';
import { authAPI } from './src/services/api';

export default function App() {
  return (
    <>
      <StatusBar style="light" />
      <AppNavigation />
    </>
  );
}
