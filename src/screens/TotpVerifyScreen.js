import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../utils/theme';
import { authAPI } from '../services/api';

/**
 * TotpVerifyScreen
 * For returning users (2FA already enabled). Verify the 6-digit code OR a backup code.
 */
export default function TotpVerifyScreen({ route, navigation }) {
  const { pendingToken, username, nama } = route.params || {};
  const [code, setCode] = useState('');
  const [backupCode, setBackupCode] = useState('');
  const [useBackup, setUseBackup] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const handleVerify = async () => {
    const value = useBackup ? backupCode.trim().toUpperCase() : code;
    if (useBackup) {
      if (!value || value.length < 8) {
        Alert.alert('Backup code', 'Masukkan backup code lengkap (format XXXX-XXXX).');
        return;
      }
    } else {
      if (!value || value.length !== 6) {
        Alert.alert('Kode tidak lengkap', 'Masukkan 6 digit kode dari aplikasi authenticator.');
        return;
      }
    }
    setVerifying(true);
    try {
      const res = await authAPI.totpVerify(
        pendingToken,
        useBackup ? null : value,
        useBackup ? { backupCode: value } : undefined
      );
      if (!res.success) {
        Alert.alert('Verifikasi Gagal', res.message || 'Kode tidak valid');
        return;
      }
      if (res.via_backup) {
        Alert.alert(
          'Login dengan Backup Code',
          `Sukses. Sisa backup code: ${res.backup_codes_remaining}.\n\nDisarankan reset 2FA dan generate backup code baru via admin.`,
          [{ text: 'OK', onPress: () => navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] }) }]
        );
      } else {
        navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
      }
    } catch (e) {
      const msg = e.response?.data?.message || 'Verifikasi gagal';
      Alert.alert('Error', msg);
    } finally {
      setVerifying(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Ionicons name="shield-checkmark" size={48} color={COLORS.accent} />
          <Text style={styles.title}>VERIFIKASI 2FA</Text>
          <Text style={styles.subtitle}>Halo, {nama || username}</Text>
        </View>

        <Text style={styles.helper}>
          Buka aplikasi authenticator di HP, lalu masukkan kode 6 digit untuk akun{' '}
          <Text style={{ color: COLORS.accent, fontWeight: '700' }}>{username}</Text>.
        </Text>

        {!useBackup ? (
          <>
            <Text style={styles.label}>Kode 6 digit</Text>
            <TextInput
              style={styles.codeInput}
              value={code}
              onChangeText={(t) => setCode(t.replace(/[^0-9]/g, '').slice(0, 6))}
              placeholder="000000"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
            />
          </>
        ) : (
          <>
            <Text style={styles.label}>Backup code</Text>
            <TextInput
              style={styles.backupInput}
              value={backupCode}
              onChangeText={(t) => setBackupCode(t.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 9))}
              placeholder="XXXX-XXXX"
              placeholderTextColor={COLORS.textMuted}
              autoCapitalize="characters"
              maxLength={9}
              autoFocus
            />
          </>
        )}

        <TouchableOpacity
          style={[styles.primaryBtn, verifying && styles.primaryBtnDisabled]}
          onPress={handleVerify}
          disabled={verifying}
        >
          {verifying ? (
            <ActivityIndicator color={COLORS.bgDark} />
          ) : (
            <>
              <Ionicons name="shield-checkmark" size={20} color={COLORS.bgDark} />
              <Text style={styles.primaryBtnText}>VERIFIKASI & MASUK</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.linksRow}>
          <TouchableOpacity onPress={() => { setUseBackup(!useBackup); setCode(''); setBackupCode(''); }}>
            <Text style={styles.link}>
              {useBackup ? '↺ Kembali ke kode authenticator' : '🔑 Pakai backup code'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.replace('Login')}>
            <Text style={styles.link}>← Login ulang</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgDark },
  content: { padding: 24, paddingTop: 60 },
  header: { alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 22, fontWeight: '800', color: COLORS.accent, letterSpacing: 2, marginTop: 10 },
  subtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },
  helper: { color: COLORS.textPrimary, fontSize: 13, lineHeight: 20, textAlign: 'center', marginBottom: 24 },
  label: { color: COLORS.textSecondary, fontSize: 12, marginBottom: 6, marginLeft: 4 },
  codeInput: {
    height: 64, backgroundColor: COLORS.bgInput, borderRadius: SIZES.radius,
    borderWidth: 1, borderColor: COLORS.border, color: COLORS.textPrimary,
    fontSize: 30, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    textAlign: 'center', letterSpacing: 12, marginBottom: 18,
  },
  backupInput: {
    height: 56, backgroundColor: COLORS.bgInput, borderRadius: SIZES.radius,
    borderWidth: 1, borderColor: COLORS.border, color: COLORS.textPrimary,
    fontSize: 20, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    textAlign: 'center', letterSpacing: 3, marginBottom: 18,
  },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.accent, borderRadius: SIZES.radius, height: 52,
  },
  primaryBtnDisabled: { opacity: 0.7 },
  primaryBtnText: { color: COLORS.bgDark, fontWeight: '700', fontSize: 15, letterSpacing: 1.5 },
  linksRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 18 },
  link: { color: COLORS.textMuted, fontSize: 12 },
});
