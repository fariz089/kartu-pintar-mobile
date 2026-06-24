import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, RefreshControl, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, SIZES, formatRupiah } from '../utils/theme';
import { anggotaAPI, API_BASE } from '../services/api';

export default function AnggotaListScreen({ route, navigation }) {
  const [data, setData] = useState([]);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Optional filter dari Dashboard stat-card (Aktif/Hilang)
  const filterStatus = route?.params?.filterStatus;
  // Mode kelola (dari Manajemen): tap → edit form, tampilkan tombol tambah
  const manageMode = route?.params?.manageMode;

  useEffect(() => {
    if (manageMode) {
      navigation.setOptions({
        title: 'Kelola Anggota',
        headerRight: () => (
          <TouchableOpacity onPress={() => navigation.navigate('AnggotaForm', { mode: 'create' })} style={{ paddingHorizontal: 4 }}>
            <Ionicons name="add-circle" size={26} color={COLORS.accent} />
          </TouchableOpacity>
        ),
      });
    }
  }, [manageMode]);

  const load = async () => {
    try {
      const res = await anggotaAPI.list(search);
      if (res.success) {
        let list = res.data;
        if (filterStatus) {
          list = list.filter(a => a.status_kartu === filterStatus);
        }
        setData(list);
      }
    } catch (e) { console.log(e); }
  };

  useFocusEffect(useCallback(() => { load(); }, [search, filterStatus]));

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const statusColor = (s) => s === 'Aktif' ? COLORS.success : s === 'Hilang' ? COLORS.danger : COLORS.warning;

  const buildFotoUrl = (f) => {
    if (!f || f === '/static/img/avatar-default.svg') return null;
    if (f.startsWith('http://') || f.startsWith('https://')) return f;
    return `${API_BASE}${f.startsWith('/') ? '' : '/'}${f}`;
  };

  const renderItem = ({ item }) => {
    const fotoUrl = buildFotoUrl(item.foto);
    return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate(manageMode ? 'AnggotaForm' : 'AnggotaDetail', manageMode ? {
        mode: 'edit',
        kartuId: item.kartu_id || item.id,
        anggota: item,
      } : {
        anggota: item,
        kartuId: item.kartu_id || item.id,
      })}
    >
      <View style={styles.avatar}>
        {fotoUrl ? (
          <Image source={{ uri: fotoUrl }} style={styles.avatarImg} />
        ) : (
          <Ionicons name="person" size={24} color={COLORS.accent} />
        )}
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.nama}>{item.nama}</Text>
        <Text style={styles.pangkat}>{item.pangkat}{item.jurusan ? ` — ${item.jurusan}` : ''}</Text>
        <Text style={styles.saldo}>{formatRupiah(item.saldo)}</Text>
      </View>
      <View style={styles.statusContainer}>
        <View style={[styles.statusDot, { backgroundColor: statusColor(item.status_kartu) }]} />
        <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} style={{ marginTop: 4 }} />
      </View>
    </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={COLORS.textMuted} />
        <TextInput style={styles.searchInput} placeholder="Cari anggota..."
          placeholderTextColor={COLORS.textMuted} value={search} onChangeText={setSearch} />
      </View>

      {filterStatus && (
        <View style={styles.filterBadge}>
          <Text style={styles.filterBadgeText}>Status: {filterStatus}</Text>
          <TouchableOpacity onPress={() => navigation.setParams({ filterStatus: null })}>
            <Ionicons name="close-circle" size={16} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>
      )}

      <FlatList data={data} keyExtractor={(i) => (i.kartu_id || i.id).toString()} renderItem={renderItem}
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
  filterBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: SIZES.padding, marginBottom: 8, paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: COLORS.accent + '22', borderRadius: 8, alignSelf: 'flex-start',
  },
  filterBadgeText: { fontSize: 12, color: COLORS.accent, fontWeight: '600' },
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bgCard,
    borderRadius: 12, padding: 14, marginBottom: 8, gap: 12,
  },
  avatar: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.bgInput,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  avatarImg: { width: '100%', height: '100%' },
  cardContent: { flex: 1 },
  nama: { fontSize: SIZES.md, fontWeight: '600', color: COLORS.textPrimary },
  pangkat: { fontSize: SIZES.sm, color: COLORS.textSecondary, marginTop: 2 },
  saldo: { fontSize: SIZES.sm, color: COLORS.accent, fontWeight: '600', marginTop: 2 },
  statusContainer: { alignItems: 'center' },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  empty: { color: COLORS.textMuted, textAlign: 'center', marginTop: 40 },
});
