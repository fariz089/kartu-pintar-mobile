# 📱 Kartu Pintar Mobile - Setup Guide

## Prerequisites (Install di PC kamu)

### 1. Node.js
Download dan install: https://nodejs.org/ (versi LTS, 20+)
Cek setelah install:
```
node --version
npm --version
```

### 2. Expo CLI
```
npm install -g expo-cli
```

### 3. Expo Go App (di HP Android)
Download **Expo Go** dari Google Play Store:
https://play.google.com/store/apps/details?id=host.exp.exponent

---

## Setup Project

### 1. Extract folder `kartu-pintar-mobile`

### 2. Install Dependencies
```powershell
cd kartu-pintar-mobile
npm install
```

### 3. ⚠️ PENTING: Ganti IP Server API

Buka file `src/services/api.js`, cari baris:
```javascript
const API_BASE = 'http://192.168.1.100:5000';
```

Ganti `192.168.1.100` dengan **IP WiFi komputer kamu**.

Cara cek IP di Windows:
```powershell
ipconfig
```
Cari "IPv4 Address" di bagian WiFi adapter (contoh: 192.168.1.5)

Jika menggunakan server remote (seperti 118.99.86.29), ganti menjadi:
```javascript
const API_BASE = 'http://118.99.86.29:5000';
```

### 4. Pastikan Flask server berjalan
```powershell
cd kartu-pintar
python app.py
```
Server harus running di `0.0.0.0:5000`

### 5. Jalankan React Native
```powershell
cd kartu-pintar-mobile
npx expo start
```

### 6. Scan QR Code
Buka **Expo Go** di HP Android, scan QR code yang muncul di terminal.
Pastikan HP dan komputer terhubung ke **WiFi yang sama**.

---

## Struktur Fitur

| Screen | Fungsi |
|--------|--------|
| Login | Login dengan JWT token |
| Dashboard | Statistik, saldo, menu cepat |
| Scan QR | Scan QR Code via kamera |
| Scan NFC | Simulasi scan NFC (demo) |
| Scan Result | Lihat identitas pemegang kartu |
| Pembayaran | Bayar di kantin dengan numpad |
| Anggota List | Daftar semua anggota |
| Transaksi | Riwayat transaksi |
| Lacak Kartu | Tracking lokasi kartu |

## Login Credentials
| Username | Password | Role |
|----------|----------|------|
| admin | admin123 | Admin |
| user1 | user123 | User |
| kantin1 | kantin123 | Operator |

## Troubleshooting

### "Network Error" / Tidak bisa connect ke API
- Pastikan Flask server running (`python app.py`)
- Pastikan HP dan PC di WiFi yang sama
- Pastikan IP di `api.js` benar
- Coba akses `http://<IP>:5000` dari browser HP

### Camera tidak muncul
- Expo Go perlu izin kamera
- Pastikan pakai HP fisik (bukan emulator untuk kamera)

### NFC
- NFC hanya bisa di **development build** (bukan Expo Go)
- Di Expo Go, gunakan simulasi/input manual NFC UID
- Untuk NFC asli: `npx expo prebuild` lalu `npx expo run:android`
