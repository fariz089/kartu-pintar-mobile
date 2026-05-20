import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform, Image, ScrollView, Linking, Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../utils/theme';
import { authAPI } from '../services/api';

/**
 * TotpSetupScreen
 * Triggered first time a user logs in (password OK but TOTP not yet activated).
 * Flow:
 *   1. GET /api/auth/totp/setup using pending_token  -> { setup_token, secret, otpauth_uri, qr_png }
 *   2. User scans QR with Google/Microsoft/Authy authenticator
 *   3. User types the 6-digit code -> POST /api/auth/totp/verify with setup_token
 *   4. Server returns full JWT + backup_codes (shown once)
 */
export default function TotpSetupScreen({ route, navigation }) {
  const { pendingToken, username, nama } = route.params || {};
  const [loadingSetup, setLoadingSetup] = useState(true);
  const [setupData, setSetupData] = useState(null); // { setup_token, secret, qr_png, otpauth_uri }
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [backupCodes, setBackupCodes] = useState(null); // shown after success
  const [ack, setAck] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await authAPI.totpSetup(pendingToken);
        if (!res.success) {
          Alert.alert('Error', res.message || 'Gagal memulai setup 2FA');
          navigation.replace('Login');
          return;
        }
        setSetupData(res);
      } catch (e) {
        const msg = e.response?.data?.message || 'Tidak dapat terhubung ke server';
        Alert.alert('Error', msg);
        navigation.replace('Login');
      } finally {
        setLoadingSetup(false);
      }
    })();
  }, []);

  const handleVerify = async () => {
    if (!code || code.length !== 6) {
      Alert.alert('Kode tidak lengkap', 'Masukkan 6 digit kode dari aplikasi authenticator.');
      return;
    }
    setVerifying(true);
    try {
      const res = await authAPI.totpVerify(setupData.setup_token, code);
      if (!res.success) {
        Alert.alert('Verifikasi Gagal', res.message || 'Kode salah. Pastikan jam HP sinkron.');
        return;
      }
      // Server already persisted token+user (via authAPI.totpVerify).
      // Show backup codes — only once.
      setBackupCodes(res.backup_codes || []);
    } catch (e) {
      const msg = e.response?.data?.message || 'Verifikasi gagal';
      Alert.alert('Error', msg);
    } finally {
      setVerifying(false);
    }
  };

  const openInAuthenticator = async () => {
    const uri = setupData?.otpauth_uri;
    if (!uri) return;
    try {
      const can = await Linking.canOpenURL(uri);
      if (can) await Linking.openURL(uri);
      else Alert.alert('Authenticator tidak ditemukan', 'Install Google Authenticator / Microsoft Authenticator / Authy, lalu coba lagi.');
    } catch {
      Alert.alert('Tidak bisa membuka', 'Buka aplikasi authenticator secara manual lalu scan QR.');
    }
  };

  const shareSecret = async () => {
    if (!setupData?.secret) return;
    try {
      await Share.share({
        message: `Smart Card 2FA secret untuk ${username}:\n${setupData.secret}\n\nKetik manual di aplikasi authenticator bila tidak bisa scan QR.`,
      });
    } catch {}
  };

  const shareBackupCodes = async () => {
    if (!backupCodes || !backupCodes.length) return;
    try {
      await Share.share({
        message: `Smart Card — Backup Codes (${username})\n\n${backupCodes.join('\n')}\n\nSimpan di tempat aman. Setiap kode hanya bisa dipakai satu kali.`,
      });
    } catch {}
  };

  const finishToDashboard = () => {
    if (!ack) {
      Alert.alert('Konfirmasi', 'Centang dulu bahwa Anda sudah menyimpan kode cadangan.');
      return;
    }
    navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
  };

  // ---------- Render ----------
  if (loadingSetup) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={COLORS.accent} size="large" />
        <Text style={{ color: COLORS.textSecondary, marginTop: 12 }}>Menyiapkan 2FA...</Text>
      </View>
    );
  }

  // After success: show backup codes
  if (backupCodes) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Ionicons name="shield-checkmark" size={40} color={COLORS.accent} />
          <Text style={styles.title}>SIMPAN BACKUP CODES</Text>
          <Text style={styles.subtitle}>Untuk login bila HP hilang</Text>
        </View>

        <View style={styles.warningBox}>
          <Text style={styles.warningText}>
            ⚠️ Kode ini hanya ditampilkan SEKARANG.{'\n'}
            Setiap kode hanya dapat dipakai satu kali.{'\n'}
            Simpan di tempat aman (password manager, catatan offline, dll).
          </Text>
        </View>

        <View style={styles.codesGrid}>
          {backupCodes.map((c, i) => (
            <View key={i} style={styles.codeCell}>
              <Text style={styles.codeText}>{c}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.secondaryBtn} onPress={shareBackupCodes}>
          <Ionicons name="share-outline" size={18} color={COLORS.accent} />
          <Text style={styles.secondaryBtnText}>Salin / Bagikan</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.ackRow} onPress={() => setAck(!ack)} activeOpacity={0.7}>
          <View style={[styles.checkbox, ack && styles.checkboxOn]}>
            {ack && <Ionicons name="checkmark" size={16} color={COLORS.bgDark} />}
          </View>
          <Text style={styles.ackText}>Saya sudah menyimpan kode cadangan dengan aman.</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.primaryBtn, !ack && styles.primaryBtnDisabled]}
          onPress={finishToDashboard}
          disabled={!ack}
        >
          <Ionicons name="checkmark-circle" size={20} color={COLORS.bgDark} />
          <Text style={styles.primaryBtnText}>LANJUT KE DASHBOARD</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // Default: setup screen
  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Ionicons name="shield-lock" size={40} color={COLORS.accent} />
          <Text style={styles.title}>AKTIFKAN 2FA</Text>
          <Text style={styles.subtitle}>Halo, {nama || username}</Text>
        </View>

        <View style={styles.warningBox}>
          <Text style={styles.warningText}>
            Untuk keamanan, akun Anda <Text style={{ fontWeight: '700', color: COLORS.accent }}>wajib pakai 2FA</Text>.
            Install <Text style={{ fontWeight: '700' }}>Google Authenticator</Text>, Microsoft Authenticator, atau Authy.
          </Text>
        </View>

        {/* QR Code */}
        <View style={styles.qrWrap}>
          {setupData?.qr_png ? (
            <Image source={{ uri: setupData.qr_png }} style={styles.qrImage} resizeMode="contain" />
          ) : (
            <ActivityIndicator color={COLORS.bgDark} />
          )}
        </View>

        <Text style={styles.secretLabel}>Atau ketik manual:</Text>
        <TouchableOpacity onLongPress={shareSecret}>
          <Text style={styles.secretText} selectable>{setupData?.secret}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryBtn} onPress={openInAuthenticator}>
          <Ionicons name="open-outline" size={18} color={COLORS.accent} />
          <Text style={styles.secondaryBtnText}>Buka di Aplikasi Authenticator</Text>
        </TouchableOpacity>

        {/* Steps */}
        <View style={styles.stepsBox}>
          <Text style={styles.stepsTitle}>Cara aktifkan:</Text>
          <Text style={styles.stepLine}>1. Scan QR di atas dengan aplikasi authenticator.</Text>
          <Text style={styles.stepLine}>2. Atau ketik kode manual ke aplikasi.</Text>
          <Text style={styles.stepLine}>3. Masukkan 6 digit yang muncul di aplikasi.</Text>
        </View>

        {/* Code input */}
        <Text style={styles.label}>Kode 6 digit dari aplikasi</Text>
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

        <TouchableOpacity
          style={[styles.primaryBtn, (verifying || !code) && styles.primaryBtnDisabled]}
          onPress={handleVerify}
          disabled={verifying || !code}
        >
          {verifying ? (
            <ActivityIndicator color={COLORS.bgDark} />
          ) : (
            <>
              <Ionicons name="shield-checkmark" size={20} color={COLORS.bgDark} />
              <Text style={styles.primaryBtnText}>AKTIFKAN & LANJUTKAN</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.replace('Login')}>
          <Text style={styles.cancelLink}>← Batalkan & login ulang</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgDark },
  content: { padding: 24, paddingTop: 40 },
  header: { alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 22, fontWeight: '800', color: COLORS.accent, letterSpacing: 2, marginTop: 8 },
  subtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },
  warningBox: {
    backgroundColor: 'rgba(197,164,78,0.08)', borderColor: 'rgba(197,164,78,0.3)',
    borderWidth: 1, borderRadius: 10, padding: 14, marginBottom: 18,
  },
  warningText: { color: COLORS.textPrimary, fontSize: 13, lineHeight: 19 },
  qrWrap: {
    backgroundColor: '#ffffff', borderRadius: 12, padding: 14, alignItems: 'center',
    alignSelf: 'center', marginBottom: 14,
  },
  qrImage: { width: 220, height: 220 },
  secretLabel: { color: COLORS.textSecondary, fontSize: 12, textAlign: 'center', marginTop: 4 },
  secretText: {
    color: COLORS.accent, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 14, textAlign: 'center', marginTop: 6, marginBottom: 14, letterSpacing: 1.5,
  },
  secondaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1, borderColor: COLORS.accent, borderRadius: SIZES.radius,
    paddingVertical: 12, marginBottom: 16,
  },
  secondaryBtnText: { color: COLORS.accent, fontWeight: '600', fontSize: 13 },
  stepsBox: {
    backgroundColor: COLORS.bgCard, borderRadius: 10, padding: 14, marginBottom: 18,
    borderWidth: 1, borderColor: COLORS.border,
  },
  stepsTitle: { color: COLORS.accent, fontSize: 12, fontWeight: '700', marginBottom: 6, letterSpacing: 1 },
  stepLine: { color: COLORS.textPrimary, fontSize: 13, lineHeight: 20 },
  label: { color: COLORS.textSecondary, fontSize: 12, marginBottom: 6, marginLeft: 4 },
  codeInput: {
    height: 60, backgroundColor: COLORS.bgInput, borderRadius: SIZES.radius,
    borderWidth: 1, borderColor: COLORS.border, color: COLORS.textPrimary,
    fontSize: 28, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    textAlign: 'center', letterSpacing: 10, marginBottom: 16,
  },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.accent, borderRadius: SIZES.radius, height: 52, marginBottom: 12,
  },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText: { color: COLORS.bgDark, fontWeight: '700', fontSize: 15, letterSpacing: 1.5 },
  cancelLink: { color: COLORS.textMuted, textAlign: 'center', fontSize: 13, marginTop: 6 },
  // Backup codes screen
  codesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 16 },
  codeCell: {
    width: '48%', backgroundColor: COLORS.bgCard, borderColor: COLORS.border, borderWidth: 1,
    borderRadius: 8, paddingVertical: 12, alignItems: 'center',
  },
  codeText: {
    color: COLORS.accent, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 15, letterSpacing: 1.5,
  },
  ackRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, marginTop: 6 },
  checkbox: {
    width: 22, height: 22, borderRadius: 4, borderWidth: 2, borderColor: COLORS.accent,
    marginRight: 10, alignItems: 'center', justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: COLORS.accent },
  ackText: { color: COLORS.textPrimary, flex: 1, fontSize: 13 },
});
