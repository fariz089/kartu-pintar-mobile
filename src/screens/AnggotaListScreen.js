import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, SIZES, formatRupiah } from '../utils/theme';
import { anggotaAPI } from '../services/api';

export default function AnggotaListScreen({ navigation }) {
  const [data, setData] = useState([]);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const res = await anggotaAPI.list(search);
      if (res.success) setData(res.data);
    } catch (e) { console.log(e); }
  };

  useFocusEffect(useCallback(() => { load(); }, [search]));

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const statusColor = (s) => s === 'Aktif' ? COLORS.success : s === 'Hilang' ? COLORS.danger : COLORS.warning;

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('ScanResult', { anggota: item })}>
      <View style={styles.avatar}>
        <Ionicons name="person" size={24} color={COLORS.accent} />
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.nama}>{item.nama}</Text>
        <Text style={styles.pangkat}>{item.pangkat} — {item.jurusan}</Text>
        <Text style={styles.saldo}>{formatRupiah(item.saldo)}</Text>
      </View>
      <View style={[styles.statusDot, { backgroundColor: statusColor(item.status_kartu) }]} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={COLORS.textMuted} />
        <TextInput style={styles.searchInput} placeholder="Cari anggota..."
          placeholderTextColor={COLORS.textMuted} value={search} onChangeText={setSearch} />
      </View>
      <FlatList data={data} keyExtractor={(i) => i.kartu_id} renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />}
        contentContainerStyle={{ padding: SIZES.padding }}
        ListEmptyComponent={<Text style={styles.empty}>Tidak ada data</Text>} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgDark },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', margin: SIZES.padding,
    backgroundColor: COLORS.bgInput, borderRadius: 12, paddingHorizontal: 14,
    borderWidth: 1, borderColor: COLORS.border,
  },
  searchInput: { flex: 1, height: 44, color: COLORS.textPrimary, marginLeft: 8, fontSize: SIZES.md },
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bgCard,
    borderRadius: 12, padding: 14, marginBottom: 8, gap: 12,
  },
  avatar: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.bgInput,
    alignItems: 'center', justifyContent: 'center',
  },
  cardContent: { flex: 1 },
  nama: { fontSize: SIZES.md, fontWeight: '600', color: COLORS.textPrimary },
  pangkat: { fontSize: SIZES.sm, color: COLORS.textSecondary, marginTop: 2 },
  saldo: { fontSize: SIZES.sm, color: COLORS.accent, fontWeight: '600', marginTop: 2 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  empty: { color: COLORS.textMuted, textAlign: 'center', marginTop: 40 },
});
