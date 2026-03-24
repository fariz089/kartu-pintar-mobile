import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, SIZES, formatDate } from '../utils/theme';
import { anggotaAPI, lacakAPI } from '../services/api';

export default function LacakKartuScreen() {
  const [data, setData] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedCard, setExpandedCard] = useState(null);
  const [locationHistory, setLocationHistory] = useState({});

  const load = async () => {
    try {
      const res = await anggotaAPI.list();
      if (res.success) setData(res.data);
    } catch (e) { console.log(e); }
  };

  useFocusEffect(useCallback(() => { load(); }, []));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const openMaps = (lat, lng) => {
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`);
  };

  const loadHistory = async (kartuId) => {
    try {
      const res = await lacakAPI.get(kartuId);
      if (res.success) {
        setLocationHistory(prev => ({ ...prev, [kartuId]: res.data.history || [] }));
      }
    } catch (e) { console.log(e); }
  };

  const toggleExpand = (kartuId) => {
    if (expandedCard === kartuId) {
      setExpandedCard(null);
    } else {
      setExpandedCard(kartuId);
      if (!locationHistory[kartuId]) loadHistory(kartuId);
    }
  };

  const statusColor = (s) => s === 'Aktif' ? COLORS.success : s === 'Hilang' ? COLORS.danger : COLORS.warning;

  const sourceIcon = (sumber) => {
    switch (sumber) {
      case 'NFC': return 'wifi';
      case 'QR': return 'qr-code';
      case 'GPS_Mobile': return 'navigate';
      default: return 'location';
    }
  };

  const renderItem = ({ item }) => {
    const isExpanded = expandedCard === item.kartu_id;
    const history = locationHistory[item.kartu_id] || [];

    return (
      <View style={styles.card}>
        <TouchableOpacity style={styles.cardTop} onPress={() => toggleExpand(item.kartu_id)} activeOpacity={0.7}>
          <View style={[styles.statusDot, { backgroundColor: statusColor(item.status_kartu) }]} />
          <View style={styles.cardInfo}>
            <Text style={styles.nama}>{item.nama}</Text>
            <Text style={styles.kartuId}>{item.kartu_id}</Text>
          </View>
          <View style={[styles.statusBadge, { borderColor: statusColor(item.status_kartu) }]}>
            <Text style={[styles.statusText, { color: statusColor(item.status_kartu) }]}>{item.status_kartu}</Text>
          </View>
          <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={COLORS.textMuted} style={{ marginLeft: 6 }} />
        </TouchableOpacity>

        {item.lokasi_terakhir && (
          <View style={styles.lokasiRow}>
            <Ionicons name="location" size={14} color={COLORS.accent} />
            <Text style={styles.lokasiText}>{item.lokasi_terakhir.lokasi || 'Tidak diketahui'}</Text>
            <Text style={styles.lokasiWaktu}>{item.lokasi_terakhir.waktu ? formatDate(item.lokasi_terakhir.waktu) : '-'}</Text>
          </View>
        )}

        {item.lokasi_terakhir?.lat && (
          <TouchableOpacity style={styles.coordsRow} onPress={() => openMaps(item.lokasi_terakhir.lat, item.lokasi_terakhir.lng)}>
            <Text style={styles.coords}>
              📍 {item.lokasi_terakhir.lat?.toFixed(4)}, {item.lokasi_terakhir.lng?.toFixed(4)}
            </Text>
            <Ionicons name="open-outline" size={12} color={COLORS.info} />
            <Text style={styles.openMapsText}>Buka Maps</Text>
          </TouchableOpacity>
        )}

        {/* Expanded history */}
        {isExpanded && (
          <View style={styles.historySection}>
            <Text style={styles.historySectionTitle}>RIWAYAT LOKASI</Text>
            {history.length > 0 ? (
              history.slice(0, 10).map((h, i) => (
                <TouchableOpacity key={h.id || i} style={styles.historyItem}
                  onPress={() => h.latitude && openMaps(h.latitude, h.longitude)}>
                  <Ionicons name={sourceIcon(h.sumber)} size={14} color={COLORS.accent} />
                  <View style={styles.historyInfo}>
                    <Text style={styles.historyLokasi}>{h.lokasi_nama || 'Unknown'}</Text>
                    <Text style={styles.historyCoords}>{h.latitude?.toFixed(4)}, {h.longitude?.toFixed(4)}</Text>
                  </View>
                  <View style={styles.historyMeta}>
                    <Text style={styles.historySource}>{h.sumber}</Text>
                    <Text style={styles.historyTime}>{h.waktu ? formatDate(h.waktu) : '-'}</Text>
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <Text style={styles.emptyHistory}>Belum ada riwayat lokasi</Text>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="location" size={18} color={COLORS.accent} />
        <Text style={styles.headerText}>Lokasi ter-update otomatis saat scan NFC/QR</Text>
      </View>
      <FlatList data={data} keyExtractor={(i) => i.kartu_id} renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />}
        contentContainerStyle={{ padding: SIZES.padding, paddingTop: 0 }}
        ListEmptyComponent={<Text style={styles.empty}>Tidak ada data</Text>} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgDark },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    margin: SIZES.padding, marginBottom: 8, backgroundColor: COLORS.bgCard,
    borderRadius: 10, padding: 10, borderWidth: 1, borderColor: COLORS.accent + '22',
  },
  headerText: { fontSize: SIZES.xs, color: COLORS.textMuted, flex: 1 },
  card: { backgroundColor: COLORS.bgCard, borderRadius: 12, padding: 14, marginBottom: 10 },
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
  coordsRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  coords: { fontSize: SIZES.xs, color: COLORS.textMuted },
  openMapsText: { fontSize: SIZES.xs, color: COLORS.info, marginLeft: 4 },
  historySection: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border },
  historySectionTitle: { fontSize: SIZES.xs, fontWeight: '700', color: COLORS.textMuted, letterSpacing: 2, marginBottom: 8 },
  historyItem: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: COLORS.border + '44',
  },
  historyInfo: { flex: 1 },
  historyLokasi: { fontSize: SIZES.sm, color: COLORS.textSecondary },
  historyCoords: { fontSize: SIZES.xs, color: COLORS.textMuted, fontFamily: 'monospace' },
  historyMeta: { alignItems: 'flex-end' },
  historySource: { fontSize: 9, fontWeight: '600', color: COLORS.accent },
  historyTime: { fontSize: SIZES.xs, color: COLORS.textMuted },
  emptyHistory: { color: COLORS.textMuted, fontSize: SIZES.sm, fontStyle: 'italic' },
  empty: { color: COLORS.textMuted, textAlign: 'center', marginTop: 40 },
});
