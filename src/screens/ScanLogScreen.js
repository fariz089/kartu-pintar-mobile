/**
 * ScanLogScreen.js — Riwayat scan terbaru (admin).
 */
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, SIZES, formatDate } from '../utils/theme';
import { scanLogAPI } from '../services/api';

const SUMBER_ICON = {
  NFC: 'wifi', QR: 'qr-code', FindMy: 'navigate', GPS: 'location',
  Manual: 'search', GPS_Mobile: 'location',
};

export default function ScanLogScreen() {
  const [logs, setLogs] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const res = await scanLogAPI.list(100);
      if (res.success) setLogs(res.data);
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Gagal memuat log');
    }
  };

  useFocusEffect(useCallback(() => { load(); }, []));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const renderItem = ({ item }) => (
    <View style={styles.row}>
      <View style={styles.iconBox}>
        <Ionicons name={SUMBER_ICON[item.sumber] || 'pulse'} size={16} color={COLORS.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.nama}>{item.anggota_nama || 'Tidak diketahui'}</Text>
        <Text style={styles.meta}>
          {item.sumber} · {item.lokasi_nama || '-'}
          {item.scanned_by_nama ? ` · oleh ${item.scanned_by_nama}` : ''}
        </Text>
      </View>
      <Text style={styles.waktu}>{formatDate(item.waktu)}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList data={logs} keyExtractor={(i) => i.id.toString()} renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />}
        contentContainerStyle={{ padding: SIZES.padding }}
        ListHeaderComponent={<Text style={styles.header}>100 aktivitas scan terakhir</Text>}
        ListEmptyComponent={<Text style={styles.empty}>Belum ada aktivitas scan</Text>} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgDark },
  header: { color: COLORS.textMuted, fontSize: 12, marginBottom: 10 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.bgCard,
    borderRadius: 10, padding: 12, marginBottom: 6,
  },
  iconBox: {
    width: 34, height: 34, borderRadius: 8, backgroundColor: COLORS.accent + '18',
    alignItems: 'center', justifyContent: 'center',
  },
  nama: { fontSize: SIZES.md, fontWeight: '600', color: COLORS.textPrimary },
  meta: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  waktu: { fontSize: 10, color: COLORS.textMuted, maxWidth: 90, textAlign: 'right' },
  empty: { color: COLORS.textMuted, textAlign: 'center', marginTop: 40 },
});
