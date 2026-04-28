import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, formatRupiah } from '../utils/theme';

export default function ScanResultScreen({ route, navigation }) {
  const { anggota } = route.params;

  const InfoRow = ({ icon, label, value }) => (
    <View style={styles.infoRow}>
      <View style={styles.infoLeft}>
        <Ionicons name={icon} size={16} color={COLORS.accent} />
        <Text style={styles.infoLabel}>{label}</Text>
      </View>
      <Text style={styles.infoValue}>{value || '-'}</Text>
    </View>
  );

  const statusColor = anggota.status_kartu === 'Aktif' ? COLORS.success :
    anggota.status_kartu === 'Hilang' ? COLORS.danger : COLORS.warning;

  return (
    <ScrollView style={styles.container}>
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
          <Text style={styles.kartuIdValue}>{anggota.kartu_id}</Text>
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

      {/* Identity Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>IDENTITAS</Text>
        <InfoRow icon="id-card" label="NRP" value={anggota.nrp} />
        <InfoRow icon="business" label="Satuan" value={anggota.satuan} />
        <InfoRow icon="briefcase" label="Jabatan" value={anggota.jabatan} />
        <InfoRow icon="school" label="Jurusan" value={anggota.jurusan} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>DATA PRIBADI</Text>
        <InfoRow icon="location" label="Tempat Lahir" value={anggota.tempat_lahir} />
        <InfoRow icon="calendar" label="Tanggal Lahir" value={anggota.tanggal_lahir} />
        <InfoRow icon="water" label="Gol. Darah" value={anggota.golongan_darah} />
        <InfoRow icon="heart" label="Agama" value={anggota.agama} />
        <InfoRow icon="home" label="Alamat" value={anggota.alamat} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>KARTU</Text>
        <InfoRow icon="wifi" label="NFC UID" value={anggota.nfc_uid} />
        <InfoRow icon="qr-code" label="QR Data" value={anggota.qr_data} />
      </View>

      {/* Action Buttons — tombol Bayar dihapus, tinggal Scan Lagi */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="scan" size={20} color={COLORS.bgDark} />
          <Text style={styles.actionBtnText}>Scan Lagi</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgDark },
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
  actions: {
    flexDirection: 'row', gap: 10, marginHorizontal: SIZES.padding, marginTop: 20,
  },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.accent, borderRadius: 12, padding: 14, gap: 8,
  },
  actionBtnText: { fontWeight: '700', fontSize: SIZES.md, color: COLORS.bgDark },
});
