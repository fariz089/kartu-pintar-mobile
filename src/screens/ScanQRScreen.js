import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, TextInput } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../utils/theme';
import { scanAPI } from '../services/api';
import { sendScanLocation } from '../utils/location';

export default function ScanQRScreen({ navigation }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [useManual, setUseManual] = useState(false);

  const handleBarCodeScanned = async ({ data }) => {
    if (scanned) return;
    setScanned(true);
    console.log('[QR] Raw scan data:', data);
    await processQR(data);
  };

  const processQR = async (code) => {
    try {
      const result = await scanAPI.qr(code);
      if (result.success) {
        // AUTO GPS: Kirim lokasi HP sebagai lokasi terakhir kartu
        const kartuId = result.data.kartu_id;
        sendScanLocation(kartuId).then((locResult) => {
          if (locResult?.success) {
            console.log(`[GPS] Lokasi kartu ${kartuId} updated via QR scan`);
          }
        });

        navigation.navigate('ScanResult', { anggota: result.data });
      } else {
        Alert.alert('Tidak Ditemukan', result.message, [
          { text: 'Scan Ulang', onPress: () => setScanned(false) },
        ]);
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'QR Code tidak valid', [
        { text: 'Scan Ulang', onPress: () => setScanned(false) },
      ]);
    }
  };

  const handleManualSubmit = () => {
    if (!manualCode.trim()) return;
    processQR(manualCode.trim());
  };

  if (!permission) return <View style={styles.container} />;

  if (!permission.granted) {
    return (
      <View style={[styles.container, styles.center]}>
        <Ionicons name="camera-outline" size={64} color={COLORS.textSecondary} />
        <Text style={styles.permText}>Izin kamera diperlukan untuk scan QR</Text>
        <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnText}>Izinkan Kamera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!useManual ? (
        <>
          <CameraView
            style={styles.camera}
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          >
            <View style={styles.overlay}>
              <View style={styles.scanFrame}>
                <View style={[styles.corner, styles.topLeft]} />
                <View style={[styles.corner, styles.topRight]} />
                <View style={[styles.corner, styles.bottomLeft]} />
                <View style={[styles.corner, styles.bottomRight]} />
              </View>
              <Text style={styles.scanText}>Arahkan kamera ke QR Code MiLi Card</Text>
              <Text style={styles.scanSubtext}>Lokasi GPS otomatis ter-record saat scan</Text>
            </View>
          </CameraView>

          {scanned && (
            <TouchableOpacity style={styles.rescanBtn} onPress={() => setScanned(false)}>
              <Ionicons name="refresh" size={20} color={COLORS.bgDark} />
              <Text style={styles.rescanText}>Scan Ulang</Text>
            </TouchableOpacity>
          )}
        </>
      ) : (
        <View style={styles.manualContainer}>
          <Ionicons name="qr-code-outline" size={64} color={COLORS.accent} />
          <Text style={styles.manualTitle}>Masukkan Kode Manual</Text>
          <TextInput
            style={styles.manualInput}
            placeholder="Contoh: KP-2025-001 atau URL MiLi"
            placeholderTextColor={COLORS.textMuted}
            value={manualCode}
            onChangeText={setManualCode}
            autoCapitalize="none"
          />
          <TouchableOpacity style={styles.manualBtn} onPress={handleManualSubmit}>
            <Text style={styles.manualBtnText}>Cari</Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity style={styles.toggleBtn} onPress={() => { setUseManual(!useManual); setScanned(false); }}>
        <Ionicons name={useManual ? 'camera' : 'keypad'} size={18} color={COLORS.accent} />
        <Text style={styles.toggleText}>{useManual ? 'Scan Kamera' : 'Input Manual'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgDark },
  center: { alignItems: 'center', justifyContent: 'center', padding: 32 },
  camera: { flex: 1 },
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.4)' },
  scanFrame: { width: 250, height: 250, position: 'relative' },
  corner: { position: 'absolute', width: 30, height: 30, borderColor: COLORS.accent },
  topLeft: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3 },
  topRight: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3 },
  bottomLeft: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3 },
  bottomRight: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3 },
  scanText: { color: COLORS.textPrimary, fontSize: SIZES.md, marginTop: 24, textAlign: 'center' },
  scanSubtext: { color: COLORS.accent, fontSize: SIZES.xs, marginTop: 6, textAlign: 'center', fontStyle: 'italic' },
  rescanBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.accent, margin: 16, padding: 14, borderRadius: 12, gap: 8,
  },
  rescanText: { color: COLORS.bgDark, fontWeight: '700', fontSize: SIZES.lg },
  toggleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    padding: 14, gap: 8, borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  toggleText: { color: COLORS.accent, fontWeight: '600' },
  permText: { color: COLORS.textSecondary, fontSize: SIZES.lg, marginTop: 16, textAlign: 'center' },
  permBtn: { backgroundColor: COLORS.accent, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 16 },
  permBtnText: { color: COLORS.bgDark, fontWeight: '700' },
  manualContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  manualTitle: { color: COLORS.textPrimary, fontSize: SIZES.xl, fontWeight: '600', marginTop: 16, marginBottom: 20 },
  manualInput: {
    width: '100%', backgroundColor: COLORS.bgInput, borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.border, padding: 14,
    color: COLORS.textPrimary, fontSize: SIZES.lg, textAlign: 'center',
  },
  manualBtn: {
    width: '100%', backgroundColor: COLORS.accent, borderRadius: 12,
    padding: 14, alignItems: 'center', marginTop: 12,
  },
  manualBtnText: { color: COLORS.bgDark, fontWeight: '700', fontSize: SIZES.lg },
});
