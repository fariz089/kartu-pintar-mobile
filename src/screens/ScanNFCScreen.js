import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  ActivityIndicator, Platform, TextInput, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../utils/theme';
import { scanAPI } from '../services/api';
import { sendScanLocation } from '../utils/location';

let NfcManager = null;
let NfcTech = null;
let Ndef = null;

try {
  const nfc = require('react-native-nfc-manager');
  NfcManager = nfc.default;
  NfcTech = nfc.NfcTech;
  Ndef = nfc.Ndef;
} catch (e) {}

export default function ScanNFCScreen({ navigation }) {
  const [scanning, setScanning] = useState(false);
  const [nfcUid, setNfcUid] = useState('');
  const [nfcSupported, setNfcSupported] = useState(false);
  const [nfcEnabled, setNfcEnabled] = useState(false);
  const [pulseAnim] = useState(new Animated.Value(1));
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => { checkNfcStatus(); }, []);

  useEffect(() => {
    if (scanning) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.15, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [scanning]);

  const checkNfcStatus = async () => {
    if (!NfcManager) {
      setNfcSupported(false);
      setStatusMessage('NFC tidak tersedia di Expo Go. Gunakan input manual.');
      return;
    }
    try {
      const supported = await NfcManager.isSupported();
      setNfcSupported(supported);
      if (supported) {
        await NfcManager.start();
        const enabled = await NfcManager.isEnabled();
        setNfcEnabled(enabled);
        setStatusMessage(enabled ? 'NFC siap. Tempelkan MiLi Card.' : 'NFC nonaktif. Aktifkan di Settings.');
      } else {
        setStatusMessage('Perangkat tidak mendukung NFC.');
      }
    } catch (e) {
      setNfcSupported(false);
      setStatusMessage('Error NFC: ' + e.message);
    }
  };

  const startNfcScan = async () => {
    if (!NfcManager || !nfcSupported || !nfcEnabled) {
      Alert.alert('NFC Tidak Tersedia', 'Gunakan input manual di bawah.');
      return;
    }

    setScanning(true);
    setStatusMessage('Tempelkan MiLi Card ke belakang HP...');

    try {
      await NfcManager.requestTechnology([NfcTech.Ndef, NfcTech.NfcA]);
      const tag = await NfcManager.getTag();

      if (!tag) {
        setStatusMessage('Tidak bisa membaca kartu.');
        setScanning(false);
        return;
      }

      let scanData = null;

      // Try NDEF first (MiLi Card URL)
      if (tag.ndefMessage && tag.ndefMessage.length > 0) {
        for (const record of tag.ndefMessage) {
          if (Ndef && record.payload) {
            try {
              const text = Ndef.text.decodePayload(record.payload);
              if (text) { scanData = text; break; }
            } catch (e) {}
            try {
              const uri = Ndef.uri.decodePayload(record.payload);
              if (uri) { scanData = uri; break; }
            } catch (e) {}
          }
        }
      }

      // Fallback to NFC UID
      if (!scanData && tag.id) {
        scanData = tag.id.toUpperCase();
      }

      if (scanData) {
        console.log('[NFC] MiLi Card data:', scanData);
        setStatusMessage(`Terdeteksi: ${scanData.substring(0, 40)}...`);
        await processNfcScan(scanData);
      } else {
        setStatusMessage('Kartu terdeteksi tapi data tidak terbaca.');
        Alert.alert('Error', 'Tidak bisa membaca data kartu.');
      }
    } catch (e) {
      if (e.message !== 'cancelled') {
        console.error('[NFC] Error:', e);
        setStatusMessage('Gagal membaca. Coba lagi.');
      }
    } finally {
      try { await NfcManager.cancelTechnologyRequest(); } catch (e) {}
      setScanning(false);
    }
  };

  const cancelNfcScan = async () => {
    try { if (NfcManager) await NfcManager.cancelTechnologyRequest(); } catch (e) {}
    setScanning(false);
    setStatusMessage('Scan dibatalkan.');
  };

  const processNfcScan = async (data) => {
    try {
      const result = await scanAPI.nfc(data);
      if (result.success) {
        // AUTO GPS: Kirim lokasi HP sebagai lokasi terakhir kartu
        const kartuId = result.data.kartu_id;
        sendScanLocation(kartuId).then((locResult) => {
          if (locResult?.success) {
            console.log(`[GPS] Lokasi kartu ${kartuId} updated via NFC scan`);
          }
        });

        navigation.navigate('ScanResult', { anggota: result.data });
      } else {
        Alert.alert(
          'Tidak Ditemukan',
          'MiLi Card ini belum terdaftar di sistem.\nHubungi admin untuk mendaftarkan.',
          [
            { text: 'OK' },
            { text: 'Input Manual', onPress: () => setNfcUid(data) },
          ]
        );
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Kartu tidak terdaftar');
    }
  };

  const handleManualSubmit = () => {
    if (!nfcUid.trim()) return;
    processNfcScan(nfcUid.trim());
  };

  const simulateScan = () => {
    setScanning(true);
    setStatusMessage('Simulasi: membaca MiLi Card...');
    setTimeout(() => {
      setScanning(false);
      processNfcScan('https://micard.mymili.com/info/FZDc3ImYoVWNm5kNwUTT5IjM');
    }, 1500);
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.statusBar}>
          <View style={[styles.statusDot, {
            backgroundColor: nfcEnabled ? COLORS.success : nfcSupported ? COLORS.warning : COLORS.danger
          }]} />
          <Text style={styles.statusBarText}>
            {nfcEnabled ? 'NFC Aktif' : nfcSupported ? 'NFC Nonaktif' : 'NFC Tidak Tersedia'}
          </Text>
          <View style={styles.miliBadge}>
            <Text style={styles.miliBadgeText}>MiLi Card</Text>
          </View>
        </View>

        <Animated.View style={[styles.nfcArea, { transform: [{ scale: pulseAnim }] }]}>
          <View style={[styles.nfcCircle, styles.nfcCircle3]} />
          <View style={[styles.nfcCircle, styles.nfcCircle2]} />
          <View style={[styles.nfcCircle, styles.nfcCircle1]}>
            {scanning ? (
              <ActivityIndicator size="large" color={COLORS.accent} />
            ) : (
              <Ionicons name="wifi" size={48} color={COLORS.accent} />
            )}
          </View>
        </Animated.View>

        <Text style={styles.title}>
          {scanning ? 'Mendeteksi MiLi Card...' : 'TAP MILI CARD'}
        </Text>
        <Text style={styles.subtitle}>
          Tempelkan MiLi Card ke belakang HP untuk identifikasi
        </Text>

        {statusMessage ? <Text style={styles.statusMsg}>{statusMessage}</Text> : null}

        {scanning ? (
          <TouchableOpacity style={styles.cancelBtn} onPress={cancelNfcScan}>
            <Ionicons name="close-circle" size={20} color={COLORS.danger} />
            <Text style={[styles.btnText, { color: COLORS.danger }]}>Batalkan</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.scanBtn} onPress={nfcEnabled ? startNfcScan : simulateScan}>
            <Ionicons name="wifi" size={20} color={COLORS.bgDark} />
            <Text style={styles.btnText}>{nfcEnabled ? 'Scan MiLi Card' : 'Simulasi Scan'}</Text>
          </TouchableOpacity>
        )}

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>ATAU</Text>
          <View style={styles.dividerLine} />
        </View>

        <Text style={styles.manualLabel}>Masukkan NFC UID atau URL MiLi Card:</Text>
        <View style={styles.manualRow}>
          <TextInput style={styles.manualInput} placeholder="UID atau micard.mymili.com/info/..."
            placeholderTextColor={COLORS.textMuted} value={nfcUid} onChangeText={setNfcUid} autoCapitalize="none" />
          <TouchableOpacity style={styles.manualBtn} onPress={handleManualSubmit}>
            <Ionicons name="search" size={20} color={COLORS.bgDark} />
          </TouchableOpacity>
        </View>

        <Text style={styles.demoTitle}>Demo / Quick Access:</Text>
        <View style={styles.demoRow}>
          {[
            { label: 'MiLi Card', value: 'https://micard.mymili.com/info/FZDc3ImYoVWNm5kNwUTT5IjM' },
            { label: 'A1B2C3D4', value: 'A1B2C3D4' },
            { label: 'KP-2025-001', value: 'KP-2025-001' },
          ].map((item) => (
            <TouchableOpacity key={item.label} style={styles.demoChip} onPress={() => processNfcScan(item.value)}>
              <Text style={styles.demoChipText}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={14} color={COLORS.info} />
          <Text style={styles.infoText}>
            Scan MiLi Card langsung menampilkan identitas anggota di app ini.{'\n'}
            Lokasi GPS HP otomatis ter-record sebagai lokasi kartu.
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgDark },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  statusBar: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.bgCard, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, position: 'absolute', top: 16 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusBarText: { fontSize: SIZES.xs, color: COLORS.textSecondary },
  miliBadge: { backgroundColor: '#4285F415', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  miliBadgeText: { fontSize: SIZES.xs, fontWeight: '700', color: '#4285F4' },
  nfcArea: { alignItems: 'center', justifyContent: 'center', marginBottom: 20, width: 170, height: 170 },
  nfcCircle: { position: 'absolute', borderRadius: 999, borderWidth: 1 },
  nfcCircle1: { width: 96, height: 96, borderColor: COLORS.accent, backgroundColor: COLORS.bgCard, alignItems: 'center', justifyContent: 'center' },
  nfcCircle2: { width: 134, height: 134, borderColor: COLORS.accent + '44' },
  nfcCircle3: { width: 170, height: 170, borderColor: COLORS.accent + '22' },
  title: { fontSize: SIZES.xxl, fontWeight: '700', color: COLORS.accent, letterSpacing: 2 },
  subtitle: { fontSize: SIZES.md, color: COLORS.textSecondary, textAlign: 'center', marginTop: 6, marginBottom: 6 },
  statusMsg: { fontSize: SIZES.sm, color: COLORS.info, textAlign: 'center', marginBottom: 12, fontStyle: 'italic' },
  scanBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.accent, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12 },
  cancelBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.bgCard, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: COLORS.danger + '44' },
  btnText: { color: COLORS.bgDark, fontWeight: '700', fontSize: SIZES.lg },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 16, width: '100%' },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerText: { color: COLORS.textMuted, marginHorizontal: 12, fontSize: SIZES.xs },
  manualLabel: { color: COLORS.textSecondary, fontSize: SIZES.sm, alignSelf: 'flex-start', marginBottom: 8 },
  manualRow: { flexDirection: 'row', width: '100%', gap: 8 },
  manualInput: { flex: 1, backgroundColor: COLORS.bgInput, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, padding: 12, color: COLORS.textPrimary, fontSize: SIZES.md },
  manualBtn: { backgroundColor: COLORS.accent, borderRadius: 12, width: 48, alignItems: 'center', justifyContent: 'center' },
  demoTitle: { color: COLORS.textMuted, fontSize: SIZES.xs, marginTop: 12, alignSelf: 'flex-start' },
  demoRow: { flexDirection: 'row', gap: 8, marginTop: 6, flexWrap: 'wrap' },
  demoChip: { backgroundColor: COLORS.bgCard, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: COLORS.border },
  demoChipText: { color: COLORS.textSecondary, fontSize: SIZES.xs, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  infoBox: { flexDirection: 'row', gap: 8, marginTop: 14, width: '100%', backgroundColor: COLORS.bgCard, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: COLORS.info + '22' },
  infoText: { flex: 1, fontSize: 10, color: COLORS.textMuted, lineHeight: 14 },
});
