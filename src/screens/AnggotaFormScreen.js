/**
 * AnggotaFormScreen.js — Tambah / edit anggota (admin).
 * mode: 'create' | 'edit'. Untuk edit, params.anggota / params.kartuId dikirim.
 *
 * Form ini fokus ke data identitas inti. Riwayat hidup lengkap tetap
 * dikelola lewat web (form-nya sangat panjang); di sini kita sediakan
 * field utama yang paling sering dipakai di lapangan.
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../utils/theme';
import { anggotaAPI, anggotaAdminAPI } from '../services/api';

const GOLDARAH = ['', 'A', 'B', 'AB', 'O'];
const STATUS = ['Aktif', 'Nonaktif', 'Hilang', 'Diblokir'];

function Field({ label, value, onChangeText, ...props }) {
  return (
    <View style={{ marginTop: 14 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput style={styles.input} value={value ?? ''} onChangeText={onChangeText}
        placeholderTextColor={COLORS.textMuted} {...props} />
    </View>
  );
}

export default function AnggotaFormScreen({ route, navigation }) {
  const mode = route.params?.mode || 'create';
  const isEdit = mode === 'edit';
  const kartuId = route.params?.kartuId || route.params?.anggota?.kartu_id;

  const [form, setForm] = useState({
    nrp: '', nama: '', pangkat: '', satuan: 'Poltekad', jabatan: '', jurusan: '',
    tempat_lahir: '', tanggal_lahir: '', golongan_darah: '', agama: '',
    alamat: '', no_telepon: '', nfc_uid: '', mili_id: '', qr_data: '',
    saldo: '0', status_kartu: 'Aktif',
  });
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    navigation.setOptions({ title: isEdit ? 'Edit Anggota' : 'Tambah Anggota' });
    if (isEdit && kartuId) {
      (async () => {
        try {
          const res = await anggotaAPI.detail(kartuId);
          if (res.success) {
            const a = res.data;
            setForm({
              nrp: a.nrp || '', nama: a.nama || '', pangkat: a.pangkat || '',
              satuan: a.satuan || 'Poltekad', jabatan: a.jabatan || '', jurusan: a.jurusan || '',
              tempat_lahir: a.tempat_lahir || '', tanggal_lahir: a.tanggal_lahir || '',
              golongan_darah: a.golongan_darah || '', agama: a.agama || '',
              alamat: a.alamat || '', no_telepon: a.no_telepon || '',
              nfc_uid: a.nfc_uid || '', mili_id: a.mili_id || '', qr_data: a.qr_data || '',
              saldo: String(a.saldo ?? 0), status_kartu: a.status_kartu || 'Aktif',
            });
          }
        } catch (e) {
          Alert.alert('Error', 'Gagal memuat data anggota');
        }
        setLoading(false);
      })();
    }
  }, []);

  const save = async () => {
    if (!form.nrp.trim() || !form.nama.trim()) {
      Alert.alert('Error', 'NRP dan Nama wajib diisi');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, saldo: parseInt(form.saldo || '0', 10) || 0 };
      let res;
      if (isEdit) res = await anggotaAdminAPI.update(kartuId, payload);
      else res = await anggotaAdminAPI.create(payload);
      if (res.success) {
        Alert.alert('Berhasil', res.message, [{ text: 'OK', onPress: () => navigation.goBack() }]);
      } else {
        Alert.alert('Gagal', res.message);
      }
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Gagal menyimpan');
    }
    setSaving(false);
  };

  const confirmDelete = () => {
    Alert.alert(
      'Hapus Anggota',
      `Hapus anggota "${form.nama}" beserta seluruh transaksi & riwayat lokasinya? Tindakan ini tidak bisa dibatalkan.`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus', style: 'destructive', onPress: async () => {
            try {
              const res = await anggotaAdminAPI.remove(kartuId);
              if (res.success) {
                Alert.alert('Terhapus', res.message, [
                  { text: 'OK', onPress: () => navigation.navigate('AnggotaList') },
                ]);
              } else {
                Alert.alert('Gagal', res.message);
              }
            } catch (e) {
              Alert.alert('Error', e.response?.data?.message || 'Gagal menghapus');
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return <View style={styles.container}><Text style={styles.loading}>Memuat...</Text></View>;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: SIZES.padding }}>
      <Text style={styles.sectionTitle}>IDENTITAS</Text>
      <Field label="NRP *" value={form.nrp} onChangeText={set('nrp')} autoCapitalize="none" />
      <Field label="Nama *" value={form.nama} onChangeText={set('nama')} />
      <Field label="Pangkat" value={form.pangkat} onChangeText={set('pangkat')} />
      <Field label="Satuan" value={form.satuan} onChangeText={set('satuan')} />
      <Field label="Jabatan" value={form.jabatan} onChangeText={set('jabatan')} />
      <Field label="Jurusan" value={form.jurusan} onChangeText={set('jurusan')} />
      <Field label="Tempat Lahir" value={form.tempat_lahir} onChangeText={set('tempat_lahir')} />
      <Field label="Tanggal Lahir (YYYY-MM-DD)" value={form.tanggal_lahir} onChangeText={set('tanggal_lahir')}
        placeholder="1990-01-31" />

      <Text style={styles.label}>Golongan Darah</Text>
      <View style={styles.chipRow}>
        {GOLDARAH.map((g) => (
          <TouchableOpacity key={g || 'none'}
            style={[styles.chip, form.golongan_darah === g && styles.chipActive]}
            onPress={() => set('golongan_darah')(g)}>
            <Text style={[styles.chipText, form.golongan_darah === g && styles.chipTextActive]}>{g || '—'}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Field label="Agama" value={form.agama} onChangeText={set('agama')} />
      <Field label="Alamat" value={form.alamat} onChangeText={set('alamat')} multiline />
      <Field label="No. Telepon" value={form.no_telepon} onChangeText={set('no_telepon')} keyboardType="phone-pad" />

      <Text style={[styles.sectionTitle, { marginTop: 24 }]}>KARTU</Text>
      <Field label="NFC UID" value={form.nfc_uid} onChangeText={set('nfc_uid')} autoCapitalize="none" />
      <Field label="MiLi ID / URL" value={form.mili_id} onChangeText={set('mili_id')} autoCapitalize="none" />
      <Field label="QR Data (kosong = pakai Kartu ID)" value={form.qr_data} onChangeText={set('qr_data')} autoCapitalize="none" />
      {!isEdit && <Field label="Saldo Awal" value={form.saldo} onChangeText={set('saldo')} keyboardType="number-pad" />}

      {isEdit && (
        <>
          <Text style={styles.label}>Status Kartu</Text>
          <View style={styles.chipRow}>
            {STATUS.map((s) => (
              <TouchableOpacity key={s}
                style={[styles.chip, form.status_kartu === s && styles.chipActive]}
                onPress={() => set('status_kartu')(s)}>
                <Text style={[styles.chipText, form.status_kartu === s && styles.chipTextActive]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={saving}>
        <Ionicons name="save" size={18} color={COLORS.bgDark} />
        <Text style={styles.saveBtnText}>{saving ? 'Menyimpan...' : 'Simpan'}</Text>
      </TouchableOpacity>

      {isEdit && (
        <TouchableOpacity style={styles.deleteBtn} onPress={confirmDelete}>
          <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
          <Text style={styles.deleteBtnText}>Hapus Anggota</Text>
        </TouchableOpacity>
      )}
      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgDark },
  loading: { color: COLORS.textMuted, textAlign: 'center', marginTop: 40 },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted, letterSpacing: 2 },
  label: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 6, marginTop: 14 },
  input: {
    backgroundColor: COLORS.bgInput, borderRadius: 8, padding: 12,
    color: COLORS.textPrimary, fontSize: 14, borderWidth: 1, borderColor: COLORS.border,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8,
    backgroundColor: COLORS.bgInput, borderWidth: 1, borderColor: COLORS.border,
  },
  chipActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  chipText: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: COLORS.bgDark },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.accent, borderRadius: 10, padding: 14, marginTop: 24,
  },
  saveBtnText: { fontWeight: '700', color: COLORS.bgDark, fontSize: 15 },
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.bgCard, borderRadius: 10, padding: 14, marginTop: 12,
    borderWidth: 1, borderColor: COLORS.danger + '44',
  },
  deleteBtnText: { fontWeight: '600', color: COLORS.danger, fontSize: 14 },
});
