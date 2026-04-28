/**
 * AnggotaDetailScreen.js
 * Layar detail anggota untuk role admin & pam.
 * Menampilkan info lengkap + riwayat hidup (sama seperti yang ada di ProfileScreen
 * untuk pemilik kartu, tapi untuk anggota lain).
 *
 * Diakses dari AnggotaListScreen → tap salah satu anggota.
 * Tombol aksi: Lacak Lokasi, Riwayat Lokasi, Scan Lagi (kembali).
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, formatRupiah } from '../utils/theme';
import { anggotaAPI, authAPI } from '../services/api';

export default function AnggotaDetailScreen({ route, navigation }) {
  // route.params bisa dikirim dengan { anggota: <obj> } atau { kartuId }
  const initialAnggota = route.params?.anggota || null;
  const kartuId = route.params?.kartuId || initialAnggota?.kartu_id;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [anggota, setAnggota] = useState(initialAnggota);
  const [riwayat, setRiwayat] = useState(null);
  const [showRiwayat, setShowRiwayat] = useState(true); // default terbuka untuk admin/pam
  const [allowed, setAllowed] = useState(true);

  const loadData = useCallback(async () => {
    try {
      // Cek role user dulu
      const me = await authAPI.getStoredUser();
      const role = me?.role;
      if (!['admin', 'pam'].includes(role)) {
        // Cuma boleh lihat dirinya sendiri
        if (me?.anggota?.kartu_id !== kartuId) {
          setAllowed(false);
          setLoading(false);
          return;
        }
      }

      // Ambil detail anggota lengkap
      const detailRes = await anggotaAPI.detail(kartuId);
      if (detailRes.success) {
        setAnggota(detailRes.data);
      }
      // Ambil riwayat hidup
      const rhRes = await anggotaAPI.getRiwayatHidup(kartuId);
      if (rhRes.success) {
        setRiwayat(rhRes.data);
      }
    } catch (e) {
      const status = e.response?.status;
      if (status === 403) {
        setAllowed(false);
      } else {
        Alert.alert('Error', e.response?.data?.message || 'Gagal memuat data anggota');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [kartuId]);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const InfoRow = ({ icon, label, value }) => (
    <View style={styles.infoRow}>
      <View style={styles.infoLeft}>
        {icon && <Ionicons name={icon} size={16} color={COLORS.accent} />}
        <Text style={styles.infoLabel}>{label}</Text>
      </View>
      <Text style={styles.infoValue}>{value || '-'}</Text>
    </View>
  );

  const RHTable = ({ title, rows, cols }) => {
    if (!rows || rows.length === 0) return null;
    return (
      <View style={{ marginBottom: 12 }}>
        <Text style={styles.rhSubTitle}>{title}</Text>
        {rows.map((row, i) => (
          <View key={i} style={styles.rhRow}>
            <Text style={styles.rhIndex}>{i + 1}.</Text>
            <View style={{ flex: 1 }}>
              {cols.map(({ key, label }) => row[key] ? (
                <Text key={key} style={styles.rhItem}>
                  <Text style={styles.rhItemLabel}>{label}: </Text>{row[key]}
                </Text>
              ) : null)}
            </View>
          </View>
        ))}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.accent} />
        <Text style={styles.loadingText}>Memuat data anggota...</Text>
      </View>
    );
  }

  if (!allowed) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="lock-closed" size={48} color={COLORS.danger} />
        <Text style={[styles.loadingText, { color: COLORS.danger, marginTop: 12 }]}>
          Anda tidak memiliki akses untuk melihat data anggota lain
        </Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Kembali</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!anggota) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Data anggota tidak ditemukan</Text>
      </View>
    );
  }

  const statusColor = anggota.status_kartu === 'Aktif' ? COLORS.success :
    anggota.status_kartu === 'Hilang' ? COLORS.danger : COLORS.warning;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />}
    >
      {/* Card Header */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={40} color={COLORS.accent} />
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.nama}>{anggota.nama}</Text>
            <Text style={styles.pangkat}>{anggota.pangkat}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '22', borderColor: statusColor }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>{anggota.status_kartu}</Text>
            </View>
          </View>
        </View>

        <View style={styles.kartuIdRow}>
          <Text style={styles.kartuIdLabel}>KARTU ID</Text>
          <Text style={styles.kartuIdValue}>{anggota.kartu_id || anggota.id}</Text>
        </View>
      </View>

      {/* Saldo */}
      <View style={styles.saldoCard}>
        <Ionicons name="wallet" size={24} color={COLORS.accent} />
        <View style={styles.saldoInfo}>
          <Text style={styles.saldoLabel}>SALDO</Text>
          <Text style={styles.saldoValue}>{formatRupiah(anggota.saldo)}</Text>
        </View>
      </View>

      {/* IDENTITAS */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>IDENTITAS</Text>
        <InfoRow icon="id-card" label="NRP" value={anggota.nrp} />
        <InfoRow icon="business" label="Satuan" value={anggota.satuan} />
        <InfoRow icon="briefcase" label="Jabatan" value={anggota.jabatan} />
        <InfoRow icon="school" label="Jurusan" value={anggota.jurusan} />
      </View>

      {/* DATA PRIBADI */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>DATA PRIBADI</Text>
        <InfoRow icon="location" label="Tempat Lahir" value={anggota.tempat_lahir} />
        <InfoRow icon="calendar" label="Tanggal Lahir" value={anggota.tanggal_lahir} />
        <InfoRow icon="water" label="Gol. Darah" value={anggota.golongan_darah} />
        <InfoRow icon="heart" label="Agama" value={anggota.agama} />
        <InfoRow icon="home" label="Alamat" value={anggota.alamat} />
        <InfoRow icon="call" label="No. Telepon" value={anggota.no_telepon} />
      </View>

      {/* KARTU */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>KARTU</Text>
        <InfoRow icon="wifi" label="NFC UID" value={anggota.nfc_uid} />
        <InfoRow icon="qr-code" label="QR Data" value={anggota.qr_data} />
        {anggota.mili_id && <InfoRow icon="card" label="MiLi ID" value={anggota.mili_id} />}
      </View>

      {/* RIWAYAT HIDUP — collapsible */}
      {riwayat && (
        <View style={styles.section}>
          <TouchableOpacity style={styles.rhHeader} onPress={() => setShowRiwayat(!showRiwayat)}>
            <Text style={styles.sectionTitle}>RIWAYAT HIDUP</Text>
            <Ionicons name={showRiwayat ? 'chevron-up' : 'chevron-down'} size={18} color={COLORS.textMuted} />
          </TouchableOpacity>

          {showRiwayat && (
            <View>
              {/* Data tambahan kepangkatan */}
              {(riwayat.korp || riwayat.sumber_ba || riwayat.tmt_tni || riwayat.suku_bangsa) && (
                <View style={{ marginBottom: 10 }}>
                  {riwayat.korp && <InfoRow label="Korp" value={riwayat.korp} />}
                  {riwayat.sumber_ba && <InfoRow label="Sumber BA" value={riwayat.sumber_ba} />}
                  {riwayat.tmt_tni && <InfoRow label="TMT TNI" value={riwayat.tmt_tni} />}
                  {riwayat.tmt_jabatan && <InfoRow label="TMT Jabatan" value={riwayat.tmt_jabatan} />}
                  {riwayat.suku_bangsa && <InfoRow label="Suku Bangsa" value={riwayat.suku_bangsa} />}
                </View>
              )}

              <RHTable
                title="Pendidikan Umum"
                rows={riwayat.riwayat_pendidikan_umum}
                cols={[{key:'jenis',label:'Jenis'},{key:'tahun',label:'Thn'},{key:'nama',label:'Sekolah'},{key:'prestasi',label:'Prestasi'}]}
              />
              <RHTable
                title="Pendidikan Militer"
                rows={riwayat.riwayat_pendidikan_militer}
                cols={[{key:'jenis',label:'Dikma'},{key:'tahun',label:'Thn'},{key:'prestasi',label:'Prestasi'}]}
              />
              <RHTable
                title="Riwayat Kepangkatan"
                rows={riwayat.riwayat_kepangkatan}
                cols={[{key:'pangkat',label:'Pangkat'},{key:'tmt',label:'TMT'},{key:'nomor_kep',label:'No. Kep'}]}
              />
              <RHTable
                title="Riwayat Jabatan"
                rows={riwayat.riwayat_jabatan}
                cols={[{key:'jabatan',label:'Jabatan'},{key:'tmt',label:'TMT'}]}
              />
              <RHTable
                title="Penugasan Operasi"
                rows={riwayat.riwayat_penugasan}
                cols={[{key:'nama_operasi',label:'Operasi'},{key:'tahun',label:'Thn'},{key:'prestasi',label:'Prestasi'}]}
              />
              <RHTable
                title="Penugasan Luar Negeri"
                rows={riwayat.penugasan_luar_negeri}
                cols={[{key:'macam_tugas',label:'Tugas'},{key:'tahun',label:'Thn'},{key:'negara',label:'Negara'}]}
              />
              <RHTable
                title="Tanda Jasa"
                rows={riwayat.tanda_jasa}
                cols={[{key:'nama',label:'Tanda Kehormatan'}]}
              />
              <RHTable
                title="Kemampuan Bahasa"
                rows={riwayat.kemampuan_bahasa}
                cols={[{key:'bahasa',label:'Bahasa'},{key:'tingkat',label:'Tingkat'}]}
              />
              <RHTable
                title="Prestasi"
                rows={riwayat.riwayat_prestasi}
                cols={[{key:'kegiatan',label:'Kegiatan'},{key:'tahun',label:'Thn'},{key:'tempat',label:'Tempat'}]}
              />

              {/* Keluarga */}
              {(riwayat.status_pernikahan || riwayat.nama_pasangan || riwayat.nama_ayah) && (
                <View>
                  <Text style={styles.rhSubTitle}>Data Keluarga</Text>
                  {riwayat.status_pernikahan && <InfoRow label="Status" value={riwayat.status_pernikahan} />}
                  {riwayat.nama_pasangan && <InfoRow label="Pasangan" value={riwayat.nama_pasangan} />}
                  {riwayat.jml_anak > 0 && <InfoRow label="Jumlah Anak" value={String(riwayat.jml_anak)} />}
                  {riwayat.nama_ayah && <InfoRow label="Ayah" value={riwayat.nama_ayah} />}
                  {riwayat.nama_ibu && <InfoRow label="Ibu" value={riwayat.nama_ibu} />}
                  {riwayat.alamat_orang_tua && <InfoRow label="Alamat Ortu" value={riwayat.alamat_orang_tua} />}
                  <RHTable
                    title=""
                    rows={riwayat.riwayat_anak}
                    cols={[{key:'nama',label:'Nama Anak'},{key:'tgl_lahir',label:'Tgl Lahir'}]}
                  />
                </View>
              )}
            </View>
          )}
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => navigation.navigate('LocationHistory', {
            kartuId: anggota.kartu_id || anggota.id,
            nama: anggota.nama,
            pangkat: anggota.pangkat,
          })}
        >
          <Ionicons name="time" size={20} color={COLORS.bgDark} />
          <Text style={styles.actionBtnText}>Riwayat Lokasi</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.actionBtnSecondary]} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={COLORS.accent} />
          <Text style={[styles.actionBtnText, { color: COLORS.accent }]}>Kembali</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgDark },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bgDark, padding: 24 },
  loadingText: { marginTop: 12, color: COLORS.textSecondary, textAlign: 'center' },
  backBtn: { marginTop: 20, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: COLORS.accent, borderRadius: 8 },
  backBtnText: { color: COLORS.bgDark, fontWeight: '700' },

  card: {
    margin: SIZES.padding, backgroundColor: COLORS.bgCard, borderRadius: 16,
    padding: 20, borderWidth: 1, borderColor: COLORS.accent + '33',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatar: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: COLORS.bgInput,
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: COLORS.accent,
  },
  cardInfo: { flex: 1 },
  nama: { fontSize: SIZES.xl, fontWeight: '700', color: COLORS.textPrimary },
  pangkat: { fontSize: SIZES.md, color: COLORS.accent, marginTop: 2 },
  statusBadge: {
    alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3,
    borderRadius: 6, marginTop: 6, borderWidth: 1,
  },
  statusText: { fontSize: SIZES.xs, fontWeight: '600' },
  kartuIdRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  kartuIdLabel: { fontSize: SIZES.xs, color: COLORS.textMuted, letterSpacing: 2 },
  kartuIdValue: { fontSize: SIZES.lg, fontWeight: '700', color: COLORS.accent, fontFamily: 'monospace' },

  saldoCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    marginHorizontal: SIZES.padding, padding: 16, backgroundColor: COLORS.primary,
    borderRadius: 12, borderWidth: 1, borderColor: COLORS.accent + '44',
  },
  saldoInfo: { flex: 1 },
  saldoLabel: { fontSize: SIZES.xs, color: COLORS.textSecondary, letterSpacing: 2 },
  saldoValue: { fontSize: SIZES.xxl, fontWeight: '800', color: COLORS.accent },

  section: {
    marginHorizontal: SIZES.padding, marginTop: 16,
    backgroundColor: COLORS.bgCard, borderRadius: 12, padding: 16,
  },
  sectionTitle: { fontSize: SIZES.xs, fontWeight: '700', color: COLORS.textMuted, letterSpacing: 2, marginBottom: 12 },

  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  infoLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoLabel: { fontSize: SIZES.sm, color: COLORS.textSecondary },
  infoValue: { fontSize: SIZES.md, color: COLORS.textPrimary, fontWeight: '500', flex: 1, textAlign: 'right' },

  // Riwayat hidup styles (sama dengan ProfileScreen)
  rhHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  rhSubTitle: { fontSize: 11, fontWeight: '700', color: COLORS.accent, letterSpacing: 1, marginTop: 12, marginBottom: 4, textTransform: 'uppercase' },
  rhRow: { flexDirection: 'row', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: COLORS.border + '44' },
  rhIndex: { fontSize: 12, color: COLORS.textMuted, width: 20 },
  rhItem: { fontSize: 12, color: COLORS.textPrimary, marginBottom: 2 },
  rhItemLabel: { color: COLORS.textSecondary, fontSize: 11 },

  actions: {
    flexDirection: 'row', gap: 10, marginHorizontal: SIZES.padding, marginTop: 20,
  },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.accent, borderRadius: 12, padding: 14, gap: 8,
  },
  actionBtnSecondary: {
    backgroundColor: 'transparent', borderWidth: 1, borderColor: COLORS.accent,
  },
  actionBtnText: { fontWeight: '700', fontSize: SIZES.md, color: COLORS.bgDark },
});
