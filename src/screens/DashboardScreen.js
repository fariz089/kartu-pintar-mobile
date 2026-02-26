import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, SIZES, formatRupiah } from '../utils/theme';
import { dashboardAPI, authAPI } from '../services/api';

export default function DashboardScreen({ navigation }) {
  const [stats, setStats] = useState(null);
  const [user, setUser] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [statsRes, userData] = await Promise.all([
        dashboardAPI.stats(),
        authAPI.getStoredUser(),
      ]);
      if (statsRes.success) setStats(statsRes.data);
      setUser(userData);
    } catch (e) {
      console.log('Dashboard error:', e.message);
    }
  };

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Yakin ingin keluar?', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: async () => {
        await authAPI.logout();
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
      }},
    ]);
  };

  const StatCard = ({ icon, label, value, color }) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <Ionicons name={icon} size={24} color={color} />
      <Text style={styles.statValue}>{value ?? '-'}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  const MenuBtn = ({ icon, label, onPress, color = COLORS.primary }) => (
    <TouchableOpacity style={styles.menuBtn} onPress={onPress}>
      <View style={[styles.menuIcon, { backgroundColor: color + '22' }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text style={styles.menuLabel}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Selamat Datang,</Text>
          <Text style={styles.userName}>{user?.nama || 'User'}</Text>
          <Text style={styles.userRole}>{user?.role?.toUpperCase()}</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={24} color={COLORS.danger} />
        </TouchableOpacity>
      </View>

      {/* Saldo Card (if user has anggota) */}
      {user?.anggota && (
        <View style={styles.saldoCard}>
          <Text style={styles.saldoLabel}>SALDO ANDA</Text>
          <Text style={styles.saldoValue}>{formatRupiah(user.anggota.saldo)}</Text>
          <Text style={styles.saldoId}>{user.anggota.kartu_id}</Text>
        </View>
      )}

      {/* Stats */}
      <View style={styles.statsRow}>
        <StatCard icon="people" label="Anggota" value={stats?.total_anggota} color={COLORS.accent} />
        <StatCard icon="card" label="Kartu Aktif" value={stats?.kartu_aktif} color={COLORS.success} />
      </View>
      <View style={styles.statsRow}>
        <StatCard icon="alert-circle" label="Hilang" value={stats?.kartu_hilang} color={COLORS.danger} />
        <StatCard icon="receipt" label="Transaksi" value={stats?.total_transaksi} color={COLORS.info} />
      </View>

      {/* Quick Menu */}
      <Text style={styles.sectionTitle}>MENU CEPAT</Text>
      <View style={styles.menuGrid}>
        <MenuBtn icon="scan" label="Scan QR" onPress={() => navigation.navigate('ScanQR')} color={COLORS.accent} />
        <MenuBtn icon="wifi" label="Scan NFC" onPress={() => navigation.navigate('ScanNFC')} color={COLORS.primary} />
        <MenuBtn icon="card" label="Pembayaran" onPress={() => navigation.navigate('Pembayaran')} color={COLORS.success} />
        <MenuBtn icon="people" label="Anggota" onPress={() => navigation.navigate('AnggotaList')} color={COLORS.info} />
        <MenuBtn icon="receipt" label="Transaksi" onPress={() => navigation.navigate('Transaksi')} color={COLORS.warning} />
        <MenuBtn icon="location" label="Lacak Kartu" onPress={() => navigation.navigate('LacakKartu')} color={COLORS.danger} />
      </View>

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgDark },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SIZES.padding, paddingTop: 16, paddingBottom: 8,
  },
  greeting: { fontSize: SIZES.md, color: COLORS.textSecondary },
  userName: { fontSize: SIZES.xxl, fontWeight: '700', color: COLORS.textPrimary },
  userRole: { fontSize: SIZES.xs, color: COLORS.accent, fontWeight: '600', letterSpacing: 2, marginTop: 2 },
  logoutBtn: { padding: 10, backgroundColor: COLORS.bgCard, borderRadius: 12 },
  saldoCard: {
    marginHorizontal: SIZES.padding, marginTop: 12, padding: 20,
    backgroundColor: COLORS.primary, borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.accent + '44',
  },
  saldoLabel: { fontSize: SIZES.xs, color: COLORS.textSecondary, letterSpacing: 2 },
  saldoValue: { fontSize: 32, fontWeight: '800', color: COLORS.accent, marginTop: 4 },
  saldoId: { fontSize: SIZES.sm, color: COLORS.textSecondary, marginTop: 4 },
  statsRow: {
    flexDirection: 'row', paddingHorizontal: SIZES.padding,
    marginTop: 10, gap: 10,
  },
  statCard: {
    flex: 1, backgroundColor: COLORS.bgCard, borderRadius: 12,
    padding: 14, borderLeftWidth: 3,
  },
  statValue: { fontSize: SIZES.xxl, fontWeight: '700', color: COLORS.textPrimary, marginTop: 6 },
  statLabel: { fontSize: SIZES.xs, color: COLORS.textSecondary, marginTop: 2 },
  sectionTitle: {
    fontSize: SIZES.sm, fontWeight: '700', color: COLORS.textSecondary,
    letterSpacing: 2, paddingHorizontal: SIZES.padding, marginTop: 20, marginBottom: 10,
  },
  menuGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: SIZES.padding, gap: 10,
  },
  menuBtn: {
    width: '31%', backgroundColor: COLORS.bgCard, borderRadius: 12,
    padding: 14, alignItems: 'center',
  },
  menuIcon: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  menuLabel: { fontSize: SIZES.xs, color: COLORS.textPrimary, fontWeight: '500', textAlign: 'center' },
});
