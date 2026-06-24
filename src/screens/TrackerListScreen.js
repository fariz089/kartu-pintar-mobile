/**
 * TrackerListScreen.js — Manajemen Find My Tracker (admin).
 * Daftar, tambah, edit, hapus tracker Google Find Hub yang dipetakan ke anggota.
 */
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl,
  Alert, Modal, TextInput, Switch, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, SIZES, formatDate } from '../utils/theme';
import { trackerAPI } from '../services/api';

export default function TrackerListScreen() {
  const [trackers, setTrackers] = useState([]);
  const [anggotaList, setAnggotaList] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState(null); // null | {} (new) | tracker obj
  const [form, setForm] = useState({ canonical_id: '', anggota_id: null, nama_tracker: '', is_active: true });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const res = await trackerAPI.list();
      if (res.success) {
        setTrackers(res.data);
        setAnggotaList(res.anggota_list || []);
      }
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Gagal memuat tracker');
    }
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const openNew = () => {
    setForm({ canonical_id: '', anggota_id: anggotaList[0]?.id || null, nama_tracker: '', is_active: true });
    setEditing({});
  };

  const openEdit = (t) => {
    setForm({
      canonical_id: t.canonical_id, anggota_id: t.anggota_id,
      nama_tracker: t.nama_tracker || '', is_active: t.is_active,
    });
    setEditing(t);
  };

  const save = async () => {
    if (!form.canonical_id.trim() || !form.anggota_id) {
      Alert.alert('Error', 'Canonical ID dan Anggota wajib diisi');
      return;
    }
    setSaving(true);
    try {
      let res;
      if (editing && editing.id) res = await trackerAPI.update(editing.id, form);
      else res = await trackerAPI.add(form);
      if (res.success) {
        setEditing(null);
        load();
      } else {
        Alert.alert('Gagal', res.message);
      }
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Gagal menyimpan');
    }
    setSaving(false);
  };

  const doDelete = (t) => {
    Alert.alert('Hapus Tracker', `Hapus tracker "${t.nama_tracker}"?`, [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus', style: 'destructive', onPress: async () => {
          try {
            const res = await trackerAPI.remove(t.id);
            if (res.success) load();
            else Alert.alert('Gagal', res.message);
          } catch (e) {
            Alert.alert('Error', e.response?.data?.message || 'Gagal');
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.statusDot, { backgroundColor: item.is_active ? COLORS.success : COLORS.textMuted }]} />
        <Text style={styles.trackerName}>{item.nama_tracker || 'Tracker'}</Text>
        <TouchableOpacity onPress={() => openEdit(item)}>
          <Ionicons name="create-outline" size={18} color={COLORS.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => doDelete(item)} style={{ marginLeft: 12 }}>
          <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
        </TouchableOpacity>
      </View>
      <Text style={styles.canonical} numberOfLines={1}>ID: {item.canonical_id}</Text>
      <Text style={styles.anggota}>{item.anggota_nama || '—'} ({item.anggota_kartu_id || '-'})</Text>
      {item.last_seen && (
        <Text style={styles.lastSeen}>Terakhir: {formatDate(item.last_seen)} · {item.last_address || 'lokasi tidak diketahui'}</Text>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.addBtn} onPress={openNew}>
        <Ionicons name="add-circle" size={18} color={COLORS.bgDark} />
        <Text style={styles.addBtnText}>Tambah Tracker</Text>
      </TouchableOpacity>

      <FlatList data={trackers} keyExtractor={(i) => i.id.toString()} renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />}
        contentContainerStyle={{ padding: SIZES.padding, paddingTop: 4 }}
        ListEmptyComponent={<Text style={styles.empty}>Belum ada tracker terdaftar</Text>} />

      <Modal visible={!!editing} transparent animationType="slide" onRequestClose={() => setEditing(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editing?.id ? 'Edit Tracker' : 'Tambah Tracker'}</Text>

            <Text style={styles.label}>Canonical ID (Find Hub)</Text>
            <TextInput style={styles.input} value={form.canonical_id}
              onChangeText={(v) => setForm((f) => ({ ...f, canonical_id: v }))}
              autoCapitalize="none" placeholder="canonic_device_id" placeholderTextColor={COLORS.textMuted} />

            <Text style={styles.label}>Nama Tracker</Text>
            <TextInput style={styles.input} value={form.nama_tracker}
              onChangeText={(v) => setForm((f) => ({ ...f, nama_tracker: v }))}
              placeholder="MiCard Pro - Budi" placeholderTextColor={COLORS.textMuted} />

            <Text style={styles.label}>Anggota</Text>
            <ScrollView style={styles.anggotaPicker} nestedScrollEnabled>
              {anggotaList.map((a) => (
                <TouchableOpacity key={a.id}
                  style={[styles.anggotaItem, form.anggota_id === a.id && styles.anggotaItemActive]}
                  onPress={() => setForm((f) => ({ ...f, anggota_id: a.id }))}>
                  <Text style={styles.anggotaItemText}>{a.nama} · {a.pangkat}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {editing?.id && (
              <View style={styles.switchRow}>
                <Text style={styles.label}>Aktif</Text>
                <Switch value={form.is_active}
                  onValueChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
                  trackColor={{ true: COLORS.accent, false: COLORS.border }} thumbColor={COLORS.textPrimary} />
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditing(null)}>
                <Text style={styles.cancelBtnText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={save} disabled={saving}>
                <Text style={styles.confirmBtnText}>{saving ? '...' : 'Simpan'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgDark },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: COLORS.accent, margin: SIZES.padding, marginBottom: 4,
    padding: 12, borderRadius: 10,
  },
  addBtnText: { color: COLORS.bgDark, fontWeight: '700', fontSize: 14 },
  card: { backgroundColor: COLORS.bgCard, borderRadius: 12, padding: 14, marginBottom: 8 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  trackerName: { flex: 1, fontSize: SIZES.md, fontWeight: '600', color: COLORS.textPrimary },
  canonical: { fontSize: 11, color: COLORS.textMuted, marginTop: 6, fontFamily: 'monospace' },
  anggota: { fontSize: SIZES.sm, color: COLORS.accent, marginTop: 4 },
  lastSeen: { fontSize: 11, color: COLORS.textSecondary, marginTop: 4 },
  empty: { color: COLORS.textMuted, textAlign: 'center', marginTop: 40 },
  modalOverlay: { flex: 1, backgroundColor: '#000a', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: COLORS.bgCard, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, paddingBottom: 34,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  label: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 6, marginTop: 14 },
  input: {
    backgroundColor: COLORS.bgInput, borderRadius: 8, padding: 12,
    color: COLORS.textPrimary, fontSize: 14, borderWidth: 1, borderColor: COLORS.border,
  },
  anggotaPicker: {
    maxHeight: 160, backgroundColor: COLORS.bgInput, borderRadius: 8,
    borderWidth: 1, borderColor: COLORS.border,
  },
  anggotaItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  anggotaItemActive: { backgroundColor: COLORS.accent + '22' },
  anggotaItemText: { color: COLORS.textPrimary, fontSize: 13 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 10, alignItems: 'center', backgroundColor: COLORS.bgInput },
  cancelBtnText: { color: COLORS.textSecondary, fontWeight: '600' },
  confirmBtn: { flex: 2, padding: 14, borderRadius: 10, alignItems: 'center', backgroundColor: COLORS.accent },
  confirmBtnText: { color: COLORS.bgDark, fontWeight: '700' },
});
