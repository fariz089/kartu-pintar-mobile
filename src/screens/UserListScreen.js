/**
 * UserListScreen.js — Manajemen daftar user (admin).
 * Tindakan: cari, toggle aktif, reset password, reset 2FA, edit, bulk-create.
 */
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput,
  RefreshControl, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, SIZES } from '../utils/theme';
import { userAPI } from '../services/api';

const ROLE_COLOR = {
  admin: COLORS.danger,
  pers: COLORS.info,
  operator_kantin: COLORS.warning,
  user: COLORS.textSecondary,
};

export default function UserListScreen({ navigation }) {
  const [data, setData] = useState([]);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const load = async () => {
    try {
      const res = await userAPI.list(search);
      if (res.success) setData(res.data);
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Gagal memuat user');
    }
  };

  useFocusEffect(useCallback(() => { load(); }, [search]));

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const doToggle = (u) => {
    Alert.alert(
      u.is_active ? 'Nonaktifkan User' : 'Aktifkan User',
      `${u.is_active ? 'Nonaktifkan' : 'Aktifkan'} akun "${u.username}"?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Ya', onPress: async () => {
            setBusyId(u.id);
            try {
              const res = await userAPI.toggle(u.id);
              if (res.success) load();
              else Alert.alert('Gagal', res.message);
            } catch (e) {
              Alert.alert('Error', e.response?.data?.message || 'Gagal');
            }
            setBusyId(null);
          },
        },
      ],
    );
  };

  const doResetPassword = (u) => {
    Alert.prompt(
      'Reset Password',
      `Password baru untuk "${u.username}" (min. 4 karakter):`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Reset', onPress: async (pw) => {
            if (!pw || pw.length < 4) { Alert.alert('Error', 'Password minimal 4 karakter'); return; }
            try {
              const res = await userAPI.resetPassword(u.id, pw);
              Alert.alert(res.success ? 'Berhasil' : 'Gagal', res.message);
            } catch (e) {
              Alert.alert('Error', e.response?.data?.message || 'Gagal');
            }
          },
        },
      ],
      'secure-text',
    );
  };

  const doResetTotp = (u) => {
    Alert.alert(
      'Reset 2FA',
      `Reset Authenticator/2FA untuk "${u.username}"? User akan diminta setup ulang saat login berikutnya.`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Reset 2FA', style: 'destructive', onPress: async () => {
            try {
              const res = await userAPI.resetTotp(u.id);
              Alert.alert(res.success ? 'Berhasil' : 'Gagal', res.message);
              load();
            } catch (e) {
              Alert.alert('Error', e.response?.data?.message || 'Gagal');
            }
          },
        },
      ],
    );
  };

  const doBulkCreate = () => {
    Alert.alert(
      'Bulk Create User',
      'Buat akun login untuk semua anggota yang belum punya akun? (username = NRP, password = NRP)',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Buat', onPress: async () => {
            try {
              const res = await userAPI.bulkCreate();
              Alert.alert(res.success ? 'Selesai' : 'Gagal', res.message);
              load();
            } catch (e) {
              Alert.alert('Error', e.response?.data?.message || 'Gagal');
            }
          },
        },
      ],
    );
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.cardTop}
        onPress={() => navigation.navigate('UserForm', { mode: 'edit', user: item })}
      >
        <View style={styles.avatar}>
          <Ionicons name="person" size={20} color={COLORS.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.nama}>{item.nama}</Text>
          <Text style={styles.username}>@{item.username}</Text>
          <View style={styles.badgeRow}>
            <View style={[styles.roleBadge, { backgroundColor: (ROLE_COLOR[item.role] || COLORS.textMuted) + '22' }]}>
              <Text style={[styles.roleText, { color: ROLE_COLOR[item.role] || COLORS.textMuted }]}>
                {item.role}
              </Text>
            </View>
            {item.totp_enabled && (
              <View style={styles.totpBadge}>
                <Ionicons name="shield-checkmark" size={11} color={COLORS.success} />
                <Text style={styles.totpText}>2FA</Text>
              </View>
            )}
            <View style={[styles.statusDot, { backgroundColor: item.is_active ? COLORS.success : COLORS.danger }]} />
          </View>
        </View>
        <Ionicons name="create-outline" size={18} color={COLORS.textMuted} />
      </TouchableOpacity>

      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => doToggle(item)} disabled={busyId === item.id}>
          <Ionicons name={item.is_active ? 'pause-circle-outline' : 'play-circle-outline'} size={16} color={COLORS.textSecondary} />
          <Text style={styles.actionText}>{item.is_active ? 'Nonaktif' : 'Aktifkan'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => doResetPassword(item)}>
          <Ionicons name="key-outline" size={16} color={COLORS.textSecondary} />
          <Text style={styles.actionText}>Reset Pw</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => doResetTotp(item)}>
          <Ionicons name="refresh-outline" size={16} color={COLORS.textSecondary} />
          <Text style={styles.actionText}>Reset 2FA</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={COLORS.textMuted} />
        <TextInput style={styles.searchInput} placeholder="Cari user..."
          placeholderTextColor={COLORS.textMuted} value={search} onChangeText={setSearch} />
      </View>

      <View style={styles.toolbar}>
        <TouchableOpacity style={styles.toolBtn} onPress={() => navigation.navigate('UserForm', { mode: 'create' })}>
          <Ionicons name="person-add" size={16} color={COLORS.bgDark} />
          <Text style={styles.toolBtnText}>Tambah</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.toolBtn, styles.toolBtnAlt]} onPress={doBulkCreate}>
          <Ionicons name="people" size={16} color={COLORS.accent} />
          <Text style={[styles.toolBtnText, { color: COLORS.accent }]}>Bulk Create</Text>
        </TouchableOpacity>
      </View>

      <FlatList data={data} keyExtractor={(i) => i.id.toString()} renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />}
        contentContainerStyle={{ padding: SIZES.padding }}
        ListEmptyComponent={<Text style={styles.empty}>Tidak ada user</Text>} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgDark },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', margin: SIZES.padding, marginBottom: 8,
    backgroundColor: COLORS.bgInput, borderRadius: 12, paddingHorizontal: 14,
    borderWidth: 1, borderColor: COLORS.border,
  },
  searchInput: { flex: 1, height: 44, color: COLORS.textPrimary, marginLeft: 8, fontSize: SIZES.md },
  toolbar: { flexDirection: 'row', gap: 10, paddingHorizontal: SIZES.padding, marginBottom: 4 },
  toolBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.accent,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8,
  },
  toolBtnAlt: { backgroundColor: COLORS.accent + '22' },
  toolBtnText: { fontWeight: '700', color: COLORS.bgDark, fontSize: 13 },
  card: { backgroundColor: COLORS.bgCard, borderRadius: 12, marginBottom: 8, overflow: 'hidden' },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  avatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.bgInput,
    alignItems: 'center', justifyContent: 'center',
  },
  nama: { fontSize: SIZES.md, fontWeight: '600', color: COLORS.textPrimary },
  username: { fontSize: SIZES.sm, color: COLORS.textSecondary, marginTop: 1 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 5 },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  roleText: { fontSize: 10, fontWeight: '700' },
  totpBadge: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  totpText: { fontSize: 10, color: COLORS.success, fontWeight: '600' },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  actionRow: {
    flexDirection: 'row', borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: 10,
  },
  actionText: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '500' },
  empty: { color: COLORS.textMuted, textAlign: 'center', marginTop: 40 },
});
