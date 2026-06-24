/**
 * UserFormScreen.js — Tambah / edit user (admin).
 * mode: 'create' | 'edit'. Untuk edit, params.user dikirim.
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  Alert, Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../utils/theme';
import { userAPI } from '../services/api';

const ROLES = [
  { value: 'user', label: 'User' },
  { value: 'admin', label: 'Admin' },
  { value: 'operator_kantin', label: 'Kantin' },
  { value: 'pers', label: 'Pers' },
];

export default function UserFormScreen({ route, navigation }) {
  const mode = route.params?.mode || 'create';
  const existing = route.params?.user || null;
  const isEdit = mode === 'edit';

  const [username, setUsername] = useState(existing?.username || '');
  const [nama, setNama] = useState(existing?.nama || '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState(existing?.role || 'user');
  const [isActive, setIsActive] = useState(existing?.is_active ?? true);
  const [anggotaList, setAnggotaList] = useState([]);
  const [anggotaId, setAnggotaId] = useState(existing?.anggota_id || null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    navigation.setOptions({ title: isEdit ? 'Edit User' : 'Tambah User' });
    if (!isEdit) {
      (async () => {
        try {
          const res = await userAPI.anggotaTanpaUser();
          if (res.success) setAnggotaList(res.data);
        } catch (e) { /* opsional */ }
      })();
    }
  }, []);

  const save = async () => {
    if (isEdit) {
      if (!nama.trim()) { Alert.alert('Error', 'Nama wajib diisi'); return; }
    } else if (!username.trim() || !nama.trim() || !password.trim()) {
      Alert.alert('Error', 'Username, nama, dan password wajib diisi');
      return;
    }
    if (password && password.length < 4) {
      Alert.alert('Error', 'Password minimal 4 karakter');
      return;
    }
    setSaving(true);
    try {
      let res;
      if (isEdit) {
        const payload = { nama: nama.trim(), role, is_active: isActive, anggota_id: anggotaId };
        if (password) payload.password = password;
        res = await userAPI.update(existing.id, payload);
      } else {
        res = await userAPI.create({
          username: username.trim(), nama: nama.trim(), password,
          role, anggota_id: anggotaId,
        });
      }
      if (res.success) {
        Alert.alert('Berhasil', res.message, [{ text: 'OK', onPress: () => navigation.goBack() }]);
      } else {
        Alert.alert('Gagal', res.message);
      }
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Gagal menyimpan');
    }
    setSaving(false);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: SIZES.padding }}>
      <Text style={styles.label}>Username</Text>
      <TextInput
        style={[styles.input, isEdit && styles.inputDisabled]}
        value={username} onChangeText={setUsername}
        editable={!isEdit} autoCapitalize="none"
        placeholder="username" placeholderTextColor={COLORS.textMuted}
      />
      {isEdit && <Text style={styles.hint}>Username tidak dapat diubah.</Text>}

      <Text style={styles.label}>Nama Lengkap</Text>
      <TextInput style={styles.input} value={nama} onChangeText={setNama}
        placeholder="Nama" placeholderTextColor={COLORS.textMuted} />

      <Text style={styles.label}>{isEdit ? 'Password Baru (kosongkan jika tetap)' : 'Password'}</Text>
      <TextInput style={styles.input} value={password} onChangeText={setPassword}
        secureTextEntry placeholder="••••••" placeholderTextColor={COLORS.textMuted} />

      <Text style={styles.label}>Role</Text>
      <View style={styles.roleRow}>
        {ROLES.map((r) => (
          <TouchableOpacity key={r.value}
            style={[styles.roleChip, role === r.value && styles.roleChipActive]}
            onPress={() => setRole(r.value)}>
            <Text style={[styles.roleChipText, role === r.value && styles.roleChipTextActive]}>{r.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {isEdit && (
        <View style={styles.switchRow}>
          <Text style={styles.label}>Akun Aktif</Text>
          <Switch value={isActive} onValueChange={setIsActive}
            trackColor={{ true: COLORS.accent, false: COLORS.border }} thumbColor={COLORS.textPrimary} />
        </View>
      )}

      {!isEdit && anggotaList.length > 0 && (
        <>
          <Text style={styles.label}>Tautkan ke Anggota (opsional)</Text>
          <ScrollView style={styles.anggotaPicker} nestedScrollEnabled>
            <TouchableOpacity style={[styles.anggotaItem, !anggotaId && styles.anggotaItemActive]}
              onPress={() => setAnggotaId(null)}>
              <Text style={styles.anggotaItemText}>— Tidak ditautkan —</Text>
            </TouchableOpacity>
            {anggotaList.map((a) => (
              <TouchableOpacity key={a.id}
                style={[styles.anggotaItem, anggotaId === a.id && styles.anggotaItemActive]}
                onPress={() => setAnggotaId(a.id)}>
                <Text style={styles.anggotaItemText}>{a.nama} ({a.nrp})</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </>
      )}

      <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={saving}>
        <Ionicons name="save" size={18} color={COLORS.bgDark} />
        <Text style={styles.saveBtnText}>{saving ? 'Menyimpan...' : 'Simpan'}</Text>
      </TouchableOpacity>
      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgDark },
  label: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 6, marginTop: 14 },
  hint: { fontSize: 11, color: COLORS.textMuted, marginTop: 4 },
  input: {
    backgroundColor: COLORS.bgInput, borderRadius: 8, padding: 12,
    color: COLORS.textPrimary, fontSize: 14, borderWidth: 1, borderColor: COLORS.border,
  },
  inputDisabled: { opacity: 0.6 },
  roleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  roleChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8,
    backgroundColor: COLORS.bgInput, borderWidth: 1, borderColor: COLORS.border,
  },
  roleChipActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  roleChipText: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '600' },
  roleChipTextActive: { color: COLORS.bgDark },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  anggotaPicker: {
    maxHeight: 160, backgroundColor: COLORS.bgCard, borderRadius: 8,
    borderWidth: 1, borderColor: COLORS.border,
  },
  anggotaItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  anggotaItemActive: { backgroundColor: COLORS.accent + '22' },
  anggotaItemText: { color: COLORS.textPrimary, fontSize: 13 },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.accent, borderRadius: 10, padding: 14, marginTop: 24,
  },
  saveBtnText: { fontWeight: '700', color: COLORS.bgDark, fontSize: 15 },
});
