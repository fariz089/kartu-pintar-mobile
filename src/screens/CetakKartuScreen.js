/**
 * CetakKartuScreen.js — Preview kartu untuk dicetak (admin & pers).
 * Menampilkan daftar anggota; pilih satu untuk melihat preview kartu lengkap
 * dengan QR code (di-generate server-side via /api/qrcode).
 *
 * Catatan: mencetak fisik dari mobile bergantung perangkat. Layar ini
 * menyediakan preview siap-cetak; pengguna dapat screenshot / share, atau
 * gunakan tombol "Buka di Web" untuk mencetak via halaman /cetak-kartu.
 */
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput,
  RefreshControl, Alert, Modal, Image, Linking, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, SIZES, formatDate } from '../utils/theme';
import { cetakKartuAPI, API_BASE } from '../services/api';

export default function CetakKartuScreen() {
  const [data, setData] = useState([]);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [preview, setPreview] = useState(null);

  const load = async () => {
    try {
      const res = await cetakKartuAPI.list();
      if (res.success) setData(res.data);
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Gagal memuat data');
    }
  };

  useFocusEffect(useCallback(() => { load(); }, []));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const filtered = data.filter((a) =>
    !search ||
    a.nama?.toLowerCase().includes(search.toLowerCase()) ||
    a.nrp?.toLowerCase().includes(search.toLowerCase()) ||
    a.kartu_id?.toLowerCase().includes(search.toLowerCase()));

  const qrUrl = (a) =>
    `${API_BASE}/api/qrcode?data=${encodeURIComponent(a.qr_data || a.kartu_id)}`;

  const fotoUrl = (f) => {
    if (!f || f === '/static/img/avatar-default.svg') return null;
    if (f.startsWith('http')) return f;
    return `${API_BASE}${f.startsWith('/') ? '' : '/'}${f}`;
  };

  const openWeb = () => {
    Linking.openURL(`${API_BASE}/cetak-kartu`).catch(() =>
      Alert.alert('Error', 'Tidak dapat membuka halaman web'));
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.row} onPress={() => setPreview(item)}>
      <View style={styles.avatar}>
        {fotoUrl(item.foto)
          ? <Image source={{ uri: fotoUrl(item.foto) }} style={styles.avatarImg} />
          : <Ionicons name="person" size={20} color={COLORS.accent} />}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.nama}>{item.nama}</Text>
        <Text style={styles.sub}>{item.pangkat} · {item.kartu_id}</Text>
      </View>
      <Ionicons name="card-outline" size={18} color={COLORS.textMuted} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={COLORS.textMuted} />
        <TextInput style={styles.searchInput} placeholder="Cari anggota..."
          placeholderTextColor={COLORS.textMuted} value={search} onChangeText={setSearch} />
      </View>

      <FlatList data={filtered} keyExtractor={(i) => i.kartu_id} renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />}
        contentContainerStyle={{ padding: SIZES.padding, paddingTop: 4 }}
        ListEmptyComponent={<Text style={styles.empty}>Tidak ada data</Text>} />

      <Modal visible={!!preview} transparent animationType="fade" onRequestClose={() => setPreview(null)}>
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalScroll}>
            {preview && (
              <View style={styles.kartu}>
                <View style={styles.kartuHeader}>
                  <Text style={styles.kartuHeaderText}>KARTU PINTAR — POLTEKAD</Text>
                </View>
                <View style={styles.kartuBody}>
                  <View style={styles.kartuFoto}>
                    {fotoUrl(preview.foto)
                      ? <Image source={{ uri: fotoUrl(preview.foto) }} style={styles.kartuFotoImg} />
                      : <Ionicons name="person" size={48} color={COLORS.accent} />}
                  </View>
                  <View style={{ flex: 1, marginLeft: 14 }}>
                    <Text style={styles.kartuNama}>{preview.nama}</Text>
                    <Text style={styles.kartuField}>{preview.pangkat}</Text>
                    <Text style={styles.kartuField}>NRP: {preview.nrp}</Text>
                    {preview.jabatan ? <Text style={styles.kartuField}>{preview.jabatan}</Text> : null}
                    {preview.jurusan ? <Text style={styles.kartuField}>{preview.jurusan}</Text> : null}
                    <Text style={styles.kartuId}>{preview.kartu_id}</Text>
                  </View>
                </View>
                <View style={styles.kartuFooter}>
                  <Image source={{ uri: qrUrl(preview) }} style={styles.qr} resizeMode="contain" />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.kartuMini}>Satuan: {preview.satuan || 'Poltekad'}</Text>
                    {preview.golongan_darah ? <Text style={styles.kartuMini}>Gol. Darah: {preview.golongan_darah}</Text> : null}
                    <Text style={styles.kartuMini}>Status: {preview.status_kartu}</Text>
                  </View>
                </View>
              </View>
            )}

            <TouchableOpacity style={styles.webBtn} onPress={openWeb}>
              <Ionicons name="print" size={18} color={COLORS.bgDark} />
              <Text style={styles.webBtnText}>Cetak via Web</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setPreview(null)}>
              <Text style={styles.closeBtnText}>Tutup</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgDark },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', margin: SIZES.padding, marginBottom: 4,
    backgroundColor: COLORS.bgInput, borderRadius: 12, paddingHorizontal: 14,
    borderWidth: 1, borderColor: COLORS.border,
  },
  searchInput: { flex: 1, height: 44, color: COLORS.textPrimary, marginLeft: 8, fontSize: SIZES.md },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.bgCard,
    borderRadius: 10, padding: 12, marginBottom: 6,
  },
  avatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.bgInput,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  avatarImg: { width: '100%', height: '100%' },
  nama: { fontSize: SIZES.md, fontWeight: '600', color: COLORS.textPrimary },
  sub: { fontSize: SIZES.sm, color: COLORS.textSecondary, marginTop: 2 },
  empty: { color: COLORS.textMuted, textAlign: 'center', marginTop: 40 },
  modalOverlay: { flex: 1, backgroundColor: '#000c' },
  modalScroll: { padding: SIZES.padding, paddingTop: 60, paddingBottom: 40 },
  kartu: {
    backgroundColor: '#f4f1e8', borderRadius: 14, overflow: 'hidden',
    borderWidth: 2, borderColor: COLORS.accent,
  },
  kartuHeader: { backgroundColor: COLORS.primary, padding: 10, alignItems: 'center' },
  kartuHeaderText: { color: '#fff', fontWeight: '800', fontSize: 12, letterSpacing: 1 },
  kartuBody: { flexDirection: 'row', padding: 14 },
  kartuFoto: {
    width: 80, height: 100, borderRadius: 8, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    borderWidth: 1, borderColor: '#0002',
  },
  kartuFotoImg: { width: '100%', height: '100%' },
  kartuNama: { fontSize: 17, fontWeight: '800', color: '#1a2332' },
  kartuField: { fontSize: 12, color: '#333', marginTop: 2 },
  kartuId: { fontSize: 13, fontWeight: '700', color: COLORS.primary, marginTop: 6, fontFamily: 'monospace' },
  kartuFooter: {
    flexDirection: 'row', alignItems: 'center', padding: 14, paddingTop: 0,
  },
  qr: { width: 72, height: 72, backgroundColor: '#fff' },
  kartuMini: { fontSize: 11, color: '#444', marginTop: 2 },
  webBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.accent, borderRadius: 10, padding: 14, marginTop: 20,
  },
  webBtnText: { color: COLORS.bgDark, fontWeight: '700', fontSize: 14 },
  closeBtn: { alignItems: 'center', padding: 14, marginTop: 8 },
  closeBtnText: { color: COLORS.textSecondary, fontWeight: '600' },
});
