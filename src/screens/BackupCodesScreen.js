/**
 * BackupCodesScreen.js — Lihat status & regenerasi kode cadangan 2FA (per-user).
 * Kode hanya ditampilkan SEKALI saat baru di-generate. Regenerasi memerlukan
 * konfirmasi password.
 */
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, SIZES } from '../utils/theme';
import { backupCodesAPI } from '../services/api';

export default function BackupCodesScreen() {
  const [status, setStatus] = useState(null);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [newCodes, setNewCodes] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const load = async () => {
    try {
      const res = await backupCodesAPI.status();
      if (res.success) setStatus(res.data);
    } catch (e) { /* ignore */ }
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const regenerate = async () => {
    if (!password) { Alert.alert('Error', 'Masukkan password untuk konfirmasi'); return; }
    setBusy(true);
    try {
      const res = await backupCodesAPI.regenerate(password);
      if (res.success) {
        setNewCodes(res.data.codes);
        setShowConfirm(false);
        setPassword('');
        load();
      } else {
        Alert.alert('Gagal', res.message);
      }
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Gagal membuat kode');
    }
    setBusy(false);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: SIZES.padding }}>
      <View style={styles.statusCard}>
        <Ionicons name="shield-checkmark"
          size={28} color={status?.totp_enabled ? COLORS.success : COLORS.textMuted} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.statusTitle}>
            {status?.totp_enabled ? '2FA Aktif' : '2FA Belum Aktif'}
          </Text>
          <Text style={styles.statusSub}>
            {status?.totp_enabled
              ? `Sisa kode cadangan: ${status.remaining}`
              : 'Aktifkan 2FA terlebih dahulu untuk menggunakan kode cadangan.'}
          </Text>
        </View>
      </View>

      <Text style={styles.info}>
        Kode cadangan dipakai untuk login bila Authenticator tidak tersedia (HP hilang/ganti).
        Setiap kode hanya bisa dipakai sekali. Membuat kode baru akan membatalkan semua kode lama.
      </Text>

      {newCodes && (
        <View style={styles.codesCard}>
          <View style={styles.codesHeader}>
            <Ionicons name="warning" size={18} color={COLORS.warning} />
            <Text style={styles.codesWarn}>Simpan sekarang — tidak akan ditampilkan lagi!</Text>
          </View>
          <View style={styles.codesGrid}>
            {newCodes.map((c, i) => (
              <View key={i} style={styles.codeChip}>
                <Text style={styles.codeText}>{c}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {status?.totp_enabled && !showConfirm && (
        <TouchableOpacity style={styles.regenBtn} onPress={() => { setNewCodes(null); setShowConfirm(true); }}>
          <Ionicons name="refresh" size={18} color={COLORS.bgDark} />
          <Text style={styles.regenBtnText}>Buat Ulang Kode Cadangan</Text>
        </TouchableOpacity>
      )}

      {showConfirm && (
        <View style={styles.confirmCard}>
          <Text style={styles.label}>Konfirmasi Password</Text>
          <TextInput style={styles.input} value={password} onChangeText={setPassword}
            secureTextEntry placeholder="Password akun" placeholderTextColor={COLORS.textMuted} />
          <View style={styles.confirmActions}>
            <TouchableOpacity style={styles.cancelBtn}
              onPress={() => { setShowConfirm(false); setPassword(''); }}>
              <Text style={styles.cancelBtnText}>Batal</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmBtn} onPress={regenerate} disabled={busy}>
              <Text style={styles.confirmBtnText}>{busy ? '...' : 'Buat Kode Baru'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgDark },
  statusCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bgCard,
    borderRadius: 14, padding: 16, borderWidth: 1, borderColor: COLORS.border,
  },
  statusTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  statusSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 3 },
  info: { fontSize: 12, color: COLORS.textMuted, lineHeight: 18, marginTop: 16 },
  codesCard: {
    backgroundColor: COLORS.bgCard, borderRadius: 14, padding: 16, marginTop: 16,
    borderWidth: 1, borderColor: COLORS.warning + '55',
  },
  codesHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  codesWarn: { fontSize: 12, color: COLORS.warning, fontWeight: '600', flex: 1 },
  codesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  codeChip: {
    backgroundColor: COLORS.bgDark, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: COLORS.border, minWidth: '47%', alignItems: 'center',
  },
  codeText: { color: COLORS.accent, fontSize: 15, fontWeight: '700', fontFamily: 'monospace', letterSpacing: 1 },
  regenBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.accent, borderRadius: 10, padding: 14, marginTop: 24,
  },
  regenBtnText: { color: COLORS.bgDark, fontWeight: '700', fontSize: 14 },
  confirmCard: {
    backgroundColor: COLORS.bgCard, borderRadius: 14, padding: 16, marginTop: 20,
  },
  label: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 6 },
  input: {
    backgroundColor: COLORS.bgInput, borderRadius: 8, padding: 12,
    color: COLORS.textPrimary, fontSize: 14, borderWidth: 1, borderColor: COLORS.border,
  },
  confirmActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 10, alignItems: 'center', backgroundColor: COLORS.bgInput },
  cancelBtnText: { color: COLORS.textSecondary, fontWeight: '600' },
  confirmBtn: { flex: 2, padding: 14, borderRadius: 10, alignItems: 'center', backgroundColor: COLORS.accent },
  confirmBtnText: { color: COLORS.bgDark, fontWeight: '700' },
});
