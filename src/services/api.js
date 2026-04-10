// Kartu Pintar - API Service
// UPDATED: MiLi Card integration - handles MiLi URLs as card identifiers

import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ⚠️ GANTI INI dengan IP server Flask kamu
const API_BASE = "http://192.168.1.144:5000";

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
      return parts[1].split("?")[0].split("#")[0].trim();
    }
  }

  return data;
}

// AUTH
export const authAPI = {
  login: async (username, password) => {
    const res = await api.post("/api/auth/login", { username, password });
    if (res.data.success && res.data.token) {
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
  
  // Pembayaran dengan cart (supermarket style)
  pembayaranCart: async (kartuId, items, metode = "Manual") => {
    const res = await api.post("/api/pembayaran/cart", {
      kartu_id: kartuId,
      items, // [{produk_id, jumlah}]
      metode,
    });
    return res.data;
  },
  
  // Pembayaran instant via NFC/QR tap
  pembayaranTap: async (scanData, items = [], metode = "NFC") => {
    const cleaned = extractMiliId(scanData);
    const res = await api.post("/api/pembayaran/tap", {
      scan_data: cleaned,
      items, // [{produk_id, jumlah}] - kosong = hanya cek member
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

// PRODUK & KATEGORI
export const produkAPI = {
  list: async (kategoriId = null, search = "", availableOnly = true) => {
    const params = {};
    if (kategoriId) params.kategori_id = kategoriId;
    if (search) params.search = search;
    params.available = availableOnly ? "true" : "false";
    const res = await api.get("/api/produk", { params });
    return res.data;
  },
  detail: async (produkId) => {
    const res = await api.get(`/api/produk/${produkId}`);
    return res.data;
  },
  byKode: async (kode) => {
    const res = await api.get(`/api/produk/kode/${kode}`);
    return res.data;
  },
};

export const kategoriAPI = {
  list: async () => {
    const res = await api.get("/api/kategori");
    return res.data;
  },
};

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

export { API_BASE, extractMiliId };
export default api;
