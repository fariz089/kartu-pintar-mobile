import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  ScrollView, FlatList, Modal, TextInput, ActivityIndicator,
  Animated, KeyboardAvoidingView, Platform
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, formatRupiah } from '../utils/theme';
import { keuanganAPI, anggotaAPI } from '../services/api';

// Try to import NFC
let NfcManager = null;
let NfcTech = null;
let Ndef = null;

try {
  const nfc = require('react-native-nfc-manager');
  NfcManager = nfc.default;
  NfcTech = nfc.NfcTech;
  Ndef = nfc.Ndef;
} catch (e) {
  console.log('NFC not available');
}

export default function POSScreen({ route, navigation }) {
  // Manual item entry
  const [itemNama, setItemNama] = useState('');
  const [itemHarga, setItemHarga] = useState('');
  const [itemQty, setItemQty] = useState('1');
  const [cart, setCart] = useState([]); // {uid, nama, harga, jumlah}
  const [loading, setLoading] = useState(false);

  // Member selection
  const [anggotaList, setAnggotaList] = useState([]);
  const [selectedAnggota, setSelectedAnggota] = useState(route.params?.selectedAnggota || null);
  const [showAnggotaPicker, setShowAnggotaPicker] = useState(false);
  const [anggotaSearchQuery, setAnggotaSearchQuery] = useState('');

  // Tap modal
  const [showTapModal, setShowTapModal] = useState(false);
  const [tapInput, setTapInput] = useState('');
  const [tapLoading, setTapLoading] = useState(false);
  const [nfcScanning, setNfcScanning] = useState(false);
  const [nfcSupported, setNfcSupported] = useState(false);

  const pulseAnim = useRef(new Animated.Value(1)).current;

  // QR scanner
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [qrScanned, setQrScanned] = useState(false);

  useEffect(() => {
    loadAnggota();
    checkNfcSupport();
    return () => {
      if (NfcManager) NfcManager.cancelTechnologyRequest().catch(() => {});
    };
  }, []);

  const checkNfcSupport = async () => {
    if (!NfcManager) { setNfcSupported(false); return; }
    try {
      const supported = await NfcManager.isSupported();
      if (supported) {
        await NfcManager.start();
        const enabled = await NfcManager.isEnabled();
        setNfcSupported(enabled);
      } else setNfcSupported(false);
    } catch (e) { setNfcSupported(false); }
  };

  const loadAnggota = async () => {
    try {
      const angRes = await anggotaAPI.list();
      if (angRes.success) setAnggotaList(angRes.data.filter(a => a.status_kartu === 'Aktif'));
    } catch (e) { console.log('Error loading anggota:', e); }
  };

  // ---------- Cart ----------
  const addManualItem = () => {
    const nama = itemNama.trim();
    const harga = parseInt(itemHarga || '0', 10);
    const qty = parseInt(itemQty || '1', 10);
    if (!nama) { Alert.alert('Error', 'Nama item wajib diisi'); return; }
    if (!harga || harga <= 0) { Alert.alert('Error', 'Harga harus lebih dari 0'); return; }
    if (!qty || qty <= 0) { Alert.alert('Error', 'Qty minimal 1'); return; }
    setCart(prev => [...prev, { uid: Date.now() + Math.random(), nama, harga, jumlah: qty }]);
    setItemNama(''); setItemHarga(''); setItemQty('1');
  };

  const updateCartQty = (uid, delta) => {
    setCart(prev => {
      const item = prev.find(c => c.uid === uid);
      if (!item) return prev;
      const newQty = item.jumlah + delta;
      if (newQty <= 0) return prev.filter(c => c.uid !== uid);
      return prev.map(c => c.uid === uid ? { ...c, jumlah: newQty } : c);
    });
  };

  const removeItem = (uid) => setCart(prev => prev.filter(c => c.uid !== uid));

  const clearCart = () => {
    if (cart.length === 0) return;
    Alert.alert('Kosongkan Keranjang?', 'Semua item akan dihapus', [
      { text: 'Batal', style: 'cancel' },
      { text: 'OK', onPress: () => setCart([]) }
    ]);
  };

  const cartTotal = cart.reduce((sum, c) => sum + c.harga * c.jumlah, 0);
  const cartCount = cart.reduce((sum, c) => sum + c.jumlah, 0);

  const buildItems = () => cart.map(c => ({ nama: c.nama, harga: c.harga, jumlah: c.jumlah }));

  // ---------- Payment ----------
  const finalizeSuccess = (data, isHutang) => {
    let msg = `Trx: ${data.trx_id}\nTotal: ${formatRupiah(cartTotal)}\nSisa saldo: ${formatRupiah(data.saldo_sesudah)}`;
    if (data.hutang_ditambah > 0) {
      msg += `\nHutang +${formatRupiah(data.hutang_ditambah)} (total ${formatRupiah(data.hutang_total)})`;
    }
    Alert.alert(isHutang ? 'Tercatat sebagai Hutang' : 'Berhasil!', msg);
    setCart([]);
    setSelectedAnggota(null);
    loadAnggota();
  };

  // Konfirmasi popup hutang
  const askHutang = (kartuId, kekurangan, saldo, nama, afterClose) => {
    Alert.alert(
      'Saldo Tidak Cukup',
      `${nama}\nSaldo: ${formatRupiah(saldo)}\nKekurangan: ${formatRupiah(kekurangan)}\n\nSaldo akan dipakai sampai habis, sisa kekurangan dicatat sebagai hutang. Apakah customer yakin ingin menambahkan ke hutang?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Ya, Tambah Hutang', onPress: async () => {
            setLoading(true);
            try {
              const res = await keuanganAPI.pembayaranCart(kartuId, buildItems(), 'Manual', true);
              if (res.success) { finalizeSuccess(res.data, true); if (afterClose) afterClose(); }
              else Alert.alert('Gagal', res.message);
            } catch (e) {
              Alert.alert('Error', e.response?.data?.message || 'Gagal memproses');
            }
            setLoading(false);
          }
        }
      ]
    );
  };

  const handleManualPayment = () => {
    if (!selectedAnggota) { Alert.alert('Error', 'Pilih anggota terlebih dahulu'); return; }
    if (cart.length === 0) { Alert.alert('Error', 'Keranjang masih kosong'); return; }

    Alert.alert('Konfirmasi', `Bayar ${formatRupiah(cartTotal)} untuk ${selectedAnggota.nama}?`, [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Proses', onPress: async () => {
          setLoading(true);
          try {
            const res = await keuanganAPI.pembayaranCart(selectedAnggota.kartu_id, buildItems(), 'Manual', false);
            if (res.success) { finalizeSuccess(res.data, false); }
            else if (res.need_hutang) {
              setLoading(false);
              askHutang(selectedAnggota.kartu_id, res.kekurangan, res.saldo, selectedAnggota.nama);
              return;
            } else Alert.alert('Gagal', res.message);
          } catch (e) {
            const d = e.response?.data;
            if (d && d.need_hutang) {
              setLoading(false);
              askHutang(selectedAnggota.kartu_id, d.kekurangan, d.saldo, selectedAnggota.nama);
              return;
            }
            Alert.alert('Error', d?.message || 'Gagal memproses');
          }
          setLoading(false);
        }
      }
    ]);
  };

  // ---------- Member tap lookup ----------
  const startPulse = () => {
    Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.2, duration: 800, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
    ])).start();
  };
  const stopPulse = () => { pulseAnim.stopAnimation(); pulseAnim.setValue(1); };

  const openTapModal = () => {
    setShowTapModal(true);
    setTapInput('');
    setNfcScanning(false);
    setShowQRScanner(false);
    setQrScanned(false);
  };

  const startNfcScan = async () => {
    if (!NfcManager || !nfcSupported) {
      Alert.alert('NFC Tidak Tersedia', 'Perangkat ini tidak mendukung NFC atau NFC tidak aktif');
      return;
    }
    setNfcScanning(true);
    startPulse();
    try {
      await NfcManager.requestTechnology([NfcTech.Ndef, NfcTech.NfcA]);
      const tag = await NfcManager.getTag();
      if (!tag) { Alert.alert('Error', 'Tidak bisa membaca kartu'); return; }
      let scanData = null;
      if (tag.ndefMessage && tag.ndefMessage.length > 0) {
        for (const record of tag.ndefMessage) {
          if (Ndef && record.payload) {
            try { const t = Ndef.text.decodePayload(record.payload); if (t) { scanData = t; break; } } catch (e) {}
            try { const u = Ndef.uri.decodePayload(record.payload); if (u) { scanData = u; break; } } catch (e) {}
          }
        }
      }
      if (!scanData && tag.id) scanData = tag.id.toUpperCase();
      if (scanData) { setTapInput(scanData); await lookupMember(scanData, 'NFC'); }
      else Alert.alert('Error', 'Kartu terdeteksi tapi data tidak terbaca');
    } catch (e) {
      if (e.message !== 'cancelled') Alert.alert('NFC Error', 'Gagal membaca kartu. Coba lagi.');
    } finally {
      setNfcScanning(false);
      stopPulse();
      try { await NfcManager.cancelTechnologyRequest(); } catch (e) {}
    }
  };

  const stopNfcScan = async () => {
    setNfcScanning(false);
    stopPulse();
    try { if (NfcManager) await NfcManager.cancelTechnologyRequest(); } catch (e) {}
  };

  const lookupMember = async (scanData, metode) => {
    if (!scanData || !scanData.trim()) return;
    setTapLoading(true);
    try {
      const res = await keuanganAPI.pembayaranTap(scanData, metode);
      if (res.success && res.data.anggota) {
        const a = res.data.anggota;
        setSelectedAnggota({
          kartu_id: a.kartu_id, nama: a.nama, pangkat: a.pangkat,
          saldo: a.saldo, hutang: a.hutang || 0, status_kartu: 'Aktif',
        });
        closeTapModal();
      } else {
        Alert.alert('Tidak Ditemukan', res.message || 'Kartu tidak terdaftar');
      }
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Kartu tidak ditemukan');
    }
    setTapLoading(false);
  };

  const closeTapModal = () => {
    stopNfcScan();
    setShowTapModal(false);
    setShowQRScanner(false);
  };

  const handleQRScanned = async ({ data }) => {
    if (qrScanned) return;
    setQrScanned(true);
    let cardId = data;
    const match = data.match(/[KS][PC]-\d{4}-\d{3}/);
    if (match) cardId = match[0];
    setTapInput(cardId);
    setShowQRScanner(false);
    await lookupMember(cardId, 'QR');
  };

  // ---------- Render ----------
  const filteredAnggota = anggotaList.filter(a => {
    const q = anggotaSearchQuery.toLowerCase();
    return !q || (a.nama + ' ' + a.nrp + ' ' + a.pangkat + ' ' + a.kartu_id).toLowerCase().includes(q);
  });

  const renderCartItem = ({ item }) => (
    <View style={styles.cartItem}>
      <View style={{ flex: 1 }}>
        <Text style={styles.cartItemName}>{item.nama}</Text>
        <Text style={styles.cartItemSub}>{formatRupiah(item.harga)} × {item.jumlah}</Text>
      </View>
      <View style={styles.qtyControls}>
        <TouchableOpacity style={styles.qtyBtn} onPress={() => updateCartQty(item.uid, -1)}>
          <Ionicons name="remove" size={16} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.qtyText}>{item.jumlah}</Text>
        <TouchableOpacity style={styles.qtyBtn} onPress={() => updateCartQty(item.uid, 1)}>
          <Ionicons name="add" size={16} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>
      <Text style={styles.cartItemSubtotal}>{formatRupiah(item.harga * item.jumlah)}</Text>
      <TouchableOpacity onPress={() => removeItem(item.uid)} style={{ paddingLeft: 8 }}>
        <Ionicons name="close" size={18} color={COLORS.danger} />
      </TouchableOpacity>
    </View>
  );

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: SIZES.padding, paddingBottom: 40 }}>
        {/* Manual item entry */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}><Ionicons name="add-circle" size={16} color={COLORS.accent} /> Tambah Item</Text>
          <TextInput
            style={styles.input}
            placeholder="Nama item (cth: Nasi Goreng)"
            placeholderTextColor={COLORS.textMuted}
            value={itemNama}
            onChangeText={setItemNama}
          />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TextInput
              style={[styles.input, { flex: 2 }]}
              placeholder="Harga (Rp)"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="numeric"
              value={itemHarga}
              onChangeText={setItemHarga}
            />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Qty"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="numeric"
              value={itemQty}
              onChangeText={setItemQty}
            />
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={addManualItem}>
            <Ionicons name="add" size={18} color="#1a2332" />
            <Text style={styles.addBtnText}>Tambah ke Keranjang</Text>
          </TouchableOpacity>
        </View>

        {/* Cart */}
        <View style={styles.card}>
          <View style={styles.cartHeader}>
            <Text style={styles.cardTitle}><Ionicons name="cart" size={16} color={COLORS.accent} /> Keranjang ({cartCount})</Text>
            {cart.length > 0 && (
              <TouchableOpacity onPress={clearCart}><Text style={styles.clearText}>Kosongkan</Text></TouchableOpacity>
            )}
          </View>
          {cart.length === 0 ? (
            <Text style={styles.emptyCart}>Belum ada item</Text>
          ) : (
            <FlatList data={cart} renderItem={renderCartItem} keyExtractor={i => String(i.uid)} scrollEnabled={false} />
          )}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatRupiah(cartTotal)}</Text>
          </View>
        </View>

        {/* Member + Payment */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}><Ionicons name="card" size={16} color={COLORS.accent} /> Pembayaran</Text>

          <TouchableOpacity style={styles.tapButton} onPress={openTapModal}>
            <Ionicons name="scan" size={22} color={COLORS.accent} />
            <Text style={styles.tapButtonText}>Tap / Scan Kartu (NFC / QR)</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.selectMember} onPress={() => setShowAnggotaPicker(true)}>
            <View style={{ flex: 1 }}>
              {selectedAnggota ? (
                <>
                  <Text style={styles.memberName}>{selectedAnggota.nama}</Text>
                  <Text style={styles.memberSub}>
                    {selectedAnggota.pangkat} · Saldo {formatRupiah(selectedAnggota.saldo)}
                    {selectedAnggota.hutang > 0 ? ` · Hutang ${formatRupiah(selectedAnggota.hutang)}` : ''}
                  </Text>
                </>
              ) : (
                <Text style={styles.memberPlaceholder}>Pilih anggota...</Text>
              )}
            </View>
            <Ionicons name="chevron-down" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.payBtn, (!selectedAnggota || cart.length === 0) && styles.payBtnDisabled]}
            onPress={handleManualPayment}
            disabled={!selectedAnggota || cart.length === 0 || loading}
          >
            {loading ? <ActivityIndicator color="#1a2332" /> : (
              <>
                <Ionicons name="checkmark-circle" size={18} color="#1a2332" />
                <Text style={styles.payBtnText}>Proses Pembayaran</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Anggota picker modal */}
      <Modal visible={showAnggotaPicker} animationType="slide" transparent onRequestClose={() => setShowAnggotaPicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Pilih Anggota</Text>
              <TouchableOpacity onPress={() => setShowAnggotaPicker(false)}>
                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.input}
              placeholder="Cari nama / NRP / pangkat..."
              placeholderTextColor={COLORS.textMuted}
              value={anggotaSearchQuery}
              onChangeText={setAnggotaSearchQuery}
            />
            <FlatList
              data={filteredAnggota}
              keyExtractor={a => a.kartu_id}
              style={{ maxHeight: 360 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.anggotaRow}
                  onPress={() => {
                    setSelectedAnggota({ ...item, hutang: item.hutang || 0 });
                    setShowAnggotaPicker(false);
                    setAnggotaSearchQuery('');
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.memberName}>{item.nama}</Text>
                    <Text style={styles.memberSub}>
                      {item.pangkat} · {item.kartu_id} · {formatRupiah(item.saldo)}
                      {item.hutang > 0 ? ` · Hutang ${formatRupiah(item.hutang)}` : ''}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={styles.emptyCart}>Tidak ada hasil</Text>}
            />
          </View>
        </View>
      </Modal>

      {/* Tap modal */}
      <Modal visible={showTapModal} animationType="slide" transparent onRequestClose={closeTapModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Tap / Scan Kartu</Text>
              <TouchableOpacity onPress={closeTapModal}>
                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            {showQRScanner ? (
              <View style={styles.qrContainer}>
                {permission?.granted ? (
                  <CameraView
                    style={styles.camera}
                    facing="back"
                    barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                    onBarcodeScanned={qrScanned ? undefined : handleQRScanned}
                  />
                ) : (
                  <View style={styles.center}>
                    <Text style={styles.memberSub}>Izin kamera diperlukan</Text>
                    <TouchableOpacity style={styles.addBtn} onPress={requestPermission}>
                      <Text style={styles.addBtnText}>Beri Izin Kamera</Text>
                    </TouchableOpacity>
                  </View>
                )}
                <TouchableOpacity style={styles.secondaryBtn} onPress={() => { setShowQRScanner(false); setQrScanned(false); }}>
                  <Text style={styles.secondaryBtnText}>Kembali</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {nfcScanning ? (
                  <View style={styles.center}>
                    <Animated.View style={[styles.nfcPulse, { transform: [{ scale: pulseAnim }] }]}>
                      <Ionicons name="card" size={40} color={COLORS.accent} />
                    </Animated.View>
                    <Text style={styles.memberSub}>Tempelkan kartu ke perangkat...</Text>
                    <TouchableOpacity style={styles.secondaryBtn} onPress={stopNfcScan}>
                      <Text style={styles.secondaryBtnText}>Batal</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <>
                    {nfcSupported && (
                      <TouchableOpacity style={styles.tapButton} onPress={startNfcScan}>
                        <Ionicons name="card" size={22} color={COLORS.accent} />
                        <Text style={styles.tapButtonText}>Scan NFC</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity style={styles.tapButton} onPress={() => { setQrScanned(false); setShowQRScanner(true); }}>
                      <Ionicons name="qr-code" size={22} color={COLORS.accent} />
                      <Text style={styles.tapButtonText}>Scan QR Code</Text>
                    </TouchableOpacity>
                    <Text style={[styles.memberSub, { textAlign: 'center', marginVertical: 8 }]}>atau input manual</Text>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TextInput
                        style={[styles.input, { flex: 1, marginBottom: 0 }]}
                        placeholder="NFC UID / ID Kartu"
                        placeholderTextColor={COLORS.textMuted}
                        value={tapInput}
                        onChangeText={setTapInput}
                      />
                      <TouchableOpacity style={styles.searchBtn} onPress={() => lookupMember(tapInput, 'NFC')}>
                        {tapLoading ? <ActivityIndicator color="#1a2332" /> : <Ionicons name="search" size={20} color="#1a2332" />}
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgDark },
  center: { alignItems: 'center', justifyContent: 'center', paddingVertical: 24 },
  card: { backgroundColor: COLORS.bgCard, borderRadius: SIZES.radius, padding: SIZES.padding, marginBottom: 14, borderWidth: 1, borderColor: COLORS.border },
  cardTitle: { color: COLORS.textPrimary, fontSize: SIZES.lg, fontWeight: '700', marginBottom: 12 },
  input: { backgroundColor: COLORS.bgInput, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: COLORS.textPrimary, fontSize: SIZES.md, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: COLORS.accent, borderRadius: 10, paddingVertical: 12, marginTop: 4 },
  addBtnText: { color: '#1a2332', fontWeight: '700', fontSize: SIZES.md },
  cartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  clearText: { color: COLORS.danger, fontSize: SIZES.sm },
  emptyCart: { color: COLORS.textMuted, textAlign: 'center', paddingVertical: 20 },
  cartItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  cartItemName: { color: COLORS.textPrimary, fontSize: SIZES.md, fontWeight: '600' },
  cartItemSub: { color: COLORS.textMuted, fontSize: SIZES.xs, marginTop: 2 },
  cartItemSubtotal: { color: COLORS.accent, fontSize: SIZES.md, fontWeight: '700', minWidth: 84, textAlign: 'right' },
  qtyControls: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 8 },
  qtyBtn: { backgroundColor: COLORS.bgInput, borderRadius: 6, padding: 5 },
  qtyText: { color: COLORS.textPrimary, minWidth: 22, textAlign: 'center' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, paddingTop: 12, borderTopWidth: 2, borderTopColor: COLORS.border },
  totalLabel: { color: COLORS.textSecondary, fontSize: SIZES.md },
  totalValue: { color: COLORS.accent, fontSize: SIZES.xxl, fontWeight: '700' },
  tapButton: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.bgInput, borderRadius: 10, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border },
  tapButtonText: { color: COLORS.textPrimary, fontSize: SIZES.md, fontWeight: '600' },
  selectMember: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bgInput, borderRadius: 10, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border },
  memberName: { color: COLORS.textPrimary, fontSize: SIZES.md, fontWeight: '600' },
  memberSub: { color: COLORS.textMuted, fontSize: SIZES.sm, marginTop: 2 },
  memberPlaceholder: { color: COLORS.textMuted, fontSize: SIZES.md },
  payBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.accent, borderRadius: 10, paddingVertical: 15 },
  payBtnDisabled: { opacity: 0.4 },
  payBtnText: { color: '#1a2332', fontWeight: '700', fontSize: SIZES.lg },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.bgCard, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: SIZES.padding, paddingBottom: 30 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  modalTitle: { color: COLORS.textPrimary, fontSize: SIZES.xl, fontWeight: '700' },
  anggotaRow: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  searchBtn: { backgroundColor: COLORS.accent, borderRadius: 10, width: 50, alignItems: 'center', justifyContent: 'center' },
  secondaryBtn: { backgroundColor: COLORS.bgInput, borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 12, borderWidth: 1, borderColor: COLORS.border },
  secondaryBtnText: { color: COLORS.textPrimary, fontWeight: '600' },
  nfcPulse: { width: 90, height: 90, borderRadius: 45, backgroundColor: 'rgba(197,164,78,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  qrContainer: { height: 380 },
  camera: { flex: 1, borderRadius: 12, overflow: 'hidden' },
});
