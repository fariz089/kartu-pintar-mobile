import React, { useState, useEffect } from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../utils/theme';

import LoginScreen from '../screens/LoginScreen';
import DashboardScreen from '../screens/DashboardScreen';
import ScanQRScreen from '../screens/ScanQRScreen';
import ScanNFCScreen from '../screens/ScanNFCScreen';
import ScanResultScreen from '../screens/ScanResultScreen';
import POSScreen from '../screens/POSScreen';
import TopUpScreen from '../screens/TopUpScreen';
import AnggotaListScreen from '../screens/AnggotaListScreen';
import TransaksiScreen from '../screens/TransaksiScreen';
import LacakKartuScreen from '../screens/LacakKartuScreen';
import LocationHistoryScreen from '../screens/LocationHistoryScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const navTheme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: COLORS.bgDark } };
const screenOpts = { headerStyle: { backgroundColor: COLORS.bgDark }, headerTintColor: COLORS.textPrimary, headerTitleStyle: { fontWeight: '700' } };
const tabStyle = { backgroundColor: COLORS.bgCard, borderTopColor: COLORS.border, height: 60, paddingBottom: 8, paddingTop: 4 };

const tabIcons = {
  Dashboard: ['grid', 'grid-outline'],
  Scan: ['scan', 'scan-outline'],
  Bayar: ['card', 'card-outline'],
  Kasir: ['cart', 'cart-outline'],
  TopUp: ['wallet', 'wallet-outline'],
  Riwayat: ['receipt', 'receipt-outline'],
  Penjualan: ['receipt', 'receipt-outline'],
  ScanQR: ['scan', 'scan-outline'],
  ScanNFC: ['wifi', 'wifi-outline'],
  Profil: ['person-circle', 'person-circle-outline'],
};

function getTabScreenOptions(route) {
  return {
    ...screenOpts,
    tabBarStyle: tabStyle,
    tabBarActiveTintColor: COLORS.accent,
    tabBarInactiveTintColor: COLORS.textMuted,
    tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
    tabBarIcon: ({ focused, color }) => {
      const icons = tabIcons[route.name] || ['help-circle', 'help-circle-outline'];
      return <Ionicons name={focused ? icons[0] : icons[1]} size={22} color={color} />;
    },
  };
}

function AdminTabs() {
  return (
    <Tab.Navigator screenOptions={({ route }) => getTabScreenOptions(route)}>
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ headerShown: false }} />
      <Tab.Screen name="Kasir" component={POSScreen} options={{ title: 'Kasir', headerTitle: 'Point of Sale' }} />
      <Tab.Screen name="Scan" component={ScanQRScreen} options={{ title: 'Scan', headerTitle: 'Scan QR Code' }} />
      <Tab.Screen name="TopUp" component={TopUpScreen} options={{ title: 'Top Up', headerTitle: 'Top Up Saldo' }} />
      <Tab.Screen name="Profil" component={ProfileScreen} options={{ title: 'Profil', headerTitle: 'Profil Saya' }} />
    </Tab.Navigator>
  );
}

function KantinTabs() {
  return (
    <Tab.Navigator screenOptions={({ route }) => getTabScreenOptions(route)}>
      <Tab.Screen name="Kasir" component={POSScreen} options={{ title: 'Kasir', headerTitle: 'Point of Sale' }} />
      <Tab.Screen name="Scan" component={ScanQRScreen} options={{ title: 'Scan', headerTitle: 'Scan QR' }} />
      <Tab.Screen name="Penjualan" component={TransaksiScreen} options={{ title: 'Penjualan', headerTitle: 'Riwayat Penjualan' }} />
      <Tab.Screen name="Profil" component={ProfileScreen} options={{ title: 'Profil', headerTitle: 'Profil Saya' }} />
    </Tab.Navigator>
  );
}

function UserTabs() {
  return (
    <Tab.Navigator screenOptions={({ route }) => getTabScreenOptions(route)}>
      <Tab.Screen name="ScanQR" component={ScanQRScreen} options={{ title: 'Scan QR', headerTitle: 'Scan QR Code' }} />
      <Tab.Screen name="ScanNFC" component={ScanNFCScreen} options={{ title: 'Scan NFC', headerTitle: 'Scan NFC' }} />
      <Tab.Screen name="Riwayat" component={TransaksiScreen} options={{ title: 'Riwayat', headerTitle: 'Transaksi Saya' }} />
      <Tab.Screen name="Profil" component={ProfileScreen} options={{ title: 'Profil', headerTitle: 'Profil Saya' }} />
    </Tab.Navigator>
  );
}

function MainTabsRouter() {
  const [role, setRole] = useState('user');
  useEffect(() => {
    (async () => {
      const userStr = await AsyncStorage.getItem('user');
      if (userStr) { const u = JSON.parse(userStr); setRole(u.role || 'user'); }
    })();
  }, []);
  if (role === 'admin') return <AdminTabs />;
  if (role === 'operator_kantin') return <KantinTabs />;
  return <UserTabs />;
}

export default function AppNavigation() {
  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator screenOptions={screenOpts}>
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        <Stack.Screen name="MainTabs" component={MainTabsRouter} options={{ headerShown: false }} />
        <Stack.Screen name="ScanQR" component={ScanQRScreen} options={{ title: 'Scan QR Code' }} />
        <Stack.Screen name="ScanNFC" component={ScanNFCScreen} options={{ title: 'Scan NFC' }} />
        <Stack.Screen name="ScanResult" component={ScanResultScreen} options={{ title: 'Identitas Anggota' }} />
        <Stack.Screen name="POS" component={POSScreen} options={{ title: 'Point of Sale' }} />
        <Stack.Screen name="TopUp" component={TopUpScreen} options={{ title: 'Top Up Saldo' }} />
        <Stack.Screen name="AnggotaList" component={AnggotaListScreen} options={{ title: 'Data Anggota' }} />
        <Stack.Screen name="Transaksi" component={TransaksiScreen} options={{ title: 'Riwayat Transaksi' }} />
        <Stack.Screen name="LacakKartu" component={LacakKartuScreen} options={{ title: 'Lacak Kartu' }} />
        <Stack.Screen name="LocationHistory" component={LocationHistoryScreen} options={{ title: 'Riwayat Lokasi', headerShown: false }} />
        <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profil Saya' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
