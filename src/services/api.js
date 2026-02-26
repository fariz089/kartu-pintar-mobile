// Kartu Pintar - API Service
// Handles all API calls with JWT authentication

import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ⚠️ GANTI INI dengan IP server Flask kamu
// Kalau pakai Expo Go di HP, gunakan IP WiFi komputer (bukan localhost)
// Contoh: http://192.168.1.100:5000
const API_BASE = "http://192.168.1.146:5000";

const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

// Auto-attach JWT token to every request
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 (token expired) globally
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.multiRemove(["token", "user"]);
      // Navigation will handle redirect to login
    }
    return Promise.reject(error);
  },
);

// ============================================================
// AUTH
// ============================================================

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

// ============================================================
// ANGGOTA
// ============================================================

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

// ============================================================
// SCAN
// ============================================================

export const scanAPI = {
  nfc: async (nfcUid) => {
    const res = await api.get(`/api/scan/nfc/${nfcUid}`);
    return res.data;
  },

  qr: async (qrData) => {
    const res = await api.get(`/api/scan/qr/${qrData}`);
    return res.data;
  },
};

// ============================================================
// KEUANGAN
// ============================================================

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

  topup: async (kartuId, nominal) => {
    const res = await api.post("/api/topup", {
      kartu_id: kartuId,
      nominal,
    });
    return res.data;
  },

  transaksi: async (kartuId = "", jenis = "", limit = 50) => {
    const res = await api.get("/api/transaksi", {
      params: { kartu_id: kartuId, jenis, limit },
    });
    return res.data;
  },
};

// ============================================================
// LACAK & MENU
// ============================================================

export const lacakAPI = {
  get: async (kartuId) => {
    const res = await api.get(`/api/lacak/${kartuId}`);
    return res.data;
  },
};

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

export { API_BASE };
export default api;
