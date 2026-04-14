import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, Alert, TextInput, 
  ScrollView, Modal, ActivityIndicator, Animated, Platform
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, formatRupiah } from '../utils/theme';
import { anggotaAPI, keuanganAPI } from '../services/api';

// Try to import NFC
let NfcManager = null;
let NfcTech = null;
let Ndef = null;
let nfcAvailable = false;

try {
  const nfc = require('react-native-nfc-manager');
  NfcManager = nfc.default;
  NfcTech = nfc.NfcTech;
  Ndef = nfc.Ndef;
  nfcAvailable = true;
} catch (e) {
  console.log('NFC not available');
}

export default function TopUpScreen({ navigation }) {
  const [anggotaList, setAnggotaList] = useState([]);
  const [selected, setSelected] = useState(null);
  const [nominal, setNominal] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [loading, setLoading] = useState(false);

  // TAP Modal states
  const [showTapModal, setShowTapModal] = useState(false);
  const [tapInput, setTapInput] = useState('');
  const [tapAnggota, setTapAnggota] = useState(null);
  const [tapNominal, setTapNominal] = useState('');
  const [tapStep, setTapStep] = useState(1); // 1: scan, 2: enter nominal, 3: success
  const [tapLoading, setTapLoading] = useState(false);
  const [tapResult, setTapResult] = useState(null);
  
  // NFC states
  const [nfcSupported, setNfcSupported] = useState(false);
  const [nfcScanning, setNfcScanning] = useState(false);
  
  // QR states
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [qrScanned, setQrScanned] = useState(false);
  
  // Pulse animation
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => { 
    loadAnggota(); 
    checkNfcSupport();
    return () => {
      if (NfcManager) {
        NfcManager.cancelTechnologyRequest().catch(() => {});
      }
    };
  }, []);

  const checkNfcSupport = async () => {
    if (!NfcManager) {
      setNfcSupported(false);
      return;
    }
    try {
      const supported = await NfcManager.isSupported();
      setNfcSupported(supported);
      if (supported) {
        await NfcManager.start();
        const enabled = await NfcManager.isEnabled();
        setNfcSupported(enabled);
      }
    } catch (e) {
      console.log('NFC check error:', e);
      setNfcSupported(false);
    }
  };

  const loadAnggota = async () => {
    try {
      const res = await anggotaAPI.list();
      if (res.success) setAnggotaList(res.data);
    } catch (e) { console.log(e); }
  };

  const handleTopUp = async () => {
    if (!selected) { Alert.alert('Error', 'Pilih anggota'); return; }
    const amount = parseInt(nominal);
    if (!amount || amount <= 0) { Alert.alert('Error', 'Nominal harus > 0'); return; }
    if (amount > 5000000) { Alert.alert('Error', 'Maksimal Rp 5.000.000'); return; }

    Alert.alert('Konfirmasi', `Top up ${formatRupiah(amount)} untuk ${selected.nama}?`, [
      { text: 'Batal', style: 'cancel' },
      { text: 'Proses', onPress: async () => {
        setLoading(true);
        try {
          const res = await keuanganAPI.topup(selected.kartu_id, amount);
          if (res.success) {
            Alert.alert('Berhasil', `Top up ${formatRupiah(amount)}\nSaldo baru: ${formatRupiah(res.data.saldo_sesudah)}`);
            setNominal('');
            setSelected(null);
            loadAnggota();
          } else {
            Alert.alert('Gagal', res.message);
          }
        } catch (e) {
          Alert.alert('Error', e.response?.data?.message || 'Gagal');
        }
        setLoading(false);
      }},
    ]);
  };

  // Pulse animation
  const startPulse = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.2, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  };

  const stopPulse = () => {
    pulseAnim.stopAnimation();
    pulseAnim.setValue(1);
  };

  // TAP Modal functions
  const openTapModal = () => {
    setShowTapModal(true);
    setTapStep(1);
    setTapInput('');
    setTapAnggota(null);
    setTapNominal('');
    setTapResult(null);
    setShowQRScanner(false);
    setQrScanned(false);
  };

  const closeTapModal = () => {
    setShowTapModal(false);
    setShowQRScanner(false);
    stopNfcScan();
    if (tapStep === 3) {
      loadAnggota();
    }
  };

  // NFC Scan
  const startNfcScan = async () => {
    if (!NfcManager || !nfcSupported) {
      Alert.alert('NFC Tidak Tersedia', 'Perangkat tidak mendukung NFC atau NFC tidak aktif');
      return;
    }

    setNfcScanning(true);
    startPulse();

    try {
      await NfcManager.requestTechnology(NfcTech.Ndef);
      const tag = await NfcManager.getTag();
      
      if (tag) {
        let cardId = null;
        
        // Try to read NDEF message
        if (tag.ndefMessage && tag.ndefMessage.length > 0) {
          const ndefRecord = tag.ndefMessage[0];
          if (ndefRecord.payload) {
            const text = Ndef.text.decodePayload(new Uint8Array(ndefRecord.payload));
            if (text.includes('KP-') || text.includes('SC-')) {
              cardId = text;
            } else if (text.includes('mfrscode.com')) {
              const match = text.match(/[KS][PC]-\d{4}-\d{3}/);
              if (match) cardId = match[0];
            }
          }
        }
        
        // Fallback to tag ID
        if (!cardId && tag.id) {
          cardId = tag.id;
        }

        if (cardId) {
          setTapInput(cardId);
          await processCardId(cardId);
        }
      }
    } catch (e) {
      if (e.message !== 'cancelled') {
        console.log('NFC error:', e);
      }
    } finally {
      NfcManager.cancelTechnologyRequest().catch(() => {});
      setNfcScanning(false);
      stopPulse();
    }
  };

  const stopNfcScan = async () => {
    if (NfcManager) {
      try {
        await NfcManager.cancelTechnologyRequest();
      } catch (e) {}
    }
    setNfcScanning(false);
    stopPulse();
  };

  // QR Scan
  const handleQRScanned = async ({ data }) => {
    if (qrScanned) return;
    setQrScanned(true);
    
    let cardId = data;
    // Extract card ID from URL if needed
    if (data.includes('mfrscode.com') || data.includes('mfrcode.com')) {
      const match = data.match(/[KS][PC]-\d{4}-\d{3}/);
      if (match) cardId = match[0];
    }
    
    setTapInput(cardId);
    setShowQRScanner(false);
    await processCardId(cardId);
  };

  // Process card ID (common for NFC and QR)
  const processCardId = async (cardId) => {
    setTapLoading(true);
    try {
      const res = await keuanganAPI.topupTap(cardId, 0, 'TAP');
      if (res.success && res.data.ready_to_topup) {
        setTapAnggota(res.data.anggota);
        setTapStep(2);
      } else {
        Alert.alert('Tidak Ditemukan', res.message || 'Kartu tidak terdaftar');
      }
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Kartu tidak ditemukan');
    }
    setTapLoading(false);
  };

  const handleTapSearch = async () => {
    if (!tapInput.trim()) return;
    await processCardId(tapInput.trim());
  };

  const handleTapConfirm = async () => {
    const amount = parseInt(tapNominal);
    if (!amount || amount < 10000) {
      Alert.alert('Error', 'Minimal top up Rp 10.000');
      return;
    }
    if (amount > 5000000) {
      Alert.alert('Error', 'Maksimal Rp 5.000.000');
      return;
    }

    setTapLoading(true);
    try {
      const res = await keuanganAPI.topupTap(tapInput, amount, 'TAP');
      if (res.success) {
        setTapResult(res.data);
        setTapStep(3);
      } else {
        Alert.alert('Gagal', res.message);
      }
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Gagal memproses');
    }
    setTapLoading(false);
  };

  const setQuickTapAmount = (amt) => setTapNominal(String(amt));

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: SIZES.padding }}>
      <Text style={styles.title}>Top Up Saldo</Text>
      <Text style={styles.subtitle}>Isi ulang saldo Smart Card anggota</Text>

      {/* TAP Button */}
      <TouchableOpacity style={styles.tapCard} onPress={openTapModal}>
        <View style={styles.tapIconWrap}>
          <Ionicons name="card" size={28} color={COLORS.bgDark} />
        </View>
        <View style={styles.tapInfo}>
          <Text style={styles.tapTitle}>TAP UNTUK TOP UP</Text>
          <Text style={styles.tapSubtitle}>NFC atau Scan QR Code</Text>
        </View>
        <Ionicons name="chevron-forward" size={24} color={COLORS.accent} />
      </TouchableOpacity>

      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>ATAU MANUAL</Text>
        <View style={styles.dividerLine} />
      </View>

      {/* Select Anggota */}
      <TouchableOpacity style={styles.pickerBtn} onPress={() => setShowPicker(!showPicker)}>
        {selected ? (
          <View>
            <Text style={styles.selectedName}>{selected.nama}</Text>
            <Text style={styles.selectedSaldo}>{selected.pangkat} — Saldo: {formatRupiah(selected.saldo)}</Text>
          </View>
        ) : (
          <Text style={styles.pickerPlaceholder}>Pilih Anggota</Text>
        )}
        <Ionicons name="chevron-down" size={20} color={COLORS.textSecondary} />
      </TouchableOpacity>

      {showPicker && (
        <View style={styles.pickerList}>
          <ScrollView style={{ maxHeight: 250 }}>
            {anggotaList.map((a) => (
              <TouchableOpacity key={a.kartu_id} style={styles.pickerItem}
                onPress={() => { setSelected(a); setShowPicker(false); }}>
                <View>
                  <Text style={styles.pickerItemName}>{a.nama}</Text>
                  <Text style={styles.pickerItemSub}>{a.pangkat} — {a.kartu_id}</Text>
                </View>
                <Text style={styles.pickerItemSaldo}>{formatRupiah(a.saldo)}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Nominal Input */}
      <Text style={styles.label}>Nominal Top Up</Text>
      <View style={styles.inputRow}>
        <Text style={styles.inputPrefix}>Rp</Text>
        <TextInput style={styles.input} placeholder="0" placeholderTextColor={COLORS.textMuted}
          value={nominal} onChangeText={setNominal} keyboardType="numeric" />
      </View>

      {/* Quick Amounts */}
      <View style={styles.quickRow}>
        {[50000, 100000, 200000, 500000, 1000000].map((amt) => (
          <TouchableOpacity key={amt} style={styles.quickChip} onPress={() => setNominal(String(amt))}>
            <Text style={styles.quickText}>{formatRupiah(amt)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Process */}
      <TouchableOpacity style={[styles.processBtn, loading && { opacity: 0.6 }]}
        onPress={handleTopUp} disabled={loading}>
        <Ionicons name="add-circle" size={22} color={COLORS.bgDark} />
        <Text style={styles.processBtnText}>{loading ? 'Memproses...' : 'Proses Top Up'}</Text>
      </TouchableOpacity>

      {/* Saldo List */}
      <Text style={[styles.label, { marginTop: 24 }]}>SALDO ANGGOTA</Text>
      {anggotaList.map((a) => (
        <View key={a.kartu_id} style={styles.saldoCard}>
          <View style={styles.saldoInfo}>
            <Text style={styles.saldoName}>{a.nama}</Text>
            <Text style={styles.saldoSub}>{a.pangkat}</Text>
          </View>
          <Text style={[styles.saldoAmount, a.saldo < 200000 && { color: COLORS.danger }]}>
            {formatRupiah(a.saldo)}
          </Text>
        </View>
      ))}

      <View style={{ height: 40 }} />

      {/* TAP Modal */}
      <Modal visible={showTapModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.tapModalContent}>
            
            {tapStep === 1 && !showQRScanner && (
              <>
                <View style={styles.tapModalIconWrap}>
                  <Ionicons name="card" size={48} color={COLORS.bgDark} />
                </View>
                <Text style={styles.tapModalTitle}>Tempelkan Kartu</Text>
                <Text style={styles.tapModalSubtitle}>
                  Scan NFC atau QR Code Smart Card
                </Text>
                
                {/* NFC Scan Button */}
                {nfcSupported && (
                  <TouchableOpacity 
                    style={[styles.nfcScanBtn, nfcScanning && styles.nfcScanBtnActive]}
                    onPress={nfcScanning ? stopNfcScan : startNfcScan}
                  >
                    <Animated.View style={{ transform: [{ scale: nfcScanning ? pulseAnim : 1 }] }}>
                      <Ionicons 
                        name={nfcScanning ? "radio" : "wifi"} 
                        size={24} 
                        color={nfcScanning ? COLORS.danger : COLORS.accent} 
                      />
                    </Animated.View>
                    <Text style={[styles.nfcScanText, nfcScanning && styles.nfcScanTextActive]}>
                      {nfcScanning ? 'Menunggu Kartu...' : 'Scan NFC'}
                    </Text>
                  </TouchableOpacity>
                )}

                {/* QR Scan Button */}
                <TouchableOpacity 
                  style={styles.qrScanBtn}
                  onPress={() => {
                    stopNfcScan();
                    setShowQRScanner(true);
                    setQrScanned(false);
                  }}
                >
                  <Ionicons name="qr-code" size={24} color={COLORS.accent} />
                  <Text style={styles.qrScanText}>Scan QR Code</Text>
                </TouchableOpacity>

                <View style={styles.tapDivider}>
                  <View style={styles.tapDividerLine} />
                  <Text style={styles.tapDividerText}>ATAU INPUT MANUAL</Text>
                  <View style={styles.tapDividerLine} />
                </View>
                
                <View style={styles.tapInputRow}>
                  <TextInput 
                    style={styles.tapInputField}
                    placeholder="Masukkan ID Kartu"
                    placeholderTextColor={COLORS.textMuted}
                    value={tapInput}
                    onChangeText={setTapInput}
                    autoCapitalize="none"
                    onSubmitEditing={handleTapSearch}
                  />
                  <TouchableOpacity style={styles.tapSearchBtn} onPress={handleTapSearch}>
                    {tapLoading ? (
                      <ActivityIndicator size="small" color={COLORS.bgDark} />
                    ) : (
                      <Ionicons name="search" size={22} color={COLORS.bgDark} />
                    )}
                  </TouchableOpacity>
                </View>
                
                <TouchableOpacity style={styles.tapCancelBtn} onPress={closeTapModal}>
                  <Text style={styles.tapCancelText}>Batal</Text>
                </TouchableOpacity>
              </>
            )}

            {/* QR Scanner View */}
            {tapStep === 1 && showQRScanner && (
              <>
                <Text style={styles.tapModalTitle}>Scan QR Code</Text>
                <Text style={styles.tapModalSubtitle}>Arahkan kamera ke QR Code Smart Card</Text>
                
                {permission?.granted ? (
                  <View style={styles.qrCameraContainer}>
                    <CameraView
                      style={styles.qrCamera}
                      barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                      onBarcodeScanned={qrScanned ? undefined : handleQRScanned}
                    >
                      <View style={styles.qrOverlay}>
                        <View style={styles.qrFrame}>
                          <View style={[styles.qrCorner, styles.topLeft]} />
                          <View style={[styles.qrCorner, styles.topRight]} />
                          <View style={[styles.qrCorner, styles.bottomLeft]} />
                          <View style={[styles.qrCorner, styles.bottomRight]} />
                        </View>
                      </View>
                    </CameraView>
                  </View>
                ) : (
                  <View style={styles.permissionBox}>
                    <Ionicons name="camera-outline" size={48} color={COLORS.textMuted} />
                    <Text style={styles.permissionText}>Izin kamera diperlukan</Text>
                    <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
                      <Text style={styles.permissionBtnText}>Izinkan Kamera</Text>
                    </TouchableOpacity>
                  </View>
                )}
                
                <TouchableOpacity 
                  style={styles.tapCancelBtn} 
                  onPress={() => setShowQRScanner(false)}
                >
                  <Text style={styles.tapCancelText}>Kembali</Text>
                </TouchableOpacity>
              </>
            )}

            {tapStep === 2 && tapAnggota && (
              <>
                <View style={[styles.tapModalIconWrap, { backgroundColor: COLORS.primary }]}>
                  <Ionicons name="person-circle" size={48} color={COLORS.accent} />
                </View>
                <Text style={styles.tapModalTitle}>{tapAnggota.nama}</Text>
                <Text style={styles.tapModalSubtitle}>{tapAnggota.pangkat}</Text>
                
                <View style={styles.tapSaldoBox}>
                  <Text style={styles.tapSaldoLabel}>Saldo Saat Ini</Text>
                  <Text style={styles.tapSaldoValue}>{formatRupiah(tapAnggota.saldo)}</Text>
                </View>

                <Text style={[styles.label, { alignSelf: 'flex-start' }]}>Nominal Top Up</Text>
                <View style={styles.tapInputRow}>
                  <Text style={styles.inputPrefix}>Rp</Text>
                  <TextInput 
                    style={[styles.tapInputField, { flex: 1 }]}
                    placeholder="0"
                    placeholderTextColor={COLORS.textMuted}
                    value={tapNominal}
                    onChangeText={setTapNominal}
                    keyboardType="numeric"
                  />
                </View>
                
                <View style={styles.tapQuickRow}>
                  {[50000, 100000, 200000, 500000].map((amt) => (
                    <TouchableOpacity key={amt} style={styles.tapQuickChip} onPress={() => setQuickTapAmount(amt)}>
                      <Text style={styles.tapQuickText}>{formatRupiah(amt)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity 
                  style={styles.tapConfirmBtn} 
                  onPress={handleTapConfirm}
                  disabled={tapLoading}
                >
                  {tapLoading ? (
                    <ActivityIndicator size="small" color={COLORS.bgDark} />
                  ) : (
                    <>
                      <Ionicons name="add-circle" size={22} color={COLORS.bgDark} />
                      <Text style={styles.tapConfirmText}>Proses Top Up</Text>
                    </>
                  )}
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.tapCancelBtn} onPress={closeTapModal}>
                  <Text style={styles.tapCancelText}>Batal</Text>
                </TouchableOpacity>
              </>
            )}

            {tapStep === 3 && tapResult && (
              <>
                <View style={[styles.tapModalIconWrap, { backgroundColor: COLORS.success }]}>
                  <Ionicons name="checkmark" size={48} color="white" />
                </View>
                <Text style={[styles.tapModalTitle, { color: COLORS.success }]}>Top Up Berhasil!</Text>
                <Text style={styles.tapModalSubtitle}>
                  {tapAnggota?.nama} + {formatRupiah(parseInt(tapNominal))}
                </Text>
                
                <View style={styles.tapSaldoBox}>
                  <Text style={styles.tapSaldoLabel}>Saldo Baru</Text>
                  <Text style={styles.tapSaldoValue}>{formatRupiah(tapResult.saldo_sesudah)}</Text>
                </View>
                
                <TouchableOpacity style={styles.tapConfirmBtn} onPress={closeTapModal}>
                  <Ionicons name="checkmark-circle" size={22} color={COLORS.bgDark} />
                  <Text style={styles.tapConfirmText}>Selesai</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgDark },
  title: { fontSize: SIZES.xxl, fontWeight: '700', color: COLORS.textPrimary },
  subtitle: { fontSize: SIZES.sm, color: COLORS.textSecondary, marginBottom: 20 },
  
  // TAP Card
  tapCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: COLORS.bgCard, borderRadius: 16, padding: 16,
    borderWidth: 2, borderColor: COLORS.accent,
  },
  tapIconWrap: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  tapInfo: { flex: 1 },
  tapTitle: { fontSize: SIZES.lg, fontWeight: '700', color: COLORS.textPrimary },
  tapSubtitle: { fontSize: SIZES.sm, color: COLORS.textMuted, marginTop: 2 },
  
  // Divider
  divider: { 
    flexDirection: 'row', alignItems: 'center', gap: 12, 
    marginVertical: 20 
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerText: { 
    color: COLORS.textMuted, fontSize: SIZES.xs, fontWeight: '600', 
    letterSpacing: 1 
  },
  
  pickerBtn: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: COLORS.bgCard, borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: COLORS.border,
  },
  pickerPlaceholder: { color: COLORS.textMuted, fontSize: SIZES.md },
  selectedName: { color: COLORS.textPrimary, fontSize: SIZES.lg, fontWeight: '600' },
  selectedSaldo: { color: COLORS.accent, fontSize: SIZES.sm, marginTop: 2 },
  pickerList: {
    backgroundColor: COLORS.bgCard, borderRadius: 12, marginTop: 8,
    borderWidth: 1, borderColor: COLORS.border,
  },
  pickerItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  pickerItemName: { color: COLORS.textPrimary, fontSize: SIZES.md, fontWeight: '500' },
  pickerItemSub: { color: COLORS.textMuted, fontSize: SIZES.xs, marginTop: 2 },
  pickerItemSaldo: { color: COLORS.accent, fontSize: SIZES.sm, fontWeight: '600' },
  label: { fontSize: SIZES.xs, fontWeight: '700', color: COLORS.textMuted, letterSpacing: 2, marginTop: 16, marginBottom: 8 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bgCard,
    borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 14,
  },
  inputPrefix: { fontSize: SIZES.xl, color: COLORS.textSecondary, marginRight: 8 },
  input: { flex: 1, height: 52, color: COLORS.textPrimary, fontSize: SIZES.xxl, fontWeight: '700' },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  quickChip: {
    backgroundColor: COLORS.bgCard, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: COLORS.border,
  },
  quickText: { color: COLORS.accent, fontSize: SIZES.xs, fontWeight: '600' },
  processBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.accent, padding: 16, borderRadius: 14, marginTop: 20,
  },
  processBtnText: { color: COLORS.bgDark, fontSize: SIZES.lg, fontWeight: '700' },
  saldoCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: COLORS.bgCard, borderRadius: 10, padding: 14, marginBottom: 8,
  },
  saldoInfo: { flex: 1 },
  saldoName: { color: COLORS.textPrimary, fontSize: SIZES.md, fontWeight: '600' },
  saldoSub: { color: COLORS.textMuted, fontSize: SIZES.xs, marginTop: 2 },
  saldoAmount: { fontSize: SIZES.lg, fontWeight: '700', color: COLORS.accent },
  
  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center', alignItems: 'center',
  },
  tapModalContent: {
    backgroundColor: COLORS.bgCard, borderRadius: 24, width: '90%',
    padding: 28, alignItems: 'center',
  },
  tapModalIconWrap: {
    width: 100, height: 100, borderRadius: 50, backgroundColor: COLORS.accent,
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  tapModalTitle: { 
    fontSize: SIZES.xl, fontWeight: '700', color: COLORS.textPrimary, 
    marginBottom: 4 
  },
  tapModalSubtitle: { 
    fontSize: SIZES.md, color: COLORS.textMuted, textAlign: 'center',
    marginBottom: 20 
  },
  
  // NFC Scan Button
  nfcScanBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: COLORS.accent + '20', borderRadius: 16,
    paddingVertical: 16, paddingHorizontal: 32, marginBottom: 12,
    borderWidth: 2, borderColor: COLORS.accent, width: '100%',
    justifyContent: 'center',
  },
  nfcScanBtnActive: {
    backgroundColor: COLORS.danger + '20', borderColor: COLORS.danger,
  },
  nfcScanText: { fontSize: SIZES.lg, fontWeight: '700', color: COLORS.accent },
  nfcScanTextActive: { color: COLORS.danger },
  
  // QR Scan Button
  qrScanBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: COLORS.primary + '40', borderRadius: 16,
    paddingVertical: 16, paddingHorizontal: 32, marginBottom: 16,
    borderWidth: 2, borderColor: COLORS.primary, width: '100%',
    justifyContent: 'center',
  },
  qrScanText: { fontSize: SIZES.lg, fontWeight: '700', color: COLORS.accent },
  
  // QR Camera
  qrCameraContainer: {
    width: '100%', height: 250, borderRadius: 16, overflow: 'hidden',
    marginBottom: 16,
  },
  qrCamera: { flex: 1 },
  qrOverlay: { 
    flex: 1, alignItems: 'center', justifyContent: 'center', 
    backgroundColor: 'rgba(0,0,0,0.3)' 
  },
  qrFrame: { width: 180, height: 180, position: 'relative' },
  qrCorner: { position: 'absolute', width: 25, height: 25, borderColor: COLORS.accent },
  topLeft: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3 },
  topRight: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3 },
  bottomLeft: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3 },
  bottomRight: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3 },
  
  // Permission box
  permissionBox: {
    alignItems: 'center', padding: 24, marginBottom: 16,
  },
  permissionText: { color: COLORS.textMuted, marginTop: 12, marginBottom: 16 },
  permissionBtn: {
    backgroundColor: COLORS.accent, paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: 10,
  },
  permissionBtnText: { color: COLORS.bgDark, fontWeight: '700' },
  
  // Divider in modal
  tapDivider: {
    flexDirection: 'row', alignItems: 'center', width: '100%', marginVertical: 16,
  },
  tapDividerLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  tapDividerText: { paddingHorizontal: 12, color: COLORS.textMuted, fontSize: SIZES.xs },
  
  tapInputRow: { 
    flexDirection: 'row', gap: 10, width: '100%', marginBottom: 16 
  },
  tapInputField: {
    flex: 1, backgroundColor: COLORS.bgInput, borderRadius: 12, 
    paddingHorizontal: 16, paddingVertical: 14, color: COLORS.textPrimary,
    fontSize: SIZES.md, borderWidth: 1, borderColor: COLORS.border,
  },
  tapSearchBtn: {
    backgroundColor: COLORS.accent, borderRadius: 12, paddingHorizontal: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  tapCancelBtn: {
    backgroundColor: COLORS.bgInput, borderRadius: 12, paddingVertical: 14,
    paddingHorizontal: 40, marginTop: 12,
  },
  tapCancelText: { color: COLORS.textSecondary, fontWeight: '600' },
  tapSaldoBox: {
    backgroundColor: COLORS.bgInput, borderRadius: 12, padding: 16,
    width: '100%', alignItems: 'center', marginBottom: 16,
  },
  tapSaldoLabel: { fontSize: SIZES.xs, color: COLORS.textMuted, letterSpacing: 1, marginBottom: 4 },
  tapSaldoValue: { fontSize: 32, fontWeight: '700', color: COLORS.accent },
  tapQuickRow: { 
    flexDirection: 'row', flexWrap: 'wrap', gap: 8, width: '100%', 
    justifyContent: 'center', marginBottom: 16 
  },
  tapQuickChip: {
    backgroundColor: COLORS.bgInput, borderRadius: 8, 
    paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: COLORS.border,
  },
  tapQuickText: { color: COLORS.accent, fontSize: SIZES.sm, fontWeight: '600' },
  tapConfirmBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.accent, borderRadius: 14, 
    paddingVertical: 16, paddingHorizontal: 32,
  },
  tapConfirmText: { color: COLORS.bgDark, fontWeight: '700', fontSize: SIZES.lg },
});
