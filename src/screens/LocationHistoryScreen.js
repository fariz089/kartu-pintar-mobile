/**
 * LocationHistoryScreen.js
 * UPDATED: Riwayat Lokasi screen — kelengkapan mirip web
 * - Stats 4-box (Total Titik, NFC, QR, Find Hub)
 * - Identitas anggota lengkap (nama, pangkat, kartu_id, satuan)
 * - Marker latest (index 0) lebih besar dengan warna merah
 * - Polyline gold (#c5a44e) seperti web
 * - Custom InfoWindow saat marker di-tap (Callout)
 * - Source badge di timeline pakai warna sama dgn web (NFC=#22c55e, QR=#3b82f6, GoogleFindHub=#8b5cf6, Manual=#f59e0b)
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Alert, SafeAreaView, RefreshControl,
} from 'react-native';
import MapView, { Marker, Polyline, Callout, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { lacakAPI } from '../services/api';

// ================================================
// LIGHT MAP STYLE — sama persis dengan web
// ================================================
const LIGHT_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#f5f5f5' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#f5f5f5' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#e0e0e0' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#dadada' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c9e7f2' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#9e9e9e' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#c8e6c9' }] },
  { featureType: 'landscape.man_made', elementType: 'geometry.fill', stylers: [{ color: '#e8e8e8' }] },
  { featureType: 'landscape.man_made', elementType: 'geometry.stroke', stylers: [{ color: '#d5d5d5' }] },
];

// Warna sumber data SAMA seperti web
const SOURCE_COLORS = {
  NFC: '#22c55e',
  QR: '#3b82f6',
  GoogleFindHub: '#8b5cf6',
  Manual: '#f59e0b',
  default: '#c5a44e',
};

const getSourceColor = (sumber) => SOURCE_COLORS[sumber] || SOURCE_COLORS.default;

// react-native-maps tidak support custom-color marker selain pinColor preset.
// Pakai pinColor terdekat untuk tiap sumber.
const getPinColor = (sumber, isLatest) => {
  if (isLatest) return 'red';
  if (sumber === 'NFC') return 'green';
  if (sumber === 'QR') return 'blue';
  if (sumber === 'GoogleFindHub') return 'violet';
  if (sumber === 'Manual') return 'orange';
  return 'gold';
};

export default function LocationHistoryScreen({ route, navigation }) {
  const { kartuId, nama, pangkat } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [history, setHistory] = useState([]);
  const [anggotaInfo, setAnggotaInfo] = useState(null);
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [showPath, setShowPath] = useState(true);
  const mapRef = useRef(null);
  const markerRefs = useRef({});

  const fetchHistory = useCallback(async () => {
    try {
      const res = await lacakAPI.getRiwayatLokasi(kartuId, { limit: 200 });
      if (res.success) {
        setAnggotaInfo(res.data.anggota);
        setHistory(res.data.history);
      }
    } catch (error) {
      Alert.alert('Error', 'Gagal memuat riwayat lokasi');
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [kartuId]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchHistory();
  };

  const focusOnPoint = (item, index) => {
    setSelectedIdx(index);
    mapRef.current?.animateToRegion({
      latitude: item.latitude,
      longitude: item.longitude,
      latitudeDelta: 0.002,
      longitudeDelta: 0.002,
    }, 500);
    // Buka callout marker (mirip InfoWindow di web)
    setTimeout(() => {
      const ref = markerRefs.current[item.id || index];
      ref?.showCallout?.();
    }, 550);
  };

  const fitAllMarkers = () => {
    if (history.length === 0) return;
    const coords = history.map(h => ({
      latitude: h.latitude,
      longitude: h.longitude,
    }));
    mapRef.current?.fitToCoordinates(coords, {
      edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
      animated: true,
    });
  };

  // Hitung statistik berdasarkan sumber (sama formula web)
  const stats = {
    total: history.length,
    nfc: history.filter(h => h.sumber === 'NFC').length,
    qr: history.filter(h => h.sumber === 'QR').length,
    findHub: history.filter(h => h.sumber === 'GoogleFindHub').length,
  };

  // Path coordinates (chronological order — reverse karena API return desc)
  const pathCoords = [...history].reverse().map(h => ({
    latitude: h.latitude,
    longitude: h.longitude,
  }));

  const initialRegion = history.length > 0 ? {
    latitude: history[0].latitude,
    longitude: history[0].longitude,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  } : {
    latitude: -6.8927,
    longitude: 107.6100,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#c5a44e" />
        <Text style={styles.loadingText}>Memuat riwayat lokasi...</Text>
      </SafeAreaView>
    );
  }

  const renderHistoryItem = ({ item, index }) => {
    const sumberColor = getSourceColor(item.sumber);
    const isActive = selectedIdx === index;
    return (
      <TouchableOpacity
        style={[styles.historyItem, isActive && styles.historyItemActive]}
        onPress={() => focusOnPoint(item, index)}
        activeOpacity={0.7}
      >
        <View style={styles.historyItemHeader}>
          <View style={styles.historyItemLeft}>
            <Text style={styles.historyItemName} numberOfLines={1}>
              {item.lokasi_nama || 'Lokasi Tidak Diketahui'}
            </Text>
            <View style={styles.historyMetaRow}>
              <Ionicons name="time-outline" size={11} color="#6c757d" />
              <Text style={styles.historyItemTime}>{item.waktu}</Text>
            </View>
            {item.scanned_by_nama && (
              <View style={styles.historyMetaRow}>
                <Ionicons name="person-outline" size={11} color="#6c757d" />
                <Text style={styles.historyItemScanner}>{item.scanned_by_nama}</Text>
              </View>
            )}
          </View>
          <View style={[styles.sourceBadge, { backgroundColor: sumberColor }]}>
            <Text style={styles.sourceBadgeText}>{item.sumber}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header — identitas lengkap mirip web */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerName} numberOfLines={1}>
            <Ionicons name="person" size={14} color="#c5a44e" />{' '}
            {nama || anggotaInfo?.nama}
          </Text>
          <Text style={styles.headerSub} numberOfLines={1}>
            {pangkat || anggotaInfo?.pangkat} · {kartuId}
            {anggotaInfo?.satuan ? ` · ${anggotaInfo.satuan}` : ''}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => setShowPath(!showPath)}
            style={[styles.headerBtn, showPath && styles.headerBtnActive]}
          >
            <Ionicons name="git-branch" size={18} color={showPath ? '#fff' : '#c5a44e'} />
          </TouchableOpacity>
          <TouchableOpacity onPress={fitAllMarkers} style={styles.headerBtn}>
            <Ionicons name="expand" size={18} color="#c5a44e" />
          </TouchableOpacity>
        </View>
      </View>

      {/* STATS 4-box — mirip web */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total Titik</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{stats.nfc}</Text>
          <Text style={styles.statLabel}>Scan NFC</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{stats.qr}</Text>
          <Text style={styles.statLabel}>Scan QR</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{stats.findHub}</Text>
          <Text style={styles.statLabel}>Find Hub</Text>
        </View>
      </View>

      {/* Map */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          initialRegion={initialRegion}
          customMapStyle={LIGHT_MAP_STYLE}
          showsBuildings={true}
          showsIndoors={true}
          mapType="standard"
        >
          {/* Polyline GOLD seperti web */}
          {showPath && pathCoords.length > 1 && (
            <Polyline
              coordinates={pathCoords}
              strokeColor="#c5a44e"
              strokeWidth={3}
            />
          )}

          {/* Markers — index 0 = latest (merah, lebih besar) */}
          {history.map((h, i) => {
            const isLatest = i === 0;
            return (
              <Marker
                ref={(ref) => { markerRefs.current[h.id || i] = ref; }}
                key={h.id || i}
                coordinate={{ latitude: h.latitude, longitude: h.longitude }}
                pinColor={getPinColor(h.sumber, isLatest)}
                opacity={isLatest ? 1 : 0.85}
                anchor={{ x: 0.5, y: 1 }}
              >
                {/* Callout = InfoWindow di web */}
                <Callout tooltip>
                  <View style={styles.callout}>
                    <Text style={styles.calloutTitle} numberOfLines={2}>
                      {h.lokasi_nama || 'Unknown'}
                    </Text>
                    <Text style={styles.calloutTime}>{h.waktu}</Text>
                    <View style={[styles.calloutBadge, { backgroundColor: getSourceColor(h.sumber) }]}>
                      <Text style={styles.calloutBadgeText}>{h.sumber}</Text>
                    </View>
                    {isLatest && (
                      <Text style={styles.calloutLatest}>📍 Lokasi Terkini</Text>
                    )}
                  </View>
                </Callout>
              </Marker>
            );
          })}
        </MapView>

        {/* Stats overlay */}
        <View style={styles.statsOverlay}>
          <Text style={styles.statsText}>{history.length} titik lokasi</Text>
        </View>
      </View>

      {/* Timeline */}
      <View style={styles.timelineContainer}>
        <Text style={styles.timelineTitle}>
          <Ionicons name="time" size={14} color="#c5a44e" /> Timeline
        </Text>
        {history.length > 0 ? (
          <FlatList
            data={history}
            renderItem={renderHistoryItem}
            keyExtractor={(item, index) => item.id?.toString() || index.toString()}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#c5a44e" />
            }
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="location-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>Belum ada riwayat lokasi</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  loadingText: { marginTop: 12, color: '#6c757d' },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', padding: 12,
    borderBottomWidth: 1, borderBottomColor: '#e9ecef', backgroundColor: '#fff',
  },
  backBtn: { padding: 4, marginRight: 8 },
  headerInfo: { flex: 1 },
  headerName: { fontSize: 15, fontWeight: '700', color: '#333' },
  headerSub: { fontSize: 11, color: '#6c757d', marginTop: 2 },
  headerActions: { flexDirection: 'row', gap: 6 },
  headerBtn: {
    padding: 8, backgroundColor: '#fff8e7', borderRadius: 8,
    borderWidth: 1, borderColor: '#c5a44e33',
  },
  headerBtnActive: { backgroundColor: '#c5a44e', borderColor: '#c5a44e' },

  // Stats 4-box (mirip web)
  statsRow: {
    flexDirection: 'row', paddingHorizontal: 10, paddingVertical: 8,
    gap: 6, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#e9ecef',
  },
  statBox: {
    flex: 1, padding: 10, borderRadius: 8,
    backgroundColor: '#f8f9fa', borderWidth: 1, borderColor: '#e9ecef',
    alignItems: 'center',
  },
  statValue: { fontSize: 20, fontWeight: '800', color: '#c5a44e' },
  statLabel: { fontSize: 10, color: '#6c757d', marginTop: 2, textAlign: 'center' },

  // Map (tetap 280px)
  mapContainer: { height: 280 },
  map: { flex: 1 },
  statsOverlay: {
    position: 'absolute', top: 10, right: 10,
    backgroundColor: 'rgba(255,255,255,0.95)', paddingHorizontal: 10,
    paddingVertical: 4, borderRadius: 12,
    borderWidth: 1, borderColor: '#c5a44e33',
  },
  statsText: { fontSize: 11, fontWeight: '600', color: '#c5a44e' },

  // Callout (= InfoWindow web)
  callout: {
    backgroundColor: '#fff', padding: 10, borderRadius: 8,
    borderWidth: 1, borderColor: '#c5a44e44',
    minWidth: 160, maxWidth: 220,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  calloutTitle: { fontSize: 13, fontWeight: '700', color: '#333' },
  calloutTime: { fontSize: 11, color: '#6c757d', marginTop: 2 },
  calloutBadge: {
    alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 4, marginTop: 6,
  },
  calloutBadgeText: { fontSize: 10, fontWeight: '600', color: '#fff' },
  calloutLatest: { fontSize: 11, color: '#dc3545', fontWeight: '600', marginTop: 4 },

  // Timeline
  timelineContainer: { flex: 1, padding: 12, backgroundColor: '#fff' },
  timelineTitle: { fontSize: 14, fontWeight: '700', color: '#333', marginBottom: 8 },

  historyItem: {
    padding: 10, marginBottom: 6, backgroundColor: '#f8f9fa',
    borderRadius: 8, borderLeftWidth: 3, borderLeftColor: '#c5a44e',
  },
  historyItemActive: {
    backgroundColor: 'rgba(197, 164, 78, 0.12)',
    borderLeftColor: '#c5a44e', borderLeftWidth: 4,
  },
  historyItemHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  historyItemLeft: { flex: 1, marginRight: 8 },
  historyItemName: { fontSize: 13, fontWeight: '600', color: '#333' },
  historyMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  historyItemTime: { fontSize: 11, color: '#6c757d' },
  historyItemScanner: { fontSize: 11, color: '#6c757d' },
  sourceBadge: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4 },
  sourceBadgeText: { fontSize: 10, fontWeight: '700', color: '#fff' },

  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { marginTop: 8, color: '#adb5bd', fontSize: 14 },
});
