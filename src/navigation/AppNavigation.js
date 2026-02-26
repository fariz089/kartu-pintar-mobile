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
import PembayaranScreen from '../screens/PembayaranScreen';
import TopUpScreen from '../screens/TopUpScreen';
import AnggotaListScreen from '../screens/AnggotaListScreen';
import TransaksiScreen from '../screens/TransaksiScreen';
import LacakKartuScreen from '../screens/LacakKartuScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const navTheme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: COLORS.bgDark } };
const screenOpts = { headerStyle: { backgroundColor: COLORS.bgDark }, headerTintColor: COLORS.textPrimary, headerTitleStyle: { fontWeight: '700' } };
const tabStyle = { backgroundColor: COLORS.bgCard, borderTopColor: COLORS.border, height: 60, paddingBottom: 8, paddingTop: 4 };

function AdminTabs() {
  return (
    <Tab.Navigator screenOptions={({ route }) => ({
      ...screenOpts, tabBarStyle: tabStyle, tabBarActiveTintColor: COLORS.accent, tabBarInactiveTintColor: COLORS.textMuted,
      tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
      tabBarIcon: ({ focused, color }) => {
        const icons = { Dashboard: 'grid', Scan: 'scan', Bayar: 'card', TopUp: 'wallet', Riwayat: 'receipt' };
        return <Ionicons name={icons[route.name] + (focused ? '' : '-outline')} size={22} color={color} />;
      },
    })}>
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ headerShown: false }} />
      <Tab.Screen name="Scan" component={ScanQRScreen} options={{ title: 'Scan', headerTitle: 'Scan QR Code' }} />
      <Tab.Screen name="Bayar" component={PembayaranScreen} options={{ title: 'Bayar', headerTitle: 'Pembayaran' }} />
      <Tab.Screen name="TopUp" component={TopUpScreen} options={{ title: 'Top Up', headerTitle: 'Top Up Saldo' }} />
      <Tab.Screen name="Riwayat" component={TransaksiScreen} options={{ title: 'Riwayat', headerTitle: 'Semua Transaksi' }} />
    </Tab.Navigator>
  );
}

function KantinTabs() {
  return (
    <Tab.Navigator screenOptions={({ route }) => ({
      ...screenOpts, tabBarStyle: tabStyle, tabBarActiveTintColor: COLORS.accent, tabBarInactiveTintColor: COLORS.textMuted,
      tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
      tabBarIcon: ({ focused, color }) => {
        const icons = { Bayar: 'card', Scan: 'scan', Penjualan: 'receipt' };
        return <Ionicons name={icons[route.name] + (focused ? '' : '-outline')} size={22} color={color} />;
      },
    })}>
      <Tab.Screen name="Bayar" component={PembayaranScreen} options={{ title: 'Bayar', headerTitle: 'Pembayaran Kantin' }} />
      <Tab.Screen name="Scan" component={ScanQRScreen} options={{ title: 'Scan', headerTitle: 'Scan QR' }} />
      <Tab.Screen name="Penjualan" component={TransaksiScreen} options={{ title: 'Penjualan', headerTitle: 'Riwayat Penjualan' }} />
    </Tab.Navigator>
  );
}

function UserTabs() {
  return (
    <Tab.Navigator screenOptions={({ route }) => ({
      ...screenOpts, tabBarStyle: tabStyle, tabBarActiveTintColor: COLORS.accent, tabBarInactiveTintColor: COLORS.textMuted,
      tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
      tabBarIcon: ({ focused, color }) => {
        const icons = { ScanQR: 'scan', ScanNFC: 'wifi', Riwayat: 'receipt' };
        return <Ionicons name={icons[route.name] + (focused ? '' : '-outline')} size={22} color={color} />;
      },
    })}>
      <Tab.Screen name="ScanQR" component={ScanQRScreen} options={{ title: 'Scan QR', headerTitle: 'Scan QR Code' }} />
      <Tab.Screen name="ScanNFC" component={ScanNFCScreen} options={{ title: 'Scan NFC', headerTitle: 'Scan NFC' }} />
      <Tab.Screen name="Riwayat" component={TransaksiScreen} options={{ title: 'Riwayat', headerTitle: 'Transaksi Saya' }} />
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
        <Stack.Screen name="Pembayaran" component={PembayaranScreen} options={{ title: 'Pembayaran' }} />
        <Stack.Screen name="TopUp" component={TopUpScreen} options={{ title: 'Top Up Saldo' }} />
        <Stack.Screen name="AnggotaList" component={AnggotaListScreen} options={{ title: 'Data Anggota' }} />
        <Stack.Screen name="Transaksi" component={TransaksiScreen} options={{ title: 'Riwayat Transaksi' }} />
        <Stack.Screen name="LacakKartu" component={LacakKartuScreen} options={{ title: 'Lacak Kartu' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
