/**
 * LocationHistoryScreen.js
 * NEW: Riwayat Lokasi screen for mobile app
 * Shows movement history on a LIGHT map with building outlines
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Alert, SafeAreaView, RefreshControl,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';

// ================================================
// LIGHT MAP STYLE — bright with buildings visible
// ================================================
const LIGHT_MAP_STYLE = [
  // Show all features in standard light styling
  { elementType: 'geometry', stylers: [{ color: '#f5f5f5' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#f5f5f5' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#e0e0e0' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#dadada' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c9e7f2' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#9e9e9e' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#c8e6c9' }] },
  // KEY: Make buildings visible with light fill
  { featureType: 'landscape.man_made', elementType: 'geometry.fill', stylers: [{ color: '#e8e8e8' }] },
  { featureType: 'landscape.man_made', elementType: 'geometry.stroke', stylers: [{ color: '#d5d5d5' }] },
];

const SOURCE_COLORS = {
  NFC: '#198754',
  QR: '#0dcaf0',
  GoogleFindHub: '#6f42c1',
  default: '#0d6efd',
};

const getSourceColor = (sumber) => SOURCE_COLORS[sumber] || SOURCE_COLORS.default;

export default function LocationHistoryScreen({ route, navigation }) {
  const { kartuId, nama, pangkat } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [history, setHistory] = useState([]);
  const [anggotaInfo, setAnggotaInfo] = useState(null);
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [showPath, setShowPath] = useState(true);
  const mapRef = React.useRef(null);

  const fetchHistory = useCallback(async () => {
    try {
      const response = await api.get(`/api/riwayat-lokasi/${kartuId}?limit=200`);
      if (response.data.success) {
        setAnggotaInfo(response.data.data.anggota);
        setHistory(response.data.data.history);
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

  // Path coordinates (chronological order — reverse since API returns desc)
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
        <ActivityIndicator size="large" color="#0d6efd" />
        <Text style={styles.loadingText}>Memuat riwayat lokasi...</Text>
      </SafeAreaView>
    );
  }

  const renderHistoryItem = ({ item, index }) => (
    <TouchableOpacity
      style={[styles.historyItem, selectedIdx === index && styles.historyItemActive]}
      onPress={() => focusOnPoint(item, index)}
    >
      <View style={styles.historyItemHeader}>
        <Text style={styles.historyItemName} numberOfLines={1}>
          {item.lokasi_nama || 'Lokasi Tidak Diketahui'}
        </Text>
        <View style={[styles.sourceBadge, { backgroundColor: getSourceColor(item.sumber) }]}>
          <Text style={styles.sourceBadgeText}>{item.sumber}</Text>
        </View>
      </View>
      <Text style={styles.historyItemTime}>
        <Ionicons name="time-outline" size={12} /> {item.waktu}
      </Text>
      {item.scanned_by_nama && (
        <Text style={styles.historyItemScanner}>
          <Ionicons name="person-outline" size={12} /> oleh {item.scanned_by_nama}
        </Text>
      )}
      <Text style={styles.historyItemCoords}>
        {item.latitude.toFixed(6)}, {item.longitude.toFixed(6)}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>{nama || anggotaInfo?.nama}</Text>
          <Text style={styles.headerSub}>{pangkat || anggotaInfo?.pangkat} · {kartuId}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => setShowPath(!showPath)} style={styles.headerBtn}>
            <Ionicons name={showPath ? "git-branch" : "git-branch-outline"} size={20} color="#0d6efd" />
          </TouchableOpacity>
          <TouchableOpacity onPress={fitAllMarkers} style={styles.headerBtn}>
            <Ionicons name="expand" size={20} color="#0d6efd" />
          </TouchableOpacity>
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
          {/* Movement path polyline */}
          {showPath && pathCoords.length > 1 && (
            <Polyline
              coordinates={pathCoords}
              strokeColor="#0d6efd"
              strokeWidth={3}
              lineDashPattern={[8, 6]}
            />
          )}

          {/* History markers */}
          {history.map((h, i) => (
            <Marker
              key={h.id || i}
              coordinate={{ latitude: h.latitude, longitude: h.longitude }}
              title={h.lokasi_nama || 'Unknown'}
              description={`${h.waktu} (${h.sumber})`}
              pinColor={i === 0 ? '#dc3545' : getSourceColor(h.sumber)}
              opacity={i === 0 ? 1 : 0.7}
            />
          ))}
        </MapView>

        {/* Stats overlay */}
        <View style={styles.statsOverlay}>
          <Text style={styles.statsText}>{history.length} titik lokasi</Text>
        </View>
      </View>

      {/* Timeline list */}
      <View style={styles.timelineContainer}>
        <Text style={styles.timelineTitle}>
          <Ionicons name="time" size={16} /> Timeline Lokasi
        </Text>
        {history.length > 0 ? (
          <FlatList
            data={history}
            renderItem={renderHistoryItem}
            keyExtractor={(item, index) => item.id?.toString() || index.toString()}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
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

  header: {
    flexDirection: 'row', alignItems: 'center', padding: 12,
    borderBottomWidth: 1, borderBottomColor: '#e9ecef', backgroundColor: '#fff',
  },
  backBtn: { padding: 4, marginRight: 8 },
  headerInfo: { flex: 1 },
  headerName: { fontSize: 16, fontWeight: '700', color: '#333' },
  headerSub: { fontSize: 12, color: '#6c757d' },
  headerActions: { flexDirection: 'row', gap: 8 },
  headerBtn: { padding: 6, backgroundColor: '#f0f7ff', borderRadius: 8 },

  mapContainer: { height: 280 },
  map: { flex: 1 },
  statsOverlay: {
    position: 'absolute', top: 10, right: 10,
    backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 10,
    paddingVertical: 4, borderRadius: 12,
  },
  statsText: { fontSize: 12, fontWeight: '600', color: '#333' },

  timelineContainer: { flex: 1, padding: 12 },
  timelineTitle: { fontSize: 14, fontWeight: '700', color: '#333', marginBottom: 8 },

  historyItem: {
    padding: 10, marginBottom: 6, backgroundColor: '#f8f9fa',
    borderRadius: 8, borderLeftWidth: 3, borderLeftColor: '#0d6efd',
  },
  historyItemActive: { backgroundColor: '#cfe2ff', borderLeftColor: '#0a58ca' },
  historyItemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  historyItemName: { fontSize: 13, fontWeight: '600', color: '#333', flex: 1, marginRight: 8 },
  sourceBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  sourceBadgeText: { fontSize: 10, fontWeight: '600', color: '#fff' },
  historyItemTime: { fontSize: 11, color: '#6c757d', marginTop: 2 },
  historyItemScanner: { fontSize: 11, color: '#6c757d' },
  historyItemCoords: { fontSize: 10, color: '#adb5bd', marginTop: 2 },

  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { marginTop: 8, color: '#adb5bd', fontSize: 14 },
});
