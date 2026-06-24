/**
 * ManajemenScreen.js
 * Hub menu untuk fitur administratif/manajemen yang sebelumnya hanya ada di web.
 * Diakses dari ProfileScreen (untuk role admin) atau dari Dashboard.
 *
 * Menu yang ditampilkan menyesuaikan role:
 *   - admin: semua fitur
 *   - pers : cetak kartu, scan-log (lihat), lacak
 *   - lainnya: hanya yang relevan (mis. cetak kartu sendiri, backup codes)
 */
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, SIZES } from '../utils/theme';
import { authAPI } from '../services/api';

const MENU = [
  {
    section: 'Manajemen User',
    roles: ['admin'],
    items: [
      { label: 'Daftar User', desc: 'Kelola akun login', icon: 'people', screen: 'UserList' },
      { label: 'Tambah User', desc: 'Buat akun baru', icon: 'person-add', screen: 'UserForm', params: { mode: 'create' } },
    ],
  },
  {
    section: 'Data Anggota',
    roles: ['admin'],
    items: [
      { label: 'Tambah Anggota', desc: 'Daftarkan anggota baru', icon: 'add-circle', screen: 'AnggotaForm', params: { mode: 'create' } },
      { label: 'Kelola Anggota', desc: 'Edit / hapus anggota', icon: 'create', screen: 'AnggotaList', params: { manageMode: true } },
    ],
  },
  {
    section: 'Keuangan',
    roles: ['admin'],
    items: [
      { label: 'Hutang / Piutang', desc: 'Daftar & pelunasan hutang', icon: 'cash', screen: 'HutangList' },
    ],
  },
  {
    section: 'Find My Trackers',
    roles: ['admin'],
    items: [
      { label: 'Manajemen Tracker', desc: 'Kelola tracker Find Hub', icon: 'navigate', screen: 'TrackerList' },
    ],
  },
  {
    section: 'Operasional',
    roles: ['admin', 'pers'],
    items: [
      { label: 'Cetak Kartu', desc: 'Preview & cetak stiker kartu', icon: 'print', screen: 'CetakKartu' },
      { label: 'Scan Manual', desc: 'Cari anggota tanpa scan', icon: 'search', screen: 'ScanSearch' },
    ],
  },
  {
    section: 'Log',
    roles: ['admin'],
    items: [
      { label: 'Riwayat Scan', desc: '100 scan terakhir', icon: 'list', screen: 'ScanLog' },
    ],
  },
  {
    section: 'Keamanan',
    roles: ['admin', 'pers', 'user', 'operator_kantin', 'pam'],
    items: [
      { label: 'Kode Cadangan 2FA', desc: 'Lihat & buat ulang backup code', icon: 'shield-checkmark', screen: 'BackupCodes' },
    ],
  },
];

export default function ManajemenScreen({ navigation }) {
  const [role, setRole] = useState(null);

  useFocusEffect(useCallback(() => {
    (async () => {
      const u = await authAPI.getStoredUser();
      setRole(u?.role || 'user');
    })();
  }, []));

  if (!role) return <View style={styles.container} />;

  const sections = MENU.filter((s) => s.roles.includes(role));

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: SIZES.padding }}>
      <Text style={styles.intro}>
        Fitur administratif & manajemen. Akses menyesuaikan peran ({role}).
      </Text>
      {sections.map((sec) => (
        <View key={sec.section} style={styles.section}>
          <Text style={styles.sectionTitle}>{sec.section.toUpperCase()}</Text>
          {sec.items.map((it) => (
            <TouchableOpacity
              key={it.label}
              style={styles.card}
              onPress={() => navigation.navigate(it.screen, it.params || {})}
            >
              <View style={styles.iconBox}>
                <Ionicons name={it.icon} size={20} color={COLORS.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{it.label}</Text>
                <Text style={styles.cardDesc}>{it.desc}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          ))}
        </View>
      ))}
      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgDark },
  intro: { color: COLORS.textSecondary, fontSize: 13, marginBottom: 16, lineHeight: 18 },
  section: { marginBottom: 18 },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted, letterSpacing: 2, marginBottom: 8 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.bgCard, borderRadius: 12, padding: 14, marginBottom: 8,
  },
  iconBox: {
    width: 40, height: 40, borderRadius: 10, backgroundColor: COLORS.accent + '18',
    alignItems: 'center', justifyContent: 'center',
  },
  cardTitle: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  cardDesc: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
});
