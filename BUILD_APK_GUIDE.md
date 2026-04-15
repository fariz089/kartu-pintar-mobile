# 🚀 Panduan Build APK - Kartu Pintar Mobile

## 📋 Prerequisites

Pastikan sudah terinstall:
- **Node.js** (v18 atau lebih baru) - https://nodejs.org/
- **Android Studio** (sudah terinstall ✓)
- **Git** (opsional, untuk clone project)

---

## 🛠️ Setup Project

### 1. Clone dan Install Dependencies

```bash
# Clone project (jika belum)
git clone https://github.com/fariz089/kartu-pintar-mobile.git

# Masuk ke folder project
cd kartu-pintar-mobile

# Install dependencies
npm install
```

### 2. Install EAS CLI (untuk build)

```bash
npm install -g eas-cli
```

### 3. Login ke Expo Account

```bash
npx eas login
```

> Jika belum punya akun, daftar gratis di: https://expo.dev/signup

---

## 🎨 Mengganti Icon Aplikasi dengan Logo Anda

Logo Anda (`assets/logo.png`) sudah ada di project. Untuk menggunakannya sebagai icon:

### Langkah 1: Siapkan File Icon

Anda perlu membuat beberapa ukuran icon:

| File | Ukuran | Kegunaan |
|------|--------|----------|
| `icon.png` | 1024x1024 px | Icon utama (wajib) |
| `adaptive-icon.png` | 1024x1024 px | Android adaptive icon (foreground) |
| `splash.png` | 1284x2778 px | Splash screen |
| `favicon.png` | 48x48 px | Web favicon |

### Langkah 2: Edit atau Buat File Icon

**Opsi A - Cepat (gunakan logo yang ada):**

Rename/copy logo yang ada:
```bash
# Di folder assets
cp logo.png icon.png
cp logo.png adaptive-icon.png
```

**Opsi B - Lebih Baik (resize dengan tool):**

Gunakan tool online gratis:
- https://www.appicon.co/ - Upload logo, download semua ukuran
- https://makeappicon.com/ - Generator icon otomatis
- Atau gunakan Photoshop/GIMP untuk resize manual

### Langkah 3: Update app.json

Buka file `app.json` dan tambahkan/edit bagian icon:

```json
{
  "expo": {
    "name": "Smart Card",
    "slug": "smart-card-mobile",
    "version": "1.0.0",
    "icon": "./assets/icon.png",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#1a2332"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#1a2332"
      },
      "package": "com.poltekkad.smartcard",
      ...
    },
    ...
  }
}
```

### Langkah 4: Buat Icon dengan Background (Recommended)

Untuk Android Adaptive Icon yang bagus, buat icon dengan padding:
- Letakkan logo di tengah dengan margin 20% dari tepi
- Background bisa solid color (#1a2332) atau transparan

---

## 📱 Build APK

Ada 2 cara untuk build APK:

### Cara 1: EAS Build (Cloud - Recommended) ☁️

Build di server Expo (gratis untuk development):

```bash
# Build APK untuk testing/preview
npx eas build --platform android --profile preview

# Atau build APK production
npx eas build --platform android --profile production
```

Setelah selesai (±15-30 menit), download APK dari link yang diberikan.

### Cara 2: Local Build dengan Android Studio 🖥️

#### Step 1: Generate Native Project

```bash
# Generate folder android
npx expo prebuild --platform android
```

#### Step 2: Buka di Android Studio

1. Buka **Android Studio**
2. Pilih **Open** → Navigate ke folder `kartu-pintar-mobile/android`
3. Tunggu Gradle sync selesai

#### Step 3: Build APK

**Via Android Studio:**
1. Menu **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**
2. APK akan ada di: `android/app/build/outputs/apk/debug/app-debug.apk`

**Via Command Line:**
```bash
cd android
./gradlew assembleDebug
```

#### Step 4: Build Release APK (untuk distribusi)

```bash
cd android
./gradlew assembleRelease
```

APK Release: `android/app/build/outputs/apk/release/app-release.apk`

---

## ⚙️ Konfigurasi Tambahan

### Signing APK untuk Release

Untuk publish ke Play Store, Anda perlu signing key:

```bash
# Generate keystore
keytool -genkeypair -v -storetype PKCS12 -keystore my-upload-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
```

Edit `android/app/build.gradle`:

```gradle
android {
    ...
    signingConfigs {
        release {
            storeFile file('my-upload-key.keystore')
            storePassword 'password_anda'
            keyAlias 'my-key-alias'
            keyPassword 'password_anda'
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            ...
        }
    }
}
```

---

## 🔧 Troubleshooting

### Error: "SDK location not found"
- Buka Android Studio → Settings → SDK Manager
- Copy path SDK (misal: `C:\Users\YourName\AppData\Local\Android\Sdk`)
- Buat file `android/local.properties`:
  ```
  sdk.dir=C:\\Users\\YourName\\AppData\\Local\\Android\\Sdk
  ```

### Error: "Could not find com.facebook.react:react-native"
```bash
cd android
./gradlew clean
cd ..
npx expo prebuild --clean
```

### Build lambat
- Pastikan Android Studio menggunakan Gradle JDK 17
- Settings → Build → Gradle → Gradle JDK

### Icon tidak berubah
- Hapus folder `android` dan jalankan ulang `npx expo prebuild`
- Clear cache: `npx expo start --clear`

---

## 📂 Struktur File Setelah Prebuild

```
kartu-pintar-mobile/
├── android/                 # Native Android project
│   ├── app/
│   │   ├── src/
│   │   │   └── main/
│   │   │       └── res/     # Icon ada di sini
│   │   │           ├── mipmap-hdpi/
│   │   │           ├── mipmap-mdpi/
│   │   │           ├── mipmap-xhdpi/
│   │   │           ├── mipmap-xxhdpi/
│   │   │           └── mipmap-xxxhdpi/
│   │   └── build.gradle
│   └── build.gradle
├── assets/
│   ├── logo.png             # Logo Anda (Poltekad)
│   ├── icon.png             # Icon aplikasi (TAMBAHKAN)
│   └── adaptive-icon.png    # Adaptive icon (TAMBAHKAN)
├── app.json
└── package.json
```

---

## ✅ Checklist Sebelum Build

- [ ] Logo sudah di-rename/copy ke `icon.png` dan `adaptive-icon.png`
- [ ] `app.json` sudah diupdate dengan path icon
- [ ] Dependencies sudah terinstall (`npm install`)
- [ ] EAS CLI terinstall (`npm install -g eas-cli`)
- [ ] Sudah login ke Expo (`npx eas login`)
- [ ] IP API di `src/services/api.js` sudah benar

---

## 🎯 Quick Start (TL;DR)

```bash
# 1. Install dependencies
npm install

# 2. Copy logo sebagai icon
cp assets/logo.png assets/icon.png
cp assets/logo.png assets/adaptive-icon.png

# 3. Build APK (pilih salah satu)

# Cloud build (mudah, gratis)
npx eas build --platform android --profile preview

# ATAU Local build (butuh Android Studio)
npx expo prebuild --platform android
cd android && ./gradlew assembleDebug
```

APK siap di-install! 🎉
