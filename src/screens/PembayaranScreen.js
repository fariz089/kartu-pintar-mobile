import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, formatRupiah } from '../utils/theme';
import { anggotaAPI, keuanganAPI } from '../services/api';

export default function PembayaranScreen({ route, navigation }) {
  const [anggotaList, setAnggotaList] = useState([]);
  const [selected, setSelected] = useState(route.params?.selectedAnggota || null);
  const [nominal, setNominal] = useState('0');
  const [showPicker, setShowPicker] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAnggota();
  }, []);

  const loadAnggota = async () => {
    try {
      const res = await anggotaAPI.list();
      if (res.success) setAnggotaList(res.data.filter(a => a.status_kartu === 'Aktif'));
    } catch (e) { console.log(e); }
  };

  const handleNumpad = (val) => {
    if (val === 'C') { setNominal('0'); return; }
    if (val === '⌫') { setNominal(prev => prev.length > 1 ? prev.slice(0, -1) : '0'); return; }
    setNominal(prev => prev === '0' ? val : prev + val);
  };

  const handleQuickAmount = (amount) => setNominal(String(amount));

  const handleProcess = async () => {
    if (!selected) { Alert.alert('Error', 'Pilih anggota terlebih dahulu'); return; }
    const amount = parseInt(nominal);
    if (amount <= 0) { Alert.alert('Error', 'Nominal harus lebih dari 0'); return; }
    if (amount > selected.saldo) {
      Alert.alert('Saldo Tidak Cukup', `Saldo ${selected.nama}: ${formatRupiah(selected.saldo)}`);
      return;
    }

    Alert.alert('Konfirmasi', `Bayar ${formatRupiah(amount)} dari ${selected.nama}?`, [
      { text: 'Batal', style: 'cancel' },
      { text: 'Proses', onPress: async () => {
        setLoading(true);
        try {
          const res = await keuanganAPI.pembayaran(selected.kartu_id, amount);
          if (res.success) {
            Alert.alert('Berhasil', `Pembayaran ${formatRupiah(amount)}\nSisa saldo: ${formatRupiah(res.data.saldo_sesudah)}`);
            setNominal('0');
            setSelected(null);
            loadAnggota();
          } else {
            Alert.alert('Gagal', res.message);
          }
        } catch (e) {
          Alert.alert('Error', e.response?.data?.message || 'Gagal memproses');
        }
        setLoading(false);
      }},
    ]);
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollContent}>
        {/* Selected Anggota */}
        <TouchableOpacity style={styles.pickerBtn} onPress={() => setShowPicker(!showPicker)}>
          {selected ? (
            <View style={styles.selectedInfo}>
              <Text style={styles.selectedName}>{selected.nama}</Text>
              <Text style={styles.selectedSaldo}>Saldo: {formatRupiah(selected.saldo)}</Text>
            </View>
          ) : (
            <Text style={styles.pickerPlaceholder}>Pilih Anggota</Text>
          )}
          <Ionicons name="chevron-down" size={20} color={COLORS.textSecondary} />
        </TouchableOpacity>

        {showPicker && (
          <View style={styles.pickerList}>
            {anggotaList.map((a) => (
              <TouchableOpacity key={a.kartu_id} style={styles.pickerItem}
                onPress={() => { setSelected(a); setShowPicker(false); }}>
                <Text style={styles.pickerItemName}>{a.nama}</Text>
                <Text style={styles.pickerItemSaldo}>{formatRupiah(a.saldo)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Nominal Display */}
        <View style={styles.nominalDisplay}>
          <Text style={styles.nominalLabel}>Rp</Text>
          <Text style={styles.nominalValue}>{parseInt(nominal).toLocaleString('id-ID')}</Text>
        </View>

        {/* Numpad */}
        <View style={styles.numpad}>
          {['1','2','3','4','5','6','7','8','9','C','0','⌫'].map((key) => (
            <TouchableOpacity key={key} style={[styles.numKey, key === 'C' && styles.numKeyClear]}
              onPress={() => handleNumpad(key)}>
              <Text style={[styles.numKeyText, key === 'C' && styles.numKeyClearText]}>
                {key === '⌫' ? '⌫' : key}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Quick Amounts */}
        <View style={styles.quickRow}>
          {[5000, 10000, 15000, 25000, 50000].map((amt) => (
            <TouchableOpacity key={amt} style={styles.quickChip} onPress={() => handleQuickAmount(amt)}>
              <Text style={styles.quickText}>{formatRupiah(amt)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Process Button */}
      <TouchableOpacity style={[styles.processBtn, loading && { opacity: 0.6 }]}
        onPress={handleProcess} disabled={loading}>
        <Ionicons name="checkmark-circle" size={22} color={COLORS.bgDark} />
        <Text style={styles.processBtnText}>{loading ? 'Memproses...' : 'Proses Pembayaran'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgDark },
  scrollContent: { flex: 1, padding: SIZES.padding },
  pickerBtn: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: COLORS.bgCard, borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: COLORS.border,
  },
  pickerPlaceholder: { color: COLORS.textMuted, fontSize: SIZES.md },
  selectedInfo: {},
  selectedName: { color: COLORS.textPrimary, fontSize: SIZES.lg, fontWeight: '600' },
  selectedSaldo: { color: COLORS.accent, fontSize: SIZES.sm, marginTop: 2 },
  pickerList: {
    backgroundColor: COLORS.bgCard, borderRadius: 12, marginTop: 8,
    borderWidth: 1, borderColor: COLORS.border, maxHeight: 200,
  },
  pickerItem: {
    flexDirection: 'row', justifyContent: 'space-between', padding: 14,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  pickerItemName: { color: COLORS.textPrimary, fontSize: SIZES.md },
  pickerItemSaldo: { color: COLORS.accent, fontSize: SIZES.sm },
  nominalDisplay: {
    flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center',
    backgroundColor: COLORS.bgCard, borderRadius: 16, padding: 24, marginTop: 16,
    borderWidth: 1, borderColor: COLORS.border,
  },
  nominalLabel: { fontSize: SIZES.xl, color: COLORS.textSecondary, marginRight: 8 },
  nominalValue: { fontSize: 42, fontWeight: '800', color: COLORS.textPrimary },
  numpad: {
    flexDirection: 'row', flexWrap: 'wrap', marginTop: 16, gap: 8,
  },
  numKey: {
    width: '31.5%', backgroundColor: COLORS.bgCard, borderRadius: 12,
    paddingVertical: 16, alignItems: 'center', justifyContent: 'center',
  },
  numKeyClear: { backgroundColor: COLORS.primary },
  numKeyText: { fontSize: SIZES.xxl, fontWeight: '600', color: COLORS.textPrimary },
  numKeyClearText: { color: COLORS.danger },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  quickChip: {
    backgroundColor: COLORS.bgCard, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: COLORS.border,
  },
  quickText: { color: COLORS.accent, fontSize: SIZES.xs, fontWeight: '600' },
  processBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.accent, margin: SIZES.padding, padding: 16, borderRadius: 14,
  },
  processBtnText: { color: COLORS.bgDark, fontSize: SIZES.lg, fontWeight: '700' },
});
