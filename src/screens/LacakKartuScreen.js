import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, Linking, Dimensions, Platform, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import MapView, { Marker, Callout, PROVIDER_GOOGLE } from 'react-native-maps';
import { COLORS, SIZES, formatDate } from '../utils/theme';
import { anggotaAPI, lacakAPI } from '../services/api';

const { width, height } = Dimensions.get('window');

// Custom marker colors based on status
const STATUS_COLORS = {
  'Aktif': '#22c55e',
  'Hilang': '#ef4444',
  'Nonaktif': '#f59e0b',
  'Diblokir': '#9ca3af',
};

// Light map style — terang, bangunan terlihat
const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#f5f5f5' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#f5f5f5' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#e0e0e0' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c9e7f2' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#eeeeee' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#c8e6c9' }] },
  { featureType: 'landscape.man_made', elementType: 'geometry.fill', stylers: [{ color: '#e8e8e8' }] },
  { featureType: 'landscape.man_made', elementType: 'geometry.stroke', stylers: [{ color: '#d5d5d5' }] },
];

export default function LacakKartuScreen({ navigation }) {
  const [data, setData] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedCard, setExpandedCard] = useState(null);
  const [locationHistory, setLocationHistory] = useState({});
  const [viewMode, setViewMode] = useState('map'); // 'map' or 'list'
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedMarker, setSelectedMarker] = useState(null);
  
  const mapRef = useRef(null);
  const flatListRef = useRef(null);

  // Default region: Poltekad Bandung
  const [region, setRegion] = useState({
    latitude: -6.8927,
    longitude: 107.6100,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });

  const load = async () => {
    try {
      const res = await anggotaAPI.list();
      if (res.success) {
        setData(res.data);
        
        // Calculate bounds to fit all markers
        const validLocations = res.data.filter(
          a => a.lokasi_terakhir?.lat && a.lokasi_terakhir?.lng
        );
        
        if (validLocations.length > 0) {
          const lats = validLocations.map(a => a.lokasi_terakhir.lat);
          const lngs = validLocations.map(a => a.lokasi_terakhir.lng);
          
          const minLat = Math.min(...lats);
          const maxLat = Math.max(...lats);
          const minLng = Math.min(...lngs);
          const maxLng = Math.max(...lngs);
          
          const midLat = (minLat + maxLat) / 2;
          const midLng = (minLng + maxLng) / 2;
          const deltaLat = Math.max(0.01, (maxLat - minLat) * 1.5);
          const deltaLng = Math.max(0.01, (maxLng - minLng) * 1.5);
          
          setRegion({
            latitude: midLat,
            longitude: midLng,
            latitudeDelta: deltaLat,
            longitudeDelta: deltaLng,
          });
        }
      }
    } catch (e) {
      console.log(e);
    }
  };

  useFocusEffect(useCallback(() => { load(); }, []));
  
  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const openMaps = (lat, lng, name) => {
    const url = Platform.select({
      ios: `maps://app?daddr=${lat},${lng}&q=${encodeURIComponent(name || 'Lokasi')}`,
      android: `google.navigation:q=${lat},${lng}`,
    });
    
    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
        // Fallback to web Google Maps
        Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`);
      }
    });
  };

  const loadHistory = async (kartuId) => {
    try {
      const res = await lacakAPI.get(kartuId);
      if (res.success) {
        setLocationHistory(prev => ({ ...prev, [kartuId]: res.data.history || [] }));
      }
    } catch (e) {
      console.log(e);
    }
  };

  const toggleExpand = (kartuId) => {
    if (expandedCard === kartuId) {
      setExpandedCard(null);
    } else {
      setExpandedCard(kartuId);
      if (!locationHistory[kartuId]) loadHistory(kartuId);
    }
  };

  const focusOnMarker = (item) => {
    if (!item.lokasi_terakhir?.lat) {
      Alert.alert('Info', 'Kartu ini belum memiliki data lokasi.');
      return;
    }
    
    setSelectedMarker(item.kartu_id);
    setViewMode('map');
    
    mapRef.current?.animateToRegion({
      latitude: item.lokasi_terakhir.lat,
      longitude: item.lokasi_terakhir.lng,
      latitudeDelta: 0.005,
      longitudeDelta: 0.005,
    }, 500);
  };

  // Filter data based on status
  const filteredData = filterStatus === 'all' 
    ? data 
    : data.filter(a => a.status_kartu === filterStatus);

  // Get markers with valid locations
  const markersData = filteredData.filter(
    a => a.lokasi_terakhir?.lat && a.lokasi_terakhir?.lng
  );

  const sourceIcon = (sumber) => {
    switch (sumber) {
      case 'NFC': return 'wifi';
      case 'QR': return 'qr-code';
      case 'GPS_Mobile': return 'navigate';
      default: return 'location';
    }
  };

  // Count lost cards
  const lostCount = data.filter(a => a.status_kartu === 'Hilang').length;

  const renderItem = ({ item }) => {
    const isExpanded = expandedCard === item.kartu_id;
    const history = locationHistory[item.kartu_id] || [];
    const hasLocation = item.lokasi_terakhir?.lat && item.lokasi_terakhir?.lng;

    return (
      <View style={[styles.card, item.status_kartu === 'Hilang' && styles.cardLost]}>
        <TouchableOpacity 
          style={styles.cardTop} 
          onPress={() => toggleExpand(item.kartu_id)} 
          activeOpacity={0.7}
        >
          <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[item.status_kartu] || COLORS.textMuted }]} />
          <View style={styles.cardInfo}>
            <Text style={styles.nama}>{item.nama}</Text>
            <Text style={styles.kartuId}>{item.kartu_id}</Text>
          </View>
          <View style={[styles.statusBadge, { borderColor: STATUS_COLORS[item.status_kartu] }]}>
            <Text style={[styles.statusText, { color: STATUS_COLORS[item.status_kartu] }]}>
              {item.status_kartu}
            </Text>
          </View>
          <Ionicons 
            name={isExpanded ? 'chevron-up' : 'chevron-down'} 
            size={18} 
            color={COLORS.textMuted} 
            style={{ marginLeft: 6 }} 
          />
        </TouchableOpacity>

        {item.lokasi_terakhir && (
          <View style={styles.lokasiRow}>
            <Ionicons name="location" size={14} color={COLORS.accent} />
            <Text style={styles.lokasiText}>
              {item.lokasi_terakhir.lokasi || 'Lokasi tidak diketahui'}
            </Text>
            <Text style={styles.lokasiWaktu}>
              {item.lokasi_terakhir.waktu ? formatDate(item.lokasi_terakhir.waktu) : '-'}
            </Text>
          </View>
        )}

        {hasLocation && (
          <View style={styles.actionRow}>
            <TouchableOpacity 
              style={styles.actionBtn} 
              onPress={() => focusOnMarker(item)}
            >
              <Ionicons name="map" size={14} color={COLORS.accent} />
              <Text style={styles.actionText}>Lihat di Peta</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionBtn} 
              onPress={() => openMaps(item.lokasi_terakhir.lat, item.lokasi_terakhir.lng, item.nama)}
            >
              <Ionicons name="navigate" size={14} color={COLORS.info} />
              <Text style={[styles.actionText, { color: COLORS.info }]}>Navigasi</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Expanded history */}
        {isExpanded && (
          <View style={styles.historySection}>
            <Text style={styles.historySectionTitle}>RIWAYAT LOKASI</Text>
            {history.length > 0 ? (
              history.slice(0, 10).map((h, i) => (
                <TouchableOpacity 
                  key={h.id || i} 
                  style={styles.historyItem}
                  onPress={() => h.latitude && openMaps(h.latitude, h.longitude, h.lokasi_nama)}
                >
                  <Ionicons name={sourceIcon(h.sumber)} size={14} color={COLORS.accent} />
                  <View style={styles.historyInfo}>
                    <Text style={styles.historyLokasi}>{h.lokasi_nama || 'Unknown'}</Text>
                    <Text style={styles.historyCoords}>
                      {h.latitude?.toFixed(4)}, {h.longitude?.toFixed(4)}
                    </Text>
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
      {/* Lost card alert */}
      {lostCount > 0 && (
        <View style={styles.alertBanner}>
          <Ionicons name="warning" size={18} color={COLORS.danger} />
          <Text style={styles.alertText}>
            {lostCount} kartu dilaporkan hilang
          </Text>
          <TouchableOpacity onPress={() => setFilterStatus('Hilang')}>
            <Text style={styles.alertAction}>Lihat</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* View mode toggle & filters */}
      <View style={styles.controlBar}>
        <View style={styles.viewToggle}>
          <TouchableOpacity 
            style={[styles.toggleBtn, viewMode === 'map' && styles.toggleBtnActive]}
            onPress={() => setViewMode('map')}
          >
            <Ionicons name="map" size={16} color={viewMode === 'map' ? COLORS.bgDark : COLORS.textMuted} />
            <Text style={[styles.toggleText, viewMode === 'map' && styles.toggleTextActive]}>Peta</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.toggleBtn, viewMode === 'list' && styles.toggleBtnActive]}
            onPress={() => setViewMode('list')}
          >
            <Ionicons name="list" size={16} color={viewMode === 'list' ? COLORS.bgDark : COLORS.textMuted} />
            <Text style={[styles.toggleText, viewMode === 'list' && styles.toggleTextActive]}>List</Text>
          </TouchableOpacity>
        </View>
        
        {/* Status filter */}
        <View style={styles.filterRow}>
          {['all', 'Aktif', 'Hilang', 'Nonaktif'].map(status => (
            <TouchableOpacity 
              key={status}
              style={[styles.filterBtn, filterStatus === status && styles.filterBtnActive]}
              onPress={() => setFilterStatus(status)}
            >
              {status !== 'all' && (
                <View style={[styles.filterDot, { backgroundColor: STATUS_COLORS[status] }]} />
              )}
              <Text style={[styles.filterText, filterStatus === status && styles.filterTextActive]}>
                {status === 'all' ? 'Semua' : status}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Map View */}
      {viewMode === 'map' && (
        <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
            style={styles.map}
            provider={PROVIDER_GOOGLE}
            initialRegion={region}
            customMapStyle={darkMapStyle}
            mapType="standard"
            showsBuildings={true}
            showsIndoors={true}
            showsUserLocation
            showsMyLocationButton
            showsCompass
          >
            {markersData.map(item => (
              <Marker
                key={item.kartu_id}
                coordinate={{
                  latitude: item.lokasi_terakhir.lat,
                  longitude: item.lokasi_terakhir.lng,
                }}
                pinColor={STATUS_COLORS[item.status_kartu]}
                onPress={() => setSelectedMarker(item.kartu_id)}
              >
                {/* Custom marker */}
                <View style={styles.markerContainer}>
                  <View style={[
                    styles.marker, 
                    { backgroundColor: STATUS_COLORS[item.status_kartu] },
                    item.status_kartu === 'Hilang' && styles.markerPulse,
                    selectedMarker === item.kartu_id && styles.markerSelected,
                  ]}>
                    <Ionicons name="person" size={14} color="white" />
                  </View>
                </View>
                
                {/* Callout (popup) */}
                <Callout 
                  tooltip
                  onPress={() => navigation.navigate('AnggotaDetail', { kartuId: item.kartu_id })}
                >
                  <View style={styles.callout}>
                    <Text style={styles.calloutName}>{item.nama}</Text>
                    <View style={[styles.calloutBadge, { borderColor: STATUS_COLORS[item.status_kartu] }]}>
                      <Text style={[styles.calloutStatus, { color: STATUS_COLORS[item.status_kartu] }]}>
                        {item.status_kartu}
                      </Text>
                    </View>
                    <Text style={styles.calloutLocation}>
                      📍 {item.lokasi_terakhir.lokasi || 'Tidak diketahui'}
                    </Text>
                    <Text style={styles.calloutTime}>
                      🕐 {item.lokasi_terakhir.waktu ? formatDate(item.lokasi_terakhir.waktu) : '-'}
                    </Text>
                    <View style={styles.calloutActions}>
                      <TouchableOpacity 
                        style={styles.calloutBtn}
                        onPress={() => openMaps(item.lokasi_terakhir.lat, item.lokasi_terakhir.lng, item.nama)}
                      >
                        <Ionicons name="navigate" size={12} color={COLORS.info} />
                        <Text style={styles.calloutBtnText}>Navigasi</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </Callout>
              </Marker>
            ))}
          </MapView>
          
          {/* Map legend */}
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: STATUS_COLORS['Aktif'] }]} />
              <Text style={styles.legendText}>Aktif</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: STATUS_COLORS['Hilang'] }]} />
              <Text style={styles.legendText}>Hilang</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: STATUS_COLORS['Nonaktif'] }]} />
              <Text style={styles.legendText}>Nonaktif</Text>
            </View>
          </View>
          
          {/* Card count overlay */}
          <View style={styles.countOverlay}>
            <Text style={styles.countText}>{markersData.length} lokasi ditampilkan</Text>
          </View>
        </View>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <FlatList
          ref={flatListRef}
          data={filteredData}
          keyExtractor={(i) => i.kartu_id}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh} 
              tintColor={COLORS.accent} 
            />
          }
          contentContainerStyle={{ padding: SIZES.padding }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="location-outline" size={48} color={COLORS.textMuted} />
              <Text style={styles.empty}>Tidak ada data</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgDark },
  
  // Alert banner
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    margin: SIZES.padding,
    marginBottom: 0,
    padding: 10,
    backgroundColor: COLORS.danger + '15',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.danger + '30',
  },
  alertText: { flex: 1, fontSize: SIZES.sm, color: COLORS.danger },
  alertAction: { fontSize: SIZES.sm, fontWeight: '600', color: COLORS.danger },
  
  // Control bar
  controlBar: {
    padding: SIZES.padding,
    paddingBottom: 8,
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: COLORS.bgCard,
    borderRadius: 10,
    padding: 4,
    marginBottom: 10,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
  },
  toggleBtnActive: {
    backgroundColor: COLORS.accent,
  },
  toggleText: { fontSize: SIZES.sm, color: COLORS.textMuted },
  toggleTextActive: { color: COLORS.bgDark, fontWeight: '600' },
  
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterBtnActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  filterDot: { width: 8, height: 8, borderRadius: 4 },
  filterText: { fontSize: SIZES.xs, color: COLORS.textMuted },
  filterTextActive: { color: COLORS.bgDark, fontWeight: '600' },
  
  // Map
  mapContainer: { flex: 1 },
  map: { flex: 1 },
  
  // Custom marker
  markerContainer: { alignItems: 'center' },
  marker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  markerSelected: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 4,
  },
  markerPulse: {
    // Note: Actual pulse animation would need Animated API
  },
  
  // Callout (popup)
  callout: {
    width: 200,
    padding: 12,
    backgroundColor: COLORS.bgCard,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  calloutName: {
    fontSize: SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  calloutBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    marginBottom: 8,
  },
  calloutStatus: { fontSize: 10, fontWeight: '600' },
  calloutLocation: { fontSize: SIZES.sm, color: COLORS.textSecondary, marginBottom: 2 },
  calloutTime: { fontSize: SIZES.xs, color: COLORS.textMuted },
  calloutActions: { marginTop: 8, flexDirection: 'row', gap: 8 },
  calloutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: COLORS.info + '20',
    borderRadius: 6,
  },
  calloutBtnText: { fontSize: SIZES.xs, color: COLORS.info, fontWeight: '500' },
  
  // Legend
  legend: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    flexDirection: 'row',
    gap: 12,
    backgroundColor: COLORS.bgCard + 'E6',
    padding: 10,
    borderRadius: 8,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: SIZES.xs, color: COLORS.textMuted },
  
  // Count overlay
  countOverlay: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: COLORS.bgCard + 'E6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  countText: { fontSize: SIZES.xs, color: COLORS.textSecondary },
  
  // List card styles
  card: { 
    backgroundColor: COLORS.bgCard, 
    borderRadius: 12, 
    padding: 14, 
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardLost: {
    borderColor: COLORS.danger + '40',
    backgroundColor: COLORS.danger + '08',
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  cardInfo: { flex: 1 },
  nama: { fontSize: SIZES.md, fontWeight: '600', color: COLORS.textPrimary },
  kartuId: { fontSize: SIZES.xs, color: COLORS.textMuted, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1 },
  statusText: { fontSize: SIZES.xs, fontWeight: '600' },
  lokasiRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  lokasiText: { flex: 1, fontSize: SIZES.sm, color: COLORS.textSecondary },
  lokasiWaktu: { fontSize: SIZES.xs, color: COLORS.textMuted },
  
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: COLORS.accent + '15',
    borderRadius: 6,
  },
  actionText: { fontSize: SIZES.xs, color: COLORS.accent, fontWeight: '500' },
  
  // History section
  historySection: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border },
  historySectionTitle: { fontSize: SIZES.xs, fontWeight: '700', color: COLORS.textMuted, letterSpacing: 2, marginBottom: 8 },
  historyItem: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: COLORS.border + '44',
  },
  historyInfo: { flex: 1 },
  historyLokasi: { fontSize: SIZES.sm, color: COLORS.textSecondary },
  historyCoords: { fontSize: SIZES.xs, color: COLORS.textMuted, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  historyMeta: { alignItems: 'flex-end' },
  historySource: { fontSize: 9, fontWeight: '600', color: COLORS.accent },
  historyTime: { fontSize: SIZES.xs, color: COLORS.textMuted },
  emptyHistory: { color: COLORS.textMuted, fontSize: SIZES.sm, fontStyle: 'italic' },
  
  // Empty state
  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  empty: { color: COLORS.textMuted, textAlign: 'center', marginTop: 12, fontSize: SIZES.md },
});
