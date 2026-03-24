// Kartu Pintar - GPS Location Helper
// Mengambil lokasi GPS HP saat scan NFC/QR untuk tracking kartu

import * as Location from 'expo-location';
import { lacakAPI } from '../services/api';

/**
 * Ambil lokasi GPS HP saat ini
 * Returns: { latitude, longitude, accuracy } atau null
 */
export async function getCurrentLocation() {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.log('[GPS] Permission denied');
      return null;
    }

    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
      timeout: 5000,
    });

    return {
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
      accuracy: loc.coords.accuracy,
    };
  } catch (e) {
    console.log('[GPS] Error:', e.message);
    return null;
  }
}

/**
 * Reverse geocode: lat/lng → nama lokasi
 */
export async function getLocationName(latitude, longitude) {
  try {
    const results = await Location.reverseGeocodeAsync({ latitude, longitude });
    if (results && results.length > 0) {
      const r = results[0];
      const parts = [r.name, r.street, r.district, r.city].filter(Boolean);
      return parts.join(', ') || 'Unknown Location';
    }
    return 'Unknown Location';
  } catch (e) {
    return 'Unknown Location';
  }
}

/**
 * Kirim lokasi GPS HP ke backend sebagai lokasi terakhir kartu
 * Dipanggil setelah berhasil scan NFC/QR
 */
export async function sendScanLocation(kartuId) {
  try {
    const loc = await getCurrentLocation();
    if (!loc) return null;

    const nama = await getLocationName(loc.latitude, loc.longitude);

    const result = await lacakAPI.updateLocation(
      kartuId,
      loc.latitude,
      loc.longitude,
      `${nama} (GPS ±${Math.round(loc.accuracy)}m)`,
    );

    console.log(`[GPS] Location sent for ${kartuId}: ${loc.latitude}, ${loc.longitude} - ${nama}`);
    return result;
  } catch (e) {
    console.log('[GPS] Failed to send location:', e.message);
    return null;
  }
}
