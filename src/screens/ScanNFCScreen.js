import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Platform, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../utils/theme';
import { scanAPI } from '../services/api';

// NFC only works on real devices with dev build, not Expo Go
// For demo, we provide manual NFC UID input
export default function ScanNFCScreen({ navigation }) {
  const [scanning, setScanning] = useState(false);
  const [nfcUid, setNfcUid] = useState('');

  const handleNfcScan = async (uid) => {
    try {
      const result = await scanAPI.nfc(uid);
      if (result.success) {
        navigation.navigate('ScanResult', { anggota: result.data });
      } else {
        Alert.alert('Tidak Ditemukan', result.message);
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Kartu NFC tidak terdaftar');
    }
    setScanning(false);
  };

  const handleManualSubmit = () => {
    if (!nfcUid.trim()) return;
    handleNfcScan(nfcUid.trim().toUpperCase());
  };

  const simulateScan = () => {
    setScanning(true);
    // Simulate NFC scan with demo UID
    setTimeout(() => {
      handleNfcScan('A1B2C3D4'); // Demo NFC UID
    }, 2000);
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* NFC Animation Area */}
        <View style={styles.nfcArea}>
          <View style={[styles.nfcCircle, styles.nfcCircle3]} />
          <View style={[styles.nfcCircle, styles.nfcCircle2]} />
          <View style={[styles.nfcCircle, styles.nfcCircle1]}>
            {scanning ? (
              <ActivityIndicator size="large" color={COLORS.accent} />
            ) : (
              <Ionicons name="wifi" size={48} color={COLORS.accent} />
            )}
          </View>
        </View>

        <Text style={styles.title}>
          {scanning ? 'Mendeteksi Kartu...' : 'TAP KARTU NFC'}
        </Text>
        <Text style={styles.subtitle}>
          Tempelkan Kartu Pintar ke belakang HP untuk scan NFC
        </Text>

        {/* Simulate Button (for Expo Go demo) */}
        <TouchableOpacity style={styles.scanBtn} onPress={simulateScan} disabled={scanning}>
          <Ionicons name="wifi" size={20} color={COLORS.bgDark} />
          <Text style={styles.scanBtnText}>
            {scanning ? 'Scanning...' : 'Simulasi Scan NFC'}
          </Text>
        </TouchableOpacity>

        {/* Manual NFC UID Input */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>ATAU</Text>
          <View style={styles.dividerLine} />
        </View>

        <Text style={styles.manualLabel}>Masukkan NFC UID Manual:</Text>
        <View style={styles.manualRow}>
          <TextInput
            style={styles.manualInput}
            placeholder="Contoh: A1B2C3D4"
            placeholderTextColor={COLORS.textMuted}
            value={nfcUid}
            onChangeText={setNfcUid}
            autoCapitalize="characters"
          />
          <TouchableOpacity style={styles.manualBtn} onPress={handleManualSubmit}>
            <Ionicons name="search" size={20} color={COLORS.bgDark} />
          </TouchableOpacity>
        </View>

        {/* Demo UIDs */}
        <Text style={styles.demoTitle}>Demo NFC UID:</Text>
        <View style={styles.demoRow}>
          {['A1B2C3D4', 'E5F6G7H8', 'I9J0K1L2'].map((uid) => (
            <TouchableOpacity key={uid} style={styles.demoChip} onPress={() => handleNfcScan(uid)}>
              <Text style={styles.demoChipText}>{uid}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgDark },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  nfcArea: { alignItems: 'center', justifyContent: 'center', marginBottom: 24, width: 180, height: 180 },
  nfcCircle: { position: 'absolute', borderRadius: 999, borderWidth: 1 },
  nfcCircle1: {
    width: 100, height: 100, borderColor: COLORS.accent,
    backgroundColor: COLORS.bgCard, alignItems: 'center', justifyContent: 'center',
  },
  nfcCircle2: { width: 140, height: 140, borderColor: COLORS.accent + '44' },
  nfcCircle3: { width: 180, height: 180, borderColor: COLORS.accent + '22' },
  title: { fontSize: SIZES.xxl, fontWeight: '700', color: COLORS.accent, letterSpacing: 2 },
  subtitle: { fontSize: SIZES.md, color: COLORS.textSecondary, textAlign: 'center', marginTop: 8, marginBottom: 24 },
  scanBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.accent, paddingHorizontal: 24, paddingVertical: 14,
    borderRadius: 12,
  },
  scanBtnText: { color: COLORS.bgDark, fontWeight: '700', fontSize: SIZES.lg },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20, width: '100%' },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerText: { color: COLORS.textMuted, marginHorizontal: 12, fontSize: SIZES.xs },
  manualLabel: { color: COLORS.textSecondary, fontSize: SIZES.sm, alignSelf: 'flex-start', marginBottom: 8 },
  manualRow: { flexDirection: 'row', width: '100%', gap: 8 },
  manualInput: {
    flex: 1, backgroundColor: COLORS.bgInput, borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.border, padding: 12,
    color: COLORS.textPrimary, fontSize: SIZES.md,
  },
  manualBtn: {
    backgroundColor: COLORS.accent, borderRadius: 12,
    width: 48, alignItems: 'center', justifyContent: 'center',
  },
  demoTitle: { color: COLORS.textMuted, fontSize: SIZES.xs, marginTop: 16, alignSelf: 'flex-start' },
  demoRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  demoChip: {
    backgroundColor: COLORS.bgCard, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: COLORS.border,
  },
  demoChipText: { color: COLORS.textSecondary, fontSize: SIZES.xs, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
});
