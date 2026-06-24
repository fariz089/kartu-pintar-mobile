/**
 * HutangListScreen.js — Daftar anggota berhutang & pelunasan (admin).
 */
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl,
  Alert, Modal, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, SIZES, formatRupiah } from '../utils/theme';
import { hutangAPI, API_BASE } from '../services/api';

export default function HutangListScreen() {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState(null);
  const [nominal, setNominal] = useState('');
  const [sumber, setSumber] = useState('Tunai');
  const [paying, setPaying] = useState(false);

  const load = async () => {
    try {
      const res = await hutangAPI.list();
      if (res.success) {
        setData(res.data);
        setTotal(res.total_hutang || 0);
      }
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Gagal memuat data hutang');
    }
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const openPay = (item) => {
    setSelected(item);
    setNominal(String(item.hutang));
    setSumber('Tunai');
  };

  const doPay = async () => {
    const n = parseInt(nominal || '0', 10);
    if (!n || n <= 0) { Alert.alert('Error', 'Nominal harus lebih dari 0'); return; }
    setPaying(true);
    try {
      const res = await hutangAPI.bayar(selected.kartu_id, n, sumber);
      if (res.success) {
        Alert.alert('Berhasil', res.message);
        setSelected(null);
        load();
      } else {
        Alert.alert('Gagal', res.message);
      }
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Gagal memproses pembayaran');
    }
    setPaying(false);
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={{ flex: 1 }}>
        <Text style={styles.nama}>{item.nama}</Text>
        <Text style={styles.pangkat}>{item.pangkat} · {item.kartu_id}</Text>
        <Text style={styles.saldo}>Saldo: {formatRupiah(item.saldo)}</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={styles.hutangLabel}>HUTANG</Text>
        <Text style={styles.hutangValue}>{formatRupiah(item.hutang)}</Text>
        <TouchableOpacity style={styles.bayarBtn} onPress={() => openPay(item)}>
          <Text style={styles.bayarBtnText}>Bayar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.summary}>
        <View>
          <Text style={styles.summaryLabel}>TOTAL HUTANG</Text>
          <Text style={styles.summaryValue}>{formatRupiah(total)}</Text>
        </View>
        <View style={styles.summaryCount}>
          <Text style={styles.summaryCountNum}>{data.length}</Text>
          <Text style={styles.summaryCountLabel}>anggota</Text>
        </View>
      </View>

      <FlatList data={data} keyExtractor={(i) => i.kartu_id} renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />}
        contentContainerStyle={{ padding: SIZES.padding }}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Ionicons name="checkmark-circle-outline" size={40} color={COLORS.success} />
            <Text style={styles.empty}>Tidak ada anggota yang berhutang</Text>
          </View>
        } />

      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Bayar Hutang</Text>
            {selected && (
              <>
                <Text style={styles.modalSub}>{selected.nama} · {selected.kartu_id}</Text>
                <Text style={styles.modalHutang}>Hutang saat ini: {formatRupiah(selected.hutang)}</Text>

                <Text style={styles.label}>Nominal Bayar</Text>
                <TextInput style={styles.input} value={nominal} onChangeText={setNominal}
                  keyboardType="number-pad" placeholder="0" placeholderTextColor={COLORS.textMuted} />

                <Text style={styles.label}>Sumber Pembayaran</Text>
                <View style={styles.sumberRow}>
                  {['Tunai', 'Saldo'].map((s) => (
                    <TouchableOpacity key={s}
                      style={[styles.sumberChip, sumber === s && styles.sumberChipActive]}
                      onPress={() => setSumber(s)}>
                      <Ionicons name={s === 'Tunai' ? 'cash-outline' : 'wallet-outline'} size={16}
                        color={sumber === s ? COLORS.bgDark : COLORS.textSecondary} />
                      <Text style={[styles.sumberChipText, sumber === s && styles.sumberChipTextActive]}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {sumber === 'Saldo' && (
                  <Text style={styles.hint}>Akan dipotong dari saldo: {formatRupiah(selected.saldo)}</Text>
                )}

                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setSelected(null)}>
                    <Text style={styles.cancelBtnText}>Batal</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.confirmBtn} onPress={doPay} disabled={paying}>
                    <Text style={styles.confirmBtnText}>{paying ? '...' : 'Bayar'}</Text>
                  </TouchableOpacity>
                </View>
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
  summary: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    margin: SIZES.padding, marginBottom: 4, padding: 18, backgroundColor: COLORS.bgCard,
    borderRadius: 16, borderWidth: 1, borderColor: COLORS.danger + '44',
  },
  summaryLabel: { fontSize: 10, color: COLORS.textMuted, letterSpacing: 2 },
  summaryValue: { fontSize: 24, fontWeight: '800', color: COLORS.danger, marginTop: 2 },
  summaryCount: { alignItems: 'center' },
  summaryCountNum: { fontSize: 28, fontWeight: '800', color: COLORS.textPrimary },
  summaryCountLabel: { fontSize: 11, color: COLORS.textMuted },
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bgCard,
    borderRadius: 12, padding: 14, marginBottom: 8,
  },
  nama: { fontSize: SIZES.md, fontWeight: '600', color: COLORS.textPrimary },
  pangkat: { fontSize: SIZES.sm, color: COLORS.textSecondary, marginTop: 2 },
  saldo: { fontSize: SIZES.sm, color: COLORS.textMuted, marginTop: 2 },
  hutangLabel: { fontSize: 9, color: COLORS.textMuted, letterSpacing: 1 },
  hutangValue: { fontSize: 15, fontWeight: '700', color: COLORS.danger, marginTop: 1 },
  bayarBtn: {
    marginTop: 6, backgroundColor: COLORS.accent, paddingHorizontal: 18, paddingVertical: 6,
    borderRadius: 8,
  },
  bayarBtnText: { color: COLORS.bgDark, fontWeight: '700', fontSize: 12 },
  emptyBox: { alignItems: 'center', marginTop: 50, gap: 10 },
  empty: { color: COLORS.textMuted, textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: '#000a', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: COLORS.bgCard, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, paddingBottom: 34,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  modalSub: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },
  modalHutang: { fontSize: 14, color: COLORS.danger, fontWeight: '600', marginTop: 8 },
  label: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 6, marginTop: 16 },
  input: {
    backgroundColor: COLORS.bgInput, borderRadius: 8, padding: 12,
    color: COLORS.textPrimary, fontSize: 16, borderWidth: 1, borderColor: COLORS.border,
  },
  sumberRow: { flexDirection: 'row', gap: 10 },
  sumberChip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10, borderRadius: 8, backgroundColor: COLORS.bgInput,
    borderWidth: 1, borderColor: COLORS.border,
  },
  sumberChipActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  sumberChipText: { color: COLORS.textSecondary, fontWeight: '600', fontSize: 13 },
  sumberChipTextActive: { color: COLORS.bgDark },
  hint: { fontSize: 11, color: COLORS.textMuted, marginTop: 6 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  cancelBtn: {
    flex: 1, padding: 14, borderRadius: 10, alignItems: 'center',
    backgroundColor: COLORS.bgInput,
  },
  cancelBtnText: { color: COLORS.textSecondary, fontWeight: '600' },
  confirmBtn: {
    flex: 2, padding: 14, borderRadius: 10, alignItems: 'center',
    backgroundColor: COLORS.accent,
  },
  confirmBtnText: { color: COLORS.bgDark, fontWeight: '700' },
});
