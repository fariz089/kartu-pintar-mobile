import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, SIZES, formatRupiah, formatDate } from '../utils/theme';
import { keuanganAPI } from '../services/api';

export default function TransaksiScreen() {
  const [data, setData] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const res = await keuanganAPI.transaksi();
      if (res.success) setData(res.data);
    } catch (e) { console.log(e); }
  };

  useFocusEffect(useCallback(() => { load(); }, []));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const renderItem = ({ item }) => {
    const isPembelian = item.jenis === 'Pembelian';
    const isGagal = item.status === 'Gagal';
    return (
      <View style={styles.card}>
        <View style={[styles.icon, { backgroundColor: isPembelian ? COLORS.danger + '22' : COLORS.success + '22' }]}>
          <Ionicons name={isPembelian ? 'cart' : 'arrow-up-circle'}
            size={20} color={isPembelian ? COLORS.danger : COLORS.success} />
        </View>
        <View style={styles.content}>
          <Text style={styles.nama}>{item.anggota_nama}</Text>
          <Text style={styles.ket}>{item.keterangan}</Text>
          <Text style={styles.waktu}>{formatDate(item.created_at)}</Text>
        </View>
        <View style={styles.right}>
          <Text style={[styles.nominal, { color: isPembelian ? COLORS.danger : COLORS.success }]}>
            {isPembelian ? '-' : '+'}{formatRupiah(item.nominal)}
          </Text>
          {isGagal && <Text style={styles.gagal}>GAGAL</Text>}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList data={data} keyExtractor={(i, idx) => i.trx_id || String(idx)} renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />}
        contentContainerStyle={{ padding: SIZES.padding }}
        ListEmptyComponent={<Text style={styles.empty}>Belum ada transaksi</Text>} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgDark },
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bgCard,
    borderRadius: 12, padding: 14, marginBottom: 8, gap: 12,
  },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1 },
  nama: { fontSize: SIZES.md, fontWeight: '600', color: COLORS.textPrimary },
  ket: { fontSize: SIZES.sm, color: COLORS.textSecondary, marginTop: 1 },
  waktu: { fontSize: SIZES.xs, color: COLORS.textMuted, marginTop: 2 },
  right: { alignItems: 'flex-end' },
  nominal: { fontSize: SIZES.md, fontWeight: '700' },
  gagal: { fontSize: SIZES.xs, color: COLORS.danger, fontWeight: '600', marginTop: 2 },
  empty: { color: COLORS.textMuted, textAlign: 'center', marginTop: 40 },
});
