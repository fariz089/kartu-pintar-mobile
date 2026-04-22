import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../utils/theme';
import { authAPI } from '../services/api';

export default function LoginScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username.trim() || !password) {
      Alert.alert('Error', 'Username dan password harus diisi');
      return;
    }
    setLoading(true);
    try {
      const result = await authAPI.login(username.trim(), password);
      if (result.success) {
        navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
      } else {
        Alert.alert('Login Gagal', result.message || 'Username atau password salah');
      }
    } catch (error) {
      const msg = error.response?.data?.message || 'Tidak dapat terhubung ke server';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.content}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <View style={styles.logoIcon}>
            <Image source={require('../../assets/logo.png')} style={styles.logoImage} resizeMode="contain" />
          </View>
          <Text style={styles.logoTitle}>SMART CARD</Text>
          <Text style={styles.logoSubtitle}>POLTEKAD</Text>
          <Text style={styles.logoDesc}>Sistem Kartu Tanda Anggota Digital</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Ionicons name="person-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Username"
              placeholderTextColor={COLORS.textMuted}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Ionicons name="lock-closed-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Password"
              placeholderTextColor={COLORS.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={[styles.loginBtn, loading && styles.loginBtnDisabled]} onPress={handleLogin} disabled={loading}>
            {loading ? (
              <ActivityIndicator color={COLORS.bgDark} />
            ) : (
              <>
                <Ionicons name="log-in-outline" size={20} color={COLORS.bgDark} />
                <Text style={styles.loginBtnText}>MASUK</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>TNI Angkatan Darat — Poltekad © 2025</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgDark },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 32 },
  logoContainer: { alignItems: 'center', marginBottom: 40 },
  logoIcon: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: COLORS.bgCard, alignItems: 'center', justifyContent: 'center',
    marginBottom: 16, borderWidth: 2, borderColor: COLORS.accent, overflow: 'hidden',
  },
  logoImage: { width: 80, height: 80 },
  logoTitle: { fontSize: 28, fontWeight: '800', color: COLORS.accent, letterSpacing: 3 },
  logoSubtitle: { fontSize: 14, fontWeight: '600', color: COLORS.primary, letterSpacing: 4, marginTop: 2 },
  logoDesc: { fontSize: 12, color: COLORS.textSecondary, marginTop: 8 },
  form: { gap: 14 },
  inputGroup: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.bgInput, borderRadius: SIZES.radius,
    borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 14,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, height: 52, color: COLORS.textPrimary, fontSize: SIZES.lg },
  eyeBtn: { padding: 8 },
  loginBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.accent, borderRadius: SIZES.radius,
    height: 52, marginTop: 8, gap: 8,
  },
  loginBtnDisabled: { opacity: 0.7 },
  loginBtnText: { fontSize: SIZES.lg, fontWeight: '700', color: COLORS.bgDark, letterSpacing: 2 },
  footer: { textAlign: 'center', color: COLORS.textMuted, fontSize: SIZES.xs, marginTop: 40 },
});
