import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, SIZES, formatRupiah } from '../utils/theme';
import { authAPI } from '../services/api';
import api from '../services/api';

export default function ProfileScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [changingPw, setChangingPw] = useState(false);

  const loadData = async () => {
    try {
      const userData = await authAPI.getStoredUser();
      setUser(userData);
    } catch (e) {
      console.log(e);
    }
  };

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await authAPI.getMe();
      if (res.success) {
        setUser(res.data);
      }
    } catch (e) { console.log(e); }
    setRefreshing(false);
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Yakin ingin keluar?', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: async () => {
        await authAPI.logout();
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
      }},
    ]);
  };

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword) {
      Alert.alert('Error', 'Isi password lama dan baru');
      return;
    }
    if (newPassword.length < 4) {
      Alert.alert('Error', 'Password baru minimal 4 karakter');
      return;
    }
    setChangingPw(true);
    try {
      const res = await api.post('/api/auth/change-password', {
        old_password: oldPassword,
        new_password: newPassword,
      });
      if (res.data.success) {
        Alert.alert('Berhasil', 'Password berhasil diubah');
        setShowChangePassword(false);
        setOldPassword('');
        setNewPassword('');
      } else {
        Alert.alert('Gagal', res.data.message || 'Gagal mengubah password');
      }
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Gagal mengubah password');
    }
    setChangingPw(false);
  };

  const InfoRow = ({ label, value, icon }) => (
    <View style={styles.infoRow}>
      {icon && <Ionicons name={icon} size={16} color={COLORS.textMuted} style={{ marginRight: 8 }} />}
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || '-'}</Text>
    </View>
  );

  return (
    <ScrollView style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />}>

      {/* Profile Header */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <Ionicons name="person" size={40} color={COLORS.accent} />
        </View>
        <Text style={styles.name}>{user?.nama || 'User'}</Text>
        <Text style={styles.role}>{user?.role?.toUpperCase()}</Text>
        <Text style={styles.username}>@{user?.username}</Text>
      </View>

      {/* Saldo Card (if has anggota) */}
      {user?.anggota && (
        <View style={styles.saldoCard}>
          <View style={styles.saldoRow}>
            <View>
              <Text style={styles.saldoLabel}>SALDO KARTU</Text>
              <Text style={styles.saldoValue}>{formatRupiah(user.anggota.saldo)}</Text>
            </View>
            <View>
              <Text style={styles.saldoLabel}>ID KARTU</Text>
              <Text style={styles.kartuId}>{user.anggota.kartu_id}</Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: user.anggota.status_kartu === 'Aktif' ? COLORS.success + '22' : COLORS.danger + '22' }]}>
            <Text style={[styles.statusText, { color: user.anggota.status_kartu === 'Aktif' ? COLORS.success : COLORS.danger }]}>
              {user.anggota.status_kartu}
            </Text>
          </View>
        </View>
      )}

      {/* Identity Info */}
      {user?.anggota && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>IDENTITAS ANGGOTA</Text>
          <View style={styles.card}>
            <InfoRow label="NRP" value={user.anggota.nrp} icon="id-card" />
            <InfoRow label="Pangkat" value={user.anggota.pangkat} icon="star" />
            <InfoRow label="Satuan" value={user.anggota.satuan} icon="business" />
            <InfoRow label="Jabatan" value={user.anggota.jabatan} icon="briefcase" />
            <InfoRow label="Jurusan" value={user.anggota.jurusan} icon="school" />
            <InfoRow label="Tempat Lahir" value={user.anggota.tempat_lahir} icon="location" />
            <InfoRow label="Tgl Lahir" value={user.anggota.tanggal_lahir} icon="calendar" />
            <InfoRow label="Gol. Darah" value={user.anggota.golongan_darah} icon="water" />
            <InfoRow label="Agama" value={user.anggota.agama} icon="heart" />
            <InfoRow label="No. Telepon" value={user.anggota.no_telepon} icon="call" />
          </View>
        </View>
      )}

      {/* Change Password */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>KEAMANAN</Text>
        <TouchableOpacity style={styles.card} onPress={() => setShowChangePassword(!showChangePassword)}>
          <View style={styles.menuRow}>
            <Ionicons name="key" size={20} color={COLORS.accent} />
            <Text style={styles.menuText}>Ubah Password</Text>
            <Ionicons name={showChangePassword ? 'chevron-up' : 'chevron-down'} size={20} color={COLORS.textMuted} />
          </View>
        </TouchableOpacity>

        {showChangePassword && (
          <View style={styles.pwCard}>
            <TextInput style={styles.input} placeholder="Password Lama" placeholderTextColor={COLORS.textMuted}
              secureTextEntry value={oldPassword} onChangeText={setOldPassword} />
            <TextInput style={styles.input} placeholder="Password Baru" placeholderTextColor={COLORS.textMuted}
              secureTextEntry value={newPassword} onChangeText={setNewPassword} />
            <TouchableOpacity style={[styles.pwBtn, changingPw && { opacity: 0.5 }]}
              onPress={handleChangePassword} disabled={changingPw}>
              <Text style={styles.pwBtnText}>{changingPw ? 'Menyimpan...' : 'Simpan Password'}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Logout Button */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={COLORS.danger} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.footer}>Kartu Pintar — Poltekkad © 2025</Text>
      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgDark },
  header: {
    alignItems: 'center', paddingTop: 24, paddingBottom: 16,
  },
  avatarContainer: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: COLORS.bgCard, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: COLORS.accent, marginBottom: 12,
  },
  name: { fontSize: 22, fontWeight: '700', color: COLORS.textPrimary },
  role: { fontSize: 11, color: COLORS.accent, fontWeight: '600', letterSpacing: 3, marginTop: 4 },
  username: { fontSize: 14, color: COLORS.textSecondary, marginTop: 2 },
  saldoCard: {
    marginHorizontal: SIZES.padding, padding: 18,
    backgroundColor: COLORS.bgCard, borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.accent + '44', marginTop: 8,
  },
  saldoRow: { flexDirection: 'row', justifyContent: 'space-between' },
  saldoLabel: { fontSize: 10, color: COLORS.textMuted, letterSpacing: 2 },
  saldoValue: { fontSize: 26, fontWeight: '800', color: COLORS.accent, marginTop: 2 },
  kartuId: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary, fontFamily: 'monospace', marginTop: 2 },
  statusBadge: {
    alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: 8, marginTop: 10,
  },
  statusText: { fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  section: { marginTop: 16, paddingHorizontal: SIZES.padding },
  sectionTitle: {
    fontSize: 11, fontWeight: '700', color: COLORS.textMuted,
    letterSpacing: 2, marginBottom: 8,
  },
  card: { backgroundColor: COLORS.bgCard, borderRadius: 12, padding: 14 },
  infoRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  infoLabel: { flex: 1, fontSize: 13, color: COLORS.textSecondary },
  infoValue: { fontSize: 13, fontWeight: '500', color: COLORS.textPrimary },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  menuText: { flex: 1, fontSize: 14, fontWeight: '500', color: COLORS.textPrimary },
  pwCard: {
    backgroundColor: COLORS.bgCard, borderRadius: 12, padding: 14, marginTop: 8, gap: 10,
  },
  input: {
    backgroundColor: COLORS.bgDark, borderRadius: 8, padding: 12,
    color: COLORS.textPrimary, fontSize: 14, borderWidth: 1, borderColor: COLORS.border,
  },
  pwBtn: {
    backgroundColor: COLORS.accent, borderRadius: 8, padding: 12, alignItems: 'center',
  },
  pwBtnText: { fontWeight: '700', color: COLORS.bgDark, fontSize: 14 },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.bgCard, borderRadius: 12, padding: 14, gap: 8,
    borderWidth: 1, borderColor: COLORS.danger + '44',
  },
  logoutText: { fontSize: 15, fontWeight: '600', color: COLORS.danger },
  footer: { textAlign: 'center', color: COLORS.textMuted, fontSize: 11, marginTop: 24 },
});
