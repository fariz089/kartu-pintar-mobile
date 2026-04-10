import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, Alert, 
  ScrollView, FlatList, Modal, TextInput, ActivityIndicator,
  Platform, Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, formatRupiah } from '../utils/theme';
import { produkAPI, kategoriAPI, keuanganAPI, anggotaAPI } from '../services/api';

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

export default function POSScreen({ route, navigation }) {
  const [kategoriList, setKategoriList] = useState([]);
  const [produkList, setProdukList] = useState([]);
  const [selectedKategori, setSelectedKategori] = useState('all'); // Changed from null to 'all'
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Member selection
  const [anggotaList, setAnggotaList] = useState([]);
  const [selectedAnggota, setSelectedAnggota] = useState(route.params?.selectedAnggota || null);
  const [showAnggotaPicker, setShowAnggotaPicker] = useState(false);
  
  // Tap modal
  const [showTapModal, setShowTapModal] = useState(false);
  const [tapInput, setTapInput] = useState('');
  const [tapAnggota, setTapAnggota] = useState(null);
  const [tapStep, setTapStep] = useState(1); // 1: input/scan, 2: confirm, 3: success
  const [tapLoading, setTapLoading] = useState(false);
  const [tapResult, setTapResult] = useState(null);
  const [nfcScanning, setNfcScanning] = useState(false);
  const [nfcSupported, setNfcSupported] = useState(false);
  
  // Pulse animation for NFC
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadData();
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
        setNfcSupported(enabled); // Only show NFC button if enabled
      }
    } catch (e) {
      console.log('NFC check error:', e);
      setNfcSupported(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [katRes, prodRes, angRes] = await Promise.all([
        kategoriAPI.list(),
        produkAPI.list(),
        anggotaAPI.list()
      ]);
      if (katRes.success) setKategoriList(katRes.data);
      if (prodRes.success) setProdukList(prodRes.data);
      if (angRes.success) setAnggotaList(angRes.data.filter(a => a.status_kartu === 'Aktif'));
    } catch (e) {
      console.log('Error loading:', e);
    }
    setLoading(false);
  };

  // Filter products - Fixed to use 'all' instead of null
  const filteredProducts = produkList.filter(p => {
    const matchKategori = selectedKategori === 'all' || p.kategori_id === selectedKategori;
    const matchSearch = !searchQuery || 
      p.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.kode.toLowerCase().includes(searchQuery.toLowerCase());
    return matchKategori && matchSearch;
  });

  // Cart functions
  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(c => c.id === product.id);
      if (existing) {
        if (existing.jumlah >= product.stok) {
          Alert.alert('Stok Habis', `Stok ${product.nama} hanya ${product.stok}`);
          return prev;
        }
        return prev.map(c => c.id === product.id ? {...c, jumlah: c.jumlah + 1} : c);
      }
      return [...prev, {...product, jumlah: 1}];
    });
  };

  const updateCartQty = (productId, delta) => {
    setCart(prev => {
      const item = prev.find(c => c.id === productId);
      if (!item) return prev;
      
      const newQty = item.jumlah + delta;
      if (newQty <= 0) return prev.filter(c => c.id !== productId);
      if (newQty > item.stok) {
        Alert.alert('Stok Tidak Cukup', `Maksimal ${item.stok}`);
        return prev;
      }
      return prev.map(c => c.id === productId ? {...c, jumlah: newQty} : c);
    });
  };

  const clearCart = () => {
    if (cart.length === 0) return;
    Alert.alert('Kosongkan Keranjang?', 'Semua item akan dihapus', [
      { text: 'Batal', style: 'cancel' },
      { text: 'OK', onPress: () => setCart([]) }
    ]);
  };

  // Calculate totals
  const cartTotal = cart.reduce((sum, c) => sum + (c.harga * c.jumlah), 0);
  const cartCount = cart.reduce((sum, c) => sum + c.jumlah, 0);

  // Process payment (manual)
  const handleManualPayment = async () => {
    if (!selectedAnggota) {
      Alert.alert('Error', 'Pilih anggota terlebih dahulu');
      return;
    }
    if (cart.length === 0) {
      Alert.alert('Error', 'Keranjang masih kosong');
      return;
    }
    if (selectedAnggota.saldo < cartTotal) {
      Alert.alert('Saldo Tidak Cukup', `Saldo ${selectedAnggota.nama}: ${formatRupiah(selectedAnggota.saldo)}`);
      return;
    }

    Alert.alert('Konfirmasi', `Bayar ${formatRupiah(cartTotal)} untuk ${selectedAnggota.nama}?`, [
      { text: 'Batal', style: 'cancel' },
      { text: 'Proses', onPress: async () => {
        setLoading(true);
        try {
          const items = cart.map(c => ({ produk_id: c.id, jumlah: c.jumlah }));
          const res = await keuanganAPI.pembayaranCart(selectedAnggota.kartu_id, items, 'Manual');
          if (res.success) {
            Alert.alert('Berhasil!', 
              `Trx: ${res.data.trx_id}\nTotal: ${formatRupiah(res.data.total)}\nSisa saldo: ${formatRupiah(res.data.saldo_sesudah)}`
            );
            setCart([]);
            setSelectedAnggota(null);
            loadData();
          } else {
            Alert.alert('Gagal', res.message);
          }
        } catch (e) {
          Alert.alert('Error', e.response?.data?.message || 'Gagal memproses');
        }
        setLoading(false);
      }}
    ]);
  };

  // Start pulse animation
  const startPulse = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.2, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  };

  // Stop pulse animation
  const stopPulse = () => {
    pulseAnim.stopAnimation();
    pulseAnim.setValue(1);
  };

  // TAP payment flow
  const openTapModal = () => {
    if (cart.length === 0) {
      Alert.alert('Error', 'Keranjang masih kosong');
      return;
    }
    setShowTapModal(true);
    setTapStep(1);
    setTapInput('');
    setTapAnggota(null);
    setTapResult(null);
    setNfcScanning(false);
  };

  // Start NFC scanning - sama dengan ScanNFCScreen
  const startNfcScan = async () => {
    if (!NfcManager || !nfcSupported) {
      Alert.alert('NFC Tidak Tersedia', 'Perangkat ini tidak mendukung NFC atau NFC tidak aktif');
      return;
    }

    setNfcScanning(true);
    startPulse();

    try {
      // Sama dengan ScanNFCScreen - pakai NfcTech.Ndef dan NfcTech.NfcA
      await NfcManager.requestTechnology([NfcTech.Ndef, NfcTech.NfcA]);
      const tag = await NfcManager.getTag();
      
      if (!tag) {
        Alert.alert('Error', 'Tidak bisa membaca kartu');
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
        setTapInput(scanData);
        // Auto search after NFC read
        await handleTapSearchWithUID(scanData);
      } else {
        Alert.alert('Error', 'Kartu terdeteksi tapi data tidak terbaca');
      }
    } catch (e) {
      console.log('NFC Error:', e);
      if (e.message !== 'cancelled') {
        Alert.alert('NFC Error', 'Gagal membaca kartu. Coba lagi.');
      }
    } finally {
      setNfcScanning(false);
      stopPulse();
      try { await NfcManager.cancelTechnologyRequest(); } catch (e) {}
    }
  };

  // Stop NFC scanning
  const stopNfcScan = async () => {
    setNfcScanning(false);
    stopPulse();
    try { 
      if (NfcManager) await NfcManager.cancelTechnologyRequest(); 
    } catch (e) {}
  };

  // Handle search with UID (from NFC)
  const handleTapSearchWithUID = async (uid) => {
    if (!uid.trim()) return;
    setTapLoading(true);
    try {
      const res = await keuanganAPI.pembayaranTap(uid, [], 'NFC');
      if (res.success && res.data.ready_to_pay) {
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
    await handleTapSearchWithUID(tapInput);
  };

  const handleTapConfirm = async () => {
    if (!tapAnggota) return;
    
    if (tapAnggota.saldo < cartTotal) {
      Alert.alert('Saldo Tidak Cukup', `Saldo: ${formatRupiah(tapAnggota.saldo)}`);
      return;
    }

    setTapLoading(true);
    try {
      const items = cart.map(c => ({ produk_id: c.id, jumlah: c.jumlah }));
      const res = await keuanganAPI.pembayaranTap(tapInput, items, 'NFC');
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

  const closeTapModal = () => {
    stopNfcScan();
    setShowTapModal(false);
    if (tapStep === 3) {
      setCart([]);
      loadData();
    }
  };

  // Render product item
  const renderProduct = ({ item }) => {
    const inCart = cart.find(c => c.id === item.id);
    return (
      <TouchableOpacity 
        style={[styles.productCard, inCart && styles.productCardInCart]} 
        onPress={() => addToCart(item)}
      >
        <Text style={styles.productCode}>{item.kode}</Text>
        <Text style={styles.productName} numberOfLines={2}>{item.nama}</Text>
        <View style={styles.productFooter}>
          <Text style={styles.productPrice}>{formatRupiah(item.harga)}</Text>
          <Text style={[styles.productStock, item.stok_rendah && styles.productStockLow]}>
            {item.stok} {item.satuan}
          </Text>
        </View>
        {inCart && (
          <View style={styles.cartBadge}>
            <Text style={styles.cartBadgeText}>{inCart.jumlah}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading && produkList.length === 0) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Categories */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryBar}>
        <TouchableOpacity 
          style={[
            styles.categoryChip, 
            selectedKategori === 'all' && { backgroundColor: COLORS.accent, borderColor: COLORS.accent }
          ]}
          onPress={() => setSelectedKategori('all')}
        >
          <Ionicons name="grid" size={16} color={selectedKategori === 'all' ? '#1a2332' : '#e8e4d9'} />
          <Text style={[
            styles.categoryText, 
            { color: selectedKategori === 'all' ? '#1a2332' : '#e8e4d9' }
          ]}>Semua</Text>
        </TouchableOpacity>
        {kategoriList.map(k => {
          const isActive = selectedKategori === k.id;
          return (
            <TouchableOpacity 
              key={k.id}
              style={[
                styles.categoryChip, 
                isActive && { backgroundColor: COLORS.accent, borderColor: COLORS.accent }
              ]}
              onPress={() => setSelectedKategori(k.id)}
            >
              <Text style={[
                styles.categoryText, 
                { color: isActive ? '#1a2332' : '#e8e4d9' }
              ]}>
                {k.nama}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Search */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={COLORS.textMuted} />
          <TextInput 
            style={styles.searchInput}
            placeholder="Cari produk..."
            placeholderTextColor={COLORS.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity style={styles.tapButton} onPress={openTapModal}>
          <Ionicons name="card" size={20} color={COLORS.bgDark} />
          <Text style={styles.tapButtonText}>TAP</Text>
        </TouchableOpacity>
      </View>

      {/* Products */}
      <FlatList
        data={filteredProducts}
        keyExtractor={item => item.id.toString()}
        renderItem={renderProduct}
        numColumns={2}
        columnWrapperStyle={styles.productRow}
        contentContainerStyle={styles.productList}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="cube-outline" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>Tidak ada produk</Text>
          </View>
        }
      />

      {/* Cart Bar */}
      {cart.length > 0 && (
        <View style={styles.cartBar}>
          <TouchableOpacity style={styles.cartClearBtn} onPress={clearCart}>
            <Ionicons name="trash-outline" size={20} color={COLORS.danger} />
          </TouchableOpacity>
          <View style={styles.cartInfo}>
            <Text style={styles.cartCount}>{cartCount} item</Text>
            <Text style={styles.cartTotal}>{formatRupiah(cartTotal)}</Text>
          </View>
          <TouchableOpacity 
            style={[styles.cartPayBtn, !selectedAnggota && styles.cartPayBtnDisabled]}
            onPress={handleManualPayment}
            disabled={!selectedAnggota}
          >
            <Ionicons name="checkmark-circle" size={20} color={COLORS.bgDark} />
            <Text style={styles.cartPayText}>Bayar</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Member Picker Bar */}
      <TouchableOpacity style={styles.memberPicker} onPress={() => setShowAnggotaPicker(true)}>
        <Ionicons name="person-add" size={20} color={COLORS.accent} />
        {selectedAnggota ? (
          <>
            <Text style={styles.memberName}>{selectedAnggota.nama}</Text>
            <Text style={styles.memberSaldo}>{formatRupiah(selectedAnggota.saldo)}</Text>
          </>
        ) : (
          <Text style={styles.memberPlaceholder}>Pilih Anggota</Text>
        )}
        <Ionicons name="chevron-down" size={18} color={COLORS.textMuted} />
      </TouchableOpacity>

      {/* Member Picker Modal */}
      <Modal visible={showAnggotaPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Pilih Anggota</Text>
              <TouchableOpacity onPress={() => setShowAnggotaPicker(false)}>
                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={anggotaList}
              keyExtractor={item => item.kartu_id}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.anggotaItem}
                  onPress={() => { setSelectedAnggota(item); setShowAnggotaPicker(false); }}
                >
                  <View>
                    <Text style={styles.anggotaName}>{item.nama}</Text>
                    <Text style={styles.anggotaPangkat}>{item.pangkat}</Text>
                  </View>
                  <Text style={styles.anggotaSaldo}>{formatRupiah(item.saldo)}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* TAP Payment Modal - WITH NFC SCAN */}
      <Modal visible={showTapModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.tapModalContent}>
            {tapStep === 1 && (
              <>
                <Animated.View style={[
                  styles.tapIconWrap,
                  nfcScanning && { transform: [{ scale: pulseAnim }] }
                ]}>
                  <Ionicons name="card" size={48} color={COLORS.bgDark} />
                </Animated.View>
                <Text style={styles.tapTitle}>Tempelkan Kartu</Text>
                <Text style={styles.tapSubtitle}>Scan NFC atau masukkan ID kartu</Text>
                
                {/* NFC Scan Button */}
                {nfcSupported && (
                  <TouchableOpacity 
                    style={[styles.nfcScanBtn, nfcScanning && styles.nfcScanBtnActive]} 
                    onPress={nfcScanning ? stopNfcScan : startNfcScan}
                  >
                    <Ionicons 
                      name={nfcScanning ? "close-circle" : "wifi"} 
                      size={24} 
                      color={nfcScanning ? COLORS.danger : COLORS.accent} 
                    />
                    <Text style={[styles.nfcScanText, nfcScanning && styles.nfcScanTextActive]}>
                      {nfcScanning ? 'Batal Scan' : 'Scan NFC'}
                    </Text>
                  </TouchableOpacity>
                )}

                {nfcScanning && (
                  <View style={styles.nfcScanningIndicator}>
                    <ActivityIndicator size="small" color={COLORS.accent} />
                    <Text style={styles.nfcScanningText}>Menunggu kartu NFC...</Text>
                  </View>
                )}
                
                <View style={styles.tapDivider}>
                  <View style={styles.tapDividerLine} />
                  <Text style={styles.tapDividerText}>atau</Text>
                  <View style={styles.tapDividerLine} />
                </View>

                <View style={styles.tapInputRow}>
                  <TextInput
                    style={styles.tapInput}
                    placeholder="ID Kartu / NFC UID..."
                    placeholderTextColor={COLORS.textMuted}
                    value={tapInput}
                    onChangeText={setTapInput}
                    onSubmitEditing={handleTapSearch}
                  />
                  <TouchableOpacity style={styles.tapSearchBtn} onPress={handleTapSearch} disabled={tapLoading}>
                    {tapLoading ? (
                      <ActivityIndicator size="small" color={COLORS.bgDark} />
                    ) : (
                      <Ionicons name="search" size={20} color={COLORS.bgDark} />
                    )}
                  </TouchableOpacity>
                </View>
                <TouchableOpacity style={styles.tapCancelBtn} onPress={closeTapModal}>
                  <Text style={styles.tapCancelText}>Batal</Text>
                </TouchableOpacity>
              </>
            )}

            {tapStep === 2 && tapAnggota && (
              <>
                <View style={[styles.tapIconWrap, { backgroundColor: COLORS.primary }]}>
                  <Ionicons name="person-circle" size={48} color={COLORS.accent} />
                </View>
                <Text style={styles.tapTitle}>{tapAnggota.nama}</Text>
                <Text style={styles.tapSubtitle}>{tapAnggota.pangkat}</Text>
                <Text style={styles.tapSaldo}>{formatRupiah(tapAnggota.saldo)}</Text>
                
                <View style={styles.tapSummary}>
                  <Text style={styles.tapSummaryLabel}>Total Belanja:</Text>
                  <Text style={styles.tapSummaryValue}>{formatRupiah(cartTotal)}</Text>
                </View>

                {tapAnggota.saldo >= cartTotal ? (
                  <TouchableOpacity 
                    style={styles.tapConfirmBtn} 
                    onPress={handleTapConfirm}
                    disabled={tapLoading}
                  >
                    {tapLoading ? (
                      <ActivityIndicator size="small" color={COLORS.bgDark} />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle" size={22} color={COLORS.bgDark} />
                        <Text style={styles.tapConfirmText}>Bayar Sekarang</Text>
                      </>
                    )}
                  </TouchableOpacity>
                ) : (
                  <View style={styles.tapInsufficientWrap}>
                    <Ionicons name="warning" size={20} color={COLORS.danger} />
                    <Text style={styles.tapInsufficientText}>Saldo Tidak Cukup</Text>
                  </View>
                )}
                
                <TouchableOpacity style={styles.tapCancelBtn} onPress={closeTapModal}>
                  <Text style={styles.tapCancelText}>Batal</Text>
                </TouchableOpacity>
              </>
            )}

            {tapStep === 3 && tapResult && (
              <>
                <View style={[styles.tapIconWrap, { backgroundColor: COLORS.success }]}>
                  <Ionicons name="checkmark" size={48} color="white" />
                </View>
                <Text style={[styles.tapTitle, { color: COLORS.success }]}>Pembayaran Berhasil!</Text>
                <Text style={styles.tapSubtitle}>Trx: {tapResult.trx_id}</Text>
                <Text style={styles.tapSaldo}>Sisa Saldo: {formatRupiah(tapResult.saldo_sesudah)}</Text>
                
                <TouchableOpacity style={styles.tapConfirmBtn} onPress={closeTapModal}>
                  <Ionicons name="refresh" size={22} color={COLORS.bgDark} />
                  <Text style={styles.tapConfirmText}>Transaksi Baru</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgDark },
  center: { justifyContent: 'center', alignItems: 'center' },
  
  // Categories
  categoryBar: { 
    flexGrow: 0,
    flexShrink: 0, // Prevent shrinking
    height: 56, // Fixed height
    paddingHorizontal: SIZES.padding, 
    paddingVertical: 12,
    borderBottomWidth: 1, 
    borderBottomColor: COLORS.border,
  },
  categoryChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, marginRight: 8,
    backgroundColor: COLORS.bgCard, borderRadius: 20,
    borderWidth: 1, borderColor: COLORS.border,
    height: 36, // Fixed chip height
  },
  categoryChipActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  categoryText: { color: COLORS.textPrimary, fontSize: SIZES.sm, fontWeight: '500' },
  categoryTextActive: { color: COLORS.bgDark, fontWeight: '600' },

  // Search
  searchRow: { 
    flexDirection: 'row', gap: 10, 
    paddingHorizontal: SIZES.padding, paddingVertical: 12,
  },
  searchBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.bgCard, borderRadius: 10, paddingHorizontal: 12,
    borderWidth: 1, borderColor: COLORS.border,
  },
  searchInput: { flex: 1, color: COLORS.textPrimary, paddingVertical: 10 },
  tapButton: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.accent, paddingHorizontal: 16, borderRadius: 10,
  },
  tapButtonText: { color: COLORS.bgDark, fontWeight: '700', fontSize: SIZES.sm },

  // Products
  productList: { padding: SIZES.padding, paddingBottom: 160 },
  productRow: { justifyContent: 'space-between' },
  productCard: {
    width: '48%', backgroundColor: COLORS.bgCard, borderRadius: 12, padding: 14,
    marginBottom: 12, borderWidth: 2, borderColor: 'transparent',
  },
  productCardInCart: { borderColor: COLORS.accent, backgroundColor: 'rgba(197,164,78,0.1)' },
  productCode: { fontSize: 10, color: COLORS.textMuted, marginBottom: 4 },
  productName: { fontSize: SIZES.md, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 8, height: 40 },
  productFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  productPrice: { fontSize: SIZES.lg, fontWeight: '700', color: COLORS.accent },
  productStock: { fontSize: 10, color: COLORS.textMuted },
  productStockLow: { color: COLORS.danger },
  cartBadge: {
    position: 'absolute', top: 8, right: 8,
    backgroundColor: COLORS.accent, borderRadius: 12,
    minWidth: 24, height: 24, alignItems: 'center', justifyContent: 'center',
  },
  cartBadgeText: { color: COLORS.bgDark, fontWeight: '700', fontSize: 12 },
  emptyState: { alignItems: 'center', paddingTop: 60 },
  emptyText: { color: COLORS.textMuted, marginTop: 12 },

  // Cart bar
  cartBar: {
    position: 'absolute', bottom: 70, left: SIZES.padding, right: SIZES.padding,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.bgCard, borderRadius: 14, padding: 12,
    borderWidth: 1, borderColor: COLORS.border,
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 10, elevation: 10,
  },
  cartClearBtn: { padding: 8 },
  cartInfo: { flex: 1 },
  cartCount: { fontSize: SIZES.xs, color: COLORS.textMuted },
  cartTotal: { fontSize: SIZES.xl, fontWeight: '700', color: COLORS.accent },
  cartPayBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.accent, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10,
  },
  cartPayBtnDisabled: { opacity: 0.5 },
  cartPayText: { color: COLORS.bgDark, fontWeight: '700', fontSize: SIZES.md },

  // Member picker
  memberPicker: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: COLORS.bgCard, paddingHorizontal: SIZES.padding, paddingVertical: 14,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  memberName: { flex: 1, color: COLORS.textPrimary, fontWeight: '600' },
  memberSaldo: { color: COLORS.accent, fontWeight: '600' },
  memberPlaceholder: { flex: 1, color: COLORS.textMuted },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '70%', paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: SIZES.padding, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  modalTitle: { fontSize: SIZES.xl, fontWeight: '700', color: COLORS.textPrimary },
  anggotaItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: SIZES.padding, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  anggotaName: { fontSize: SIZES.md, fontWeight: '600', color: COLORS.textPrimary },
  anggotaPangkat: { fontSize: SIZES.sm, color: COLORS.textMuted, marginTop: 2 },
  anggotaSaldo: { fontSize: SIZES.md, fontWeight: '600', color: COLORS.accent },

  // TAP Modal
  tapModalContent: {
    backgroundColor: COLORS.bgCard, borderRadius: 24, margin: 24, padding: 28,
    alignItems: 'center',
  },
  tapIconWrap: {
    width: 100, height: 100, borderRadius: 50, backgroundColor: COLORS.accent,
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  tapTitle: { fontSize: SIZES.xl, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 4 },
  tapSubtitle: { fontSize: SIZES.md, color: COLORS.textMuted, marginBottom: 20 },
  tapSaldo: { fontSize: 28, fontWeight: '700', color: COLORS.accent, marginBottom: 20 },
  
  // NFC Scan Button
  nfcScanBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: COLORS.accent + '20', borderRadius: 16,
    paddingVertical: 16, paddingHorizontal: 32, marginBottom: 16,
    borderWidth: 2, borderColor: COLORS.accent,
  },
  nfcScanBtnActive: {
    backgroundColor: COLORS.danger + '20', borderColor: COLORS.danger,
  },
  nfcScanText: { fontSize: SIZES.lg, fontWeight: '700', color: COLORS.accent },
  nfcScanTextActive: { color: COLORS.danger },
  nfcScanningIndicator: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16,
  },
  nfcScanningText: { color: COLORS.accent, fontSize: SIZES.sm },
  
  // Divider
  tapDivider: {
    flexDirection: 'row', alignItems: 'center', width: '100%', marginVertical: 16,
  },
  tapDividerLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  tapDividerText: { paddingHorizontal: 12, color: COLORS.textMuted, fontSize: SIZES.sm },
  
  tapInputRow: { flexDirection: 'row', gap: 10, width: '100%', marginBottom: 16 },
  tapInput: {
    flex: 1, backgroundColor: COLORS.bgSecondary, borderRadius: 12, 
    paddingHorizontal: 16, paddingVertical: 12, color: COLORS.textPrimary,
    borderWidth: 1, borderColor: COLORS.border,
  },
  tapSearchBtn: {
    backgroundColor: COLORS.accent, borderRadius: 12, paddingHorizontal: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  tapCancelBtn: {
    backgroundColor: COLORS.bgSecondary, borderRadius: 12, paddingVertical: 14,
    paddingHorizontal: 40, marginTop: 12,
  },
  tapCancelText: { color: COLORS.textSecondary, fontWeight: '600' },
  tapSummary: {
    flexDirection: 'row', justifyContent: 'space-between', width: '100%',
    backgroundColor: COLORS.bgSecondary, padding: 14, borderRadius: 12, marginBottom: 20,
  },
  tapSummaryLabel: { color: COLORS.textMuted },
  tapSummaryValue: { color: COLORS.textPrimary, fontWeight: '700' },
  tapConfirmBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.accent, borderRadius: 14, paddingVertical: 16, paddingHorizontal: 32,
  },
  tapConfirmText: { color: COLORS.bgDark, fontWeight: '700', fontSize: SIZES.lg },
  tapInsufficientWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(239,68,68,0.15)', paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12,
  },
  tapInsufficientText: { color: COLORS.danger, fontWeight: '600' },
});
