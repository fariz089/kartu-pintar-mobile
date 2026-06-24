/**
 * ScanSearchScreen.js — Cari anggota secara manual (tanpa NFC/QR fisik).
 * Berguna saat kartu rusak/hilang: ketik NFC UID, QR data, Kartu ID, NRP, atau nama.
 * Hasil ditampilkan lalu bisa dibuka ke detail (ScanResult).
 */
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, formatRupiah } from '../utils/theme';
import { scanSearchAPI } from '../services/api';

export default function ScanSearchScreen({ navigation }) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const doSearch = async () => {
    if (!query.trim()) { Alert.alert('Info', 'Masukkan kata kunci pencarian'); return; }
    setLoading(true);
    setResult(null);
    try {
      const res = await scanSearchAPI.search(query.trim(), 'Manual');
      if (res.success) setResult(res.data);
      else Alert.alert('Tidak Ditemukan', res.message);
    } catch (e) {
      Alert.alert('Tidak Ditemukan', e.response?.data?.message || 'Data tidak ditemukan');
    }
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.intro}>
        Cari anggota tanpa scan fisik. Masukkan NFC UID, QR data, ID kartu, NRP, atau nama.
      </Text>

      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={COLORS.textMuted} />
        <TextInput style={styles.searchInput} placeholder="Kata kunci..."
          placeholderTextColor={COLORS.textMuted} value={query} onChangeText={setQuery}
          autoCapitalize="none" onSubmitEditing={doSearch} returnKeyType="search" />
      </View>

      <TouchableOpacity style={styles.searchBtn} onPress={doSearch} disabled={loading}>
        {loading ? <ActivityIndicator color={COLORS.bgDark} />
          : <Text style={styles.searchBtnText}>Cari</Text>}
      </TouchableOpacity>

      {result && (
        <TouchableOpacity style={styles.resultCard}
          onPress={() => navigation.navigate('ScanResult', { anggota: result, data: result })}>
          <View style={styles.resultHeader}>
            <View style={styles.avatar}><Ionicons name="person" size={22} color={COLORS.accent} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.resultNama}>{result.nama}</Text>
              <Text style={styles.resultSub}>{result.pangkat} · {result.kartu_id}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
          </View>
          {result.nrp && <Text style={styles.resultRow}>NRP: {result.nrp}</Text>}
          {result.saldo !== undefined && (
            <Text style={styles.resultRow}>Saldo: {formatRupiah(result.saldo)}</Text>
          )}
          <View style={[styles.statusBadge, {
            backgroundColor: (result.status_kartu === 'Aktif' ? COLORS.success : COLORS.danger) + '22',
          }]}>
            <Text style={[styles.statusText, {
              color: result.status_kartu === 'Aktif' ? COLORS.success : COLORS.danger,
            }]}>{result.status_kartu}</Text>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgDark, padding: SIZES.padding },
  intro: { color: COLORS.textSecondary, fontSize: 13, lineHeight: 18, marginBottom: 16 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bgInput,
    borderRadius: 12, paddingHorizontal: 14, borderWidth: 1, borderColor: COLORS.border,
  },
  searchInput: { flex: 1, height: 46, color: COLORS.textPrimary, marginLeft: 8, fontSize: SIZES.md },
  searchBtn: {
    backgroundColor: COLORS.accent, borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 12,
  },
  searchBtnText: { color: COLORS.bgDark, fontWeight: '700', fontSize: 15 },
  resultCard: {
    backgroundColor: COLORS.bgCard, borderRadius: 14, padding: 16, marginTop: 20,
    borderWidth: 1, borderColor: COLORS.accent + '33',
  },
  resultHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 46, height: 46, borderRadius: 23, backgroundColor: COLORS.bgInput,
    alignItems: 'center', justifyContent: 'center',
  },
  resultNama: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  resultSub: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  resultRow: { fontSize: 13, color: COLORS.textPrimary, marginTop: 8 },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8, marginTop: 10 },
  statusText: { fontSize: 11, fontWeight: '700', letterSpacing: 1 },
});
