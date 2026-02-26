import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, SIZES, formatDate } from '../utils/theme';
import { anggotaAPI } from '../services/api';

export default function LacakKartuScreen() {
  const [data, setData] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const res = await anggotaAPI.list();
      if (res.success) setData(res.data);
    } catch (e) { console.log(e); }
  };

  useFocusEffect(useCallback(() => { load(); }, []));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const statusColor = (s) => s === 'Aktif' ? COLORS.success : s === 'Hilang' ? COLORS.danger : COLORS.warning;

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={[styles.statusDot, { backgroundColor: statusColor(item.status_kartu) }]} />
        <View style={styles.cardInfo}>
          <Text style={styles.nama}>{item.nama}</Text>
          <Text style={styles.kartuId}>{item.kartu_id}</Text>
        </View>
        <View style={[styles.statusBadge, { borderColor: statusColor(item.status_kartu) }]}>
          <Text style={[styles.statusText, { color: statusColor(item.status_kartu) }]}>
            {item.status_kartu}
          </Text>
        </View>
      </View>
      {item.lokasi_terakhir && (
        <View style={styles.lokasiRow}>
          <Ionicons name="location" size={14} color={COLORS.accent} />
          <Text style={styles.lokasiText}>
            {item.lokasi_terakhir.lokasi || 'Tidak diketahui'}
          </Text>
          <Text style={styles.lokasiWaktu}>
            {item.lokasi_terakhir.waktu ? formatDate(item.lokasi_terakhir.waktu) : '-'}
          </Text>
        </View>
      )}
      {item.lokasi_terakhir?.lat && (
        <Text style={styles.coords}>
          📍 {item.lokasi_terakhir.lat?.toFixed(4)}, {item.lokasi_terakhir.lng?.toFixed(4)}
        </Text>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList data={data} keyExtractor={(i) => i.kartu_id} renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />}
        contentContainerStyle={{ padding: SIZES.padding }}
        ListEmptyComponent={<Text style={styles.empty}>Tidak ada data</Text>} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgDark },
  card: {
    backgroundColor: COLORS.bgCard, borderRadius: 12, padding: 14, marginBottom: 10,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  cardInfo: { flex: 1 },
  nama: { fontSize: SIZES.md, fontWeight: '600', color: COLORS.textPrimary },
  kartuId: { fontSize: SIZES.xs, color: COLORS.textMuted, fontFamily: 'monospace' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1 },
  statusText: { fontSize: SIZES.xs, fontWeight: '600' },
  lokasiRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  lokasiText: { flex: 1, fontSize: SIZES.sm, color: COLORS.textSecondary },
  lokasiWaktu: { fontSize: SIZES.xs, color: COLORS.textMuted },
  coords: { fontSize: SIZES.xs, color: COLORS.textMuted, marginTop: 4 },
  empty: { color: COLORS.textMuted, textAlign: 'center', marginTop: 40 },
});
