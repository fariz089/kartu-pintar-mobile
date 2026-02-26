// Kartu Pintar - Theme & Constants
// Military olive-green + brass/gold dark theme

export const COLORS = {
  // Primary - Military Olive
  primary: '#4a5d23',
  primaryDark: '#3a4a1c',
  primaryLight: '#6b7f3a',

  // Accent - Brass/Gold
  accent: '#c5a44e',
  accentDark: '#a8893a',
  accentLight: '#d4b968',

  // Background
  bgDark: '#1a2332',
  bgCard: '#1e2a3a',
  bgInput: '#253344',
  bgModal: '#1a2332ee',

  // Text
  textPrimary: '#e8e4d9',
  textSecondary: '#8a9bb0',
  textMuted: '#5a6b7d',

  // Status
  success: '#28a745',
  danger: '#dc3545',
  warning: '#ffc107',
  info: '#17a2b8',

  // Borders
  border: '#2a3a4a',
  borderLight: '#3a4a5a',
};

export const FONTS = {
  bold: { fontWeight: '700' },
  semibold: { fontWeight: '600' },
  medium: { fontWeight: '500' },
  regular: { fontWeight: '400' },
};

export const SIZES = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 18,
  xxl: 24,
  xxxl: 32,
  padding: 16,
  radius: 12,
};

export const formatRupiah = (value) => {
  if (!value && value !== 0) return 'Rp 0';
  return `Rp ${parseInt(value).toLocaleString('id-ID')}`;
};

export const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};
