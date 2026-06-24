// Smart Card - API Service
// UPDATED: MiLi Card integration - handles MiLi URLs as card identifiers

import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ===========================================
// API Configuration
// ===========================================
// DEVELOPMENT - uncomment untuk testing lokal
// const API_BASE = "http://192.168.18.20:5000";

// PRODUCTION
const API_BASE = "https://smartcard.poltekkad.my.id";

const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.multiRemove(["token", "user"]);
    }
    return Promise.reject(error);
  },
);

/**
 * Extract MiLi Card ID dari URL bawaan MiLi
 * Input:  "https://micard.mymili.com/info/FZDc3ImYoVWNm5kNwUTT5IjM"
 * Output: "FZDc3ImYoVWNm5kNwUTT5IjM"
 */
function extractMiliId(rawData) {
  if (!rawData) return rawData;
  const data = rawData.trim();

  // Handle semua varian URL MiLi Card
  // - micard.mymili.com/info/xxx
  // - rd.mymili.com/info/xxx
  // - https://micard.mymili.com/info/xxx
  // - https://rd.mymili.com/info/xxx
  if (data.includes("/info/")) {
    const parts = data.split("/info/");
    if (parts.length > 1) {
      return parts[1].split("?")[0].split("#")[0].split("/")[0].trim();
    }
  }
  // Handle Smart Card public/internal scan URLs: /temu/xxx and /scan/result/xxx
  for (const marker of ["/temu/", "/scan/result/"]) {
    if (data.includes(marker)) {
      const parts = data.split(marker);
      if (parts.length > 1) {
        return parts[1].split("?")[0].split("#")[0].split("/")[0].trim();
      }
    }
  }

  return data;
}

// AUTH
export const authAPI = {
  login: async (username, password) => {
    const res = await api.post("/api/auth/login", { username, password });
    // New flow: login returns either an error OR { success, requires_totp, pending_token, totp_setup_required, ... }
    // We DO NOT store anything yet — the caller routes to TOTP screen.
    return res.data;
  },
  // After password OK, mobile calls this to begin TOTP enrollment.
  // Requires pending_token in Authorization header.
  totpSetup: async (pendingToken) => {
    const res = await api.get("/api/auth/totp/setup", {
      headers: { Authorization: `Bearer ${pendingToken}` },
    });
    return res.data;
  },
  // Verify a TOTP code. Pass the setup_token (during first enrollment) or
  // the pending_token (when 2FA already active). Optionally pass backup_code instead.
  totpVerify: async (token, code, { backupCode } = {}) => {
    const body = backupCode ? { backup_code: backupCode } : { code };
    const res = await api.post("/api/auth/totp/verify", body, {
      headers: { Authorization: `Bearer ${token}` },
    });
    // On success the server returns the FULL JWT — persist it.
    if (res.data?.success && res.data?.token) {
      await AsyncStorage.setItem("token", res.data.token);
      await AsyncStorage.setItem("user", JSON.stringify(res.data.data));
    }
    return res.data;
  },
  logout: async () => {
    await AsyncStorage.multiRemove(["token", "user"]);
  },
  getMe: async () => {
    const res = await api.get("/api/auth/me");
    return res.data;
  },
  getStoredUser: async () => {
    const userStr = await AsyncStorage.getItem("user");
    return userStr ? JSON.parse(userStr) : null;
  },
  getToken: async () => {
    return await AsyncStorage.getItem("token");
  },
  changePassword: async (oldPassword, newPassword) => {
    const res = await api.post("/api/auth/change-password", {
      old_password: oldPassword,
      new_password: newPassword,
    });
    return res.data;
  },
};

// ANGGOTA
export const anggotaAPI = {
  list: async (search = "") => {
    const res = await api.get("/api/anggota", { params: { search } });
    return res.data;
  },
  detail: async (kartuId) => {
    const res = await api.get(`/api/anggota/${kartuId}`);
    return res.data;
  },
  getRiwayatHidup: async (kartuId) => {
    const res = await api.get(`/api/anggota/${kartuId}/riwayat-hidup`);
    return res.data;
  },
  updateRiwayatHidup: async (kartuId, data) => {
    const res = await api.put(`/api/anggota/${kartuId}/riwayat-hidup`, data);
    return res.data;
  },
};

// SCAN (MiLi Card NFC & QR)
export const scanAPI = {
  /**
   * Scan NFC - kirim NFC UID atau NDEF URL dari MiLi Card
   * Backend akan coba lookup di: nfc_uid, mili_id, qr_data, kartu_id
   * TIDAK redirect ke MiLi app → langsung tampilkan identitas
   */
  nfc: async (nfcData) => {
    const cleaned = extractMiliId(nfcData);
    const res = await api.get(`/api/scan/nfc/${encodeURIComponent(cleaned)}`);
    return res.data;
  },

  /**
   * Scan QR - kirim URL QR dari MiLi Card
   * Contoh: "https://micard.mymili.com/info/FZDc3ImYoVWNm5kNwUTT5IjM"
   * Pakai POST agar URL dengan slash aman dikirim
   */
  qr: async (qrData) => {
    const res = await api.post("/api/scan/qr", { qr_data: qrData });
    return res.data;
  },
};

// KEUANGAN
export const keuanganAPI = {
  pembayaran: async (
    kartuId,
    nominal,
    keterangan = "Pembelian di Kantin",
    metode = "NFC",
  ) => {
    const res = await api.post("/api/pembayaran", {
      kartu_id: kartuId,
      nominal,
      keterangan,
      metode,
    });
    return res.data;
  },

  // Pembayaran manual: items bebas [{nama, harga, jumlah}], dukungan hutang.
  // allowHutang=false → kalau saldo kurang, response.need_hutang=true (minta konfirmasi).
  // allowHutang=true  → saldo dipakai dulu, sisa kekurangan jadi hutang.
  pembayaranCart: async (kartuId, items, metode = "Manual", allowHutang = false) => {
    const res = await api.post("/api/pembayaran/cart", {
      kartu_id: kartuId,
      items, // [{nama, harga, jumlah}]
      metode,
      allow_hutang: allowHutang,
    });
    return res.data;
  },

  // Lookup anggota via NFC/QR tap (untuk dipilih di kasir). Tidak langsung membayar.
  pembayaranTap: async (scanData, metode = "NFC") => {
    const cleaned = extractMiliId(scanData);
    const res = await api.post("/api/pembayaran/tap", {
      scan_data: cleaned,
      metode,
    });
    return res.data;
  },

  topup: async (kartuId, nominal) => {
    const res = await api.post("/api/topup", { kartu_id: kartuId, nominal });
    return res.data;
  },

  // Top up instant via NFC/QR tap
  topupTap: async (scanData, nominal = 0, metode = "NFC") => {
    const cleaned = extractMiliId(scanData);
    const res = await api.post("/api/topup/tap", {
      scan_data: cleaned,
      nominal, // 0 = hanya cek member
      metode,
    });
    return res.data;
  },

  transaksi: async (kartuId = "", jenis = "", limit = 50) => {
    const res = await api.get("/api/transaksi", {
      params: { kartu_id: kartuId, jenis, limit },
    });
    return res.data;
  },

  transaksiDetail: async (trxId) => {
    const res = await api.get(`/api/transaksi/${trxId}/detail`);
    return res.data;
  },
};

// PRODUK & KATEGORI dihapus — kasir sekarang manual (nama item + harga).

// LACAK
export const lacakAPI = {
  get: async (kartuId) => {
    const res = await api.get(`/api/lacak/${kartuId}`);
    return res.data;
  },
  updateLocation: async (
    kartuId,
    latitude,
    longitude,
    lokasiNama = "GPS Update",
  ) => {
    const res = await api.post(`/api/anggota/${kartuId}/update-location`, {
      latitude,
      longitude,
      lokasi_nama: lokasiNama,
      sumber: "GPS_Mobile",
    });
    return res.data;
  },
  // Riwayat lokasi - digunakan oleh LocationHistoryScreen
  // Pakai /api/lacak/<id>?limit=... (endpoint ini sudah ada di backend
  // dan sudah return { anggota, lokasi_terakhir, history[] })
  getRiwayatLokasi: async (kartuId, filters = {}) => {
    const params = { limit: 200, ...filters };
    const res = await api.get(`/api/lacak/${kartuId}`, { params });
    return res.data;
  },
};

// MILI CARD REGISTRATION (Admin)
export const miliCardAPI = {
  registerCard: async (kartuId, miliId, nfcUid = null) => {
    const payload = { mili_id: miliId };
    if (nfcUid) payload.nfc_uid = nfcUid;
    const res = await api.put(`/api/anggota/${kartuId}/update-card`, payload);
    return res.data;
  },
};

// MENU & DASHBOARD
export const menuAPI = {
  list: async () => {
    const res = await api.get("/api/menu");
    return res.data;
  },
};

export const dashboardAPI = {
  stats: async () => {
    const res = await api.get("/api/dashboard/stats");
    return res.data;
  },
};

// ===========================================
// ADMIN / MANAJEMEN (fitur yang sebelumnya web-only)
// ===========================================

// USER MANAGEMENT (admin)
export const userAPI = {
  list: async (search = "") => {
    const res = await api.get("/api/admin/users", { params: { search } });
    return res.data;
  },
  anggotaTanpaUser: async () => {
    const res = await api.get("/api/admin/users/anggota-tanpa-user");
    return res.data;
  },
  create: async (payload) => {
    // payload: { username, password, nama, role, anggota_id? }
    const res = await api.post("/api/admin/users", payload);
    return res.data;
  },
  detail: async (id) => {
    const res = await api.get(`/api/admin/users/${id}`);
    return res.data;
  },
  update: async (id, payload) => {
    // payload bisa berisi: { nama, role, is_active, password?, anggota_id? }
    const res = await api.put(`/api/admin/users/${id}`, payload);
    return res.data;
  },
  toggle: async (id) => {
    const res = await api.post(`/api/admin/users/${id}/toggle`);
    return res.data;
  },
  resetPassword: async (id, newPassword) => {
    const res = await api.post(`/api/admin/users/${id}/reset-password`, {
      new_password: newPassword,
    });
    return res.data;
  },
  resetTotp: async (id) => {
    const res = await api.post(`/api/admin/users/${id}/reset-totp`);
    return res.data;
  },
  bulkCreate: async () => {
    const res = await api.post("/api/admin/users/bulk-create");
    return res.data;
  },
  createForAnggota: async (kartuId, payload = {}) => {
    // payload: { username?, password?, role? }
    const res = await api.post(`/api/admin/anggota/${kartuId}/buat-user`, payload);
    return res.data;
  },
};

// CRUD ANGGOTA (admin) — list/detail tetap pakai anggotaAPI yang sudah ada
export const anggotaAdminAPI = {
  create: async (payload) => {
    const res = await api.post("/api/admin/anggota", payload);
    return res.data;
  },
  update: async (kartuId, payload) => {
    const res = await api.put(`/api/admin/anggota/${kartuId}`, payload);
    return res.data;
  },
  remove: async (kartuId) => {
    const res = await api.delete(`/api/admin/anggota/${kartuId}`);
    return res.data;
  },
};

// HUTANG / PIUTANG (admin)
export const hutangAPI = {
  list: async () => {
    const res = await api.get("/api/admin/hutang");
    return res.data;
  },
  bayar: async (kartuId, nominal, sumber = "Tunai") => {
    // sumber: 'Tunai' (dari kas) atau 'Saldo' (potong saldo anggota)
    const res = await api.post("/api/admin/hutang/bayar", {
      kartu_id: kartuId,
      nominal,
      sumber,
    });
    return res.data;
  },
};

// FIND MY TRACKER MANAGEMENT (admin)
export const trackerAPI = {
  list: async () => {
    const res = await api.get("/api/admin/findmy-trackers");
    return res.data;
  },
  add: async (payload) => {
    // payload: { canonical_id, anggota_id, nama_tracker? }
    const res = await api.post("/api/admin/findmy-trackers", payload);
    return res.data;
  },
  update: async (id, payload) => {
    const res = await api.put(`/api/admin/findmy-trackers/${id}`, payload);
    return res.data;
  },
  remove: async (id) => {
    const res = await api.delete(`/api/admin/findmy-trackers/${id}`);
    return res.data;
  },
};

// SCAN LOG (admin)
export const scanLogAPI = {
  list: async (limit = 100) => {
    const res = await api.get("/api/admin/scan-log", { params: { limit } });
    return res.data;
  },
};

// SCAN VIA SEARCH MANUAL (semua role)
export const scanSearchAPI = {
  search: async (scanData, metode = "Manual") => {
    const cleaned = extractMiliId(scanData);
    const res = await api.post("/api/mobile/scan/search", {
      scan_data: cleaned,
      metode,
    });
    return res.data;
  },
};

// CETAK / PRINT KARTU (admin & pers; user → kartunya sendiri)
export const cetakKartuAPI = {
  list: async () => {
    const res = await api.get("/api/cetak-kartu");
    return res.data;
  },
};

// TOTP BACKUP CODES (per-user)
export const backupCodesAPI = {
  status: async () => {
    const res = await api.get("/api/auth/backup-codes");
    return res.data;
  },
  regenerate: async (password) => {
    const res = await api.post("/api/auth/backup-codes/regenerate", { password });
    return res.data;
  },
};

export { API_BASE, extractMiliId };
export default api;
