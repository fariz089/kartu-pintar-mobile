import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, Alert, 
  ScrollView, FlatList, Modal, TextInput, ActivityIndicator 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, formatRupiah } from '../utils/theme';
import { produkAPI, kategoriAPI, keuanganAPI, anggotaAPI } from '../services/api';

export default function POSScreen({ route, navigation }) {
  const [kategoriList, setKategoriList] = useState([]);
  const [produkList, setProdukList] = useState([]);
  const [selectedKategori, setSelectedKategori] = useState(null);
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
  const [tapStep, setTapStep] = useState(1); // 1: input, 2: confirm, 3: success
  const [tapLoading, setTapLoading] = useState(false);
  const [tapResult, setTapResult] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

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

  // Filter products
  const filteredProducts = produkList.filter(p => {
    const matchKategori = !selectedKategori || p.kategori_id === selectedKategori;
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
  };

  const handleTapSearch = async () => {
    if (!tapInput.trim()) return;
    setTapLoading(true);
    try {
      const res = await keuanganAPI.pembayaranTap(tapInput, [], 'NFC');
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
          style={[styles.categoryChip, !selectedKategori && styles.categoryChipActive]}
          onPress={() => setSelectedKategori(null)}
        >
          <Ionicons name="grid" size={16} color={!selectedKategori ? COLORS.bgDark : COLORS.textSecondary} />
          <Text style={[styles.categoryText, !selectedKategori && styles.categoryTextActive]}>Semua</Text>
        </TouchableOpacity>
        {kategoriList.map(k => (
          <TouchableOpacity 
            key={k.id}
            style={[styles.categoryChip, selectedKategori === k.id && styles.categoryChipActive]}
            onPress={() => setSelectedKategori(k.id)}
          >
            <Text style={[styles.categoryText, selectedKategori === k.id && styles.categoryTextActive]}>
              {k.nama}
            </Text>
          </TouchableOpacity>
        ))}
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
        renderItem={renderProduct}
        keyExtractor={item => String(item.id)}
        numColumns={2}
        columnWrapperStyle={styles.productRow}
        contentContainerStyle={styles.productList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="cube-outline" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>Tidak ada produk</Text>
          </View>
        }
      />

      {/* Cart Summary */}
      {cart.length > 0 && (
        <View style={styles.cartBar}>
          <TouchableOpacity style={styles.cartClearBtn} onPress={clearCart}>
            <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
          </TouchableOpacity>
          <View style={styles.cartInfo}>
            <Text style={styles.cartCount}>{cartCount} item</Text>
            <Text style={styles.cartTotal}>{formatRupiah(cartTotal)}</Text>
          </View>
          <TouchableOpacity 
            style={[styles.cartPayBtn, !selectedAnggota && styles.cartPayBtnDisabled]} 
            onPress={handleManualPayment}
          >
            <Ionicons name="checkmark-circle" size={20} color={COLORS.bgDark} />
            <Text style={styles.cartPayText}>Bayar</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Member Picker */}
      <TouchableOpacity style={styles.memberPicker} onPress={() => setShowAnggotaPicker(true)}>
        {selectedAnggota ? (
          <>
            <Ionicons name="person" size={18} color={COLORS.accent} />
            <Text style={styles.memberName}>{selectedAnggota.nama}</Text>
            <Text style={styles.memberSaldo}>{formatRupiah(selectedAnggota.saldo)}</Text>
          </>
        ) : (
          <>
            <Ionicons name="person-add" size={18} color={COLORS.textMuted} />
            <Text style={styles.memberPlaceholder}>Pilih Anggota</Text>
          </>
        )}
        <Ionicons name="chevron-down" size={18} color={COLORS.textSecondary} />
      </TouchableOpacity>

      {/* Anggota Picker Modal */}
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

      {/* TAP Payment Modal */}
      <Modal visible={showTapModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.tapModalContent}>
            {tapStep === 1 && (
              <>
                <View style={styles.tapIconWrap}>
                  <Ionicons name="card" size={48} color={COLORS.bgDark} />
                </View>
                <Text style={styles.tapTitle}>Tempelkan Kartu</Text>
                <Text style={styles.tapSubtitle}>Scan NFC atau masukkan ID kartu</Text>
                <View style={styles.tapInputRow}>
                  <TextInput
                    style={styles.tapInput}
                    placeholder="ID Kartu / NFC UID..."
                    placeholderTextColor={COLORS.textMuted}
                    value={tapInput}
                    onChangeText={setTapInput}
                    onSubmitEditing={handleTapSearch}
                    autoFocus
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
    flexGrow: 0, paddingHorizontal: SIZES.padding, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  categoryChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, marginRight: 8,
    backgroundColor: COLORS.bgCard, borderRadius: 20,
    borderWidth: 1, borderColor: COLORS.border,
  },
  categoryChipActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  categoryText: { color: COLORS.textSecondary, fontSize: SIZES.sm },
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
