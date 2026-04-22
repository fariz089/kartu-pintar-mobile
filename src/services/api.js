/**
 * api.js - API Service for Kartu Pintar Mobile
 * UPDATED: Domain tetap http://smartcard.poltekkad.my.id/
 * Branding: Poltekad (bukan Poltekkad)
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'http://smartcard.poltekkad.my.id';

class ApiService {
  constructor() {
    this.token = null;
  }

  async getToken() {
    if (!this.token) {
      this.token = await AsyncStorage.getItem('auth_token');
    }
    return this.token;
  }

  setToken(token) {
    this.token = token;
    AsyncStorage.setItem('auth_token', token);
  }

  clearToken() {
    this.token = null;
    AsyncStorage.removeItem('auth_token');
  }

  async request(method, endpoint, data = null, options = {}) {
    const token = await this.getToken();
    const headers = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
      method,
      headers,
      ...options,
    };

    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      config.body = JSON.stringify(data);
    }

    const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;

    try {
      const response = await fetch(url, config);
      const json = await response.json();

      if (response.status === 401) {
        // Token expired — clear and redirect to login
        this.clearToken();
        throw new Error('SESSION_EXPIRED');
      }

      return { status: response.status, data: json };
    } catch (error) {
      if (error.message === 'SESSION_EXPIRED') throw error;
      console.error(`API Error [${method} ${endpoint}]:`, error);
      throw error;
    }
  }

  get(endpoint) { return this.request('GET', endpoint); }
  post(endpoint, data) { return this.request('POST', endpoint, data); }
  put(endpoint, data) { return this.request('PUT', endpoint, data); }
  delete(endpoint) { return this.request('DELETE', endpoint); }

  // === Auth ===
  async login(username, password) {
    const res = await this.post('/api/auth/login', { username, password });
    if (res.data.success && res.data.token) {
      this.setToken(res.data.token);
    }
    return res;
  }

  async logout() {
    this.clearToken();
  }

  async getProfile() {
    return this.get('/api/auth/me');
  }

  async changePassword(oldPassword, newPassword) {
    return this.post('/api/auth/change-password', {
      old_password: oldPassword,
      new_password: newPassword,
    });
  }

  // === Anggota ===
  async getAnggotaList(search = '') {
    const q = search ? `?search=${encodeURIComponent(search)}` : '';
    return this.get(`/api/anggota${q}`);
  }

  async getAnggotaDetail(kartuId) {
    return this.get(`/api/anggota/${kartuId}`);
  }

  // === Scan ===
  async scanNFC(nfcUid) {
    return this.get(`/api/scan/nfc/${encodeURIComponent(nfcUid)}`);
  }

  async scanQR(qrData) {
    return this.post('/api/scan/qr', { qr_data: qrData });
  }

  // === Keuangan ===
  async pembayaran(kartuId, nominal, keterangan = '', metode = 'NFC') {
    return this.post('/api/pembayaran', {
      kartu_id: kartuId, nominal, keterangan, metode,
    });
  }

  async topup(kartuId, nominal) {
    return this.post('/api/topup', { kartu_id: kartuId, nominal });
  }

  async getTransaksi(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    return this.get(`/api/transaksi${params ? '?' + params : ''}`);
  }

  // === Lacak & Riwayat Lokasi ===
  async lacakKartu(kartuId) {
    return this.get(`/api/lacak/${kartuId}`);
  }

  /**
   * NEW: Get riwayat lokasi (location history) for an anggota
   * @param {string} kartuId
   * @param {object} filters - { limit, from, to }
   */
  async getRiwayatLokasi(kartuId, filters = {}) {
    const params = new URLSearchParams(filters).toString();
    return this.get(`/api/riwayat-lokasi/${kartuId}${params ? '?' + params : ''}`);
  }

  /**
   * NEW: Get all anggota with location summary (for overview)
   */
  async getRiwayatLokasiAll() {
    return this.get('/api/riwayat-lokasi');
  }

  // === FindMy Tracker ===
  async getTrackers() {
    return this.get('/api/findmy/trackers');
  }

  async addTracker(canonicalId, kartuId, namaTracker = '') {
    return this.post('/api/findmy/tracker', {
      canonical_id: canonicalId,
      kartu_id: kartuId,
      nama_tracker: namaTracker,
    });
  }

  async deleteTracker(trackerId) {
    return this.delete(`/api/findmy/tracker/${trackerId}`);
  }

  async updateTracker(trackerId, data) {
    return this.put(`/api/findmy/tracker/${trackerId}`, data);
  }

  async locateTracker(kartuId) {
    return this.post(`/api/findmy/locate/${kartuId}`);
  }

  // === Dashboard ===
  async getDashboardStats() {
    return this.get('/api/dashboard/stats');
  }

  // === Menu ===
  async getMenu() {
    return this.get('/api/menu');
  }
}

export default new ApiService();
