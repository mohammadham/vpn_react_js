import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const COLORS = {
  bg: '#0B0F19',
  card: '#151B2B',
  primary: '#00FF94',
  secondary: '#3B82F6',
  red: '#FF3333',
  text: '#F3F4F6',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',
  border: '#2D3748',
};

const API_BASE = process.env.EXPO_PUBLIC_BACKEND_URL;
const DEFAULT_URL = 'https://raw.githubusercontent.com/arshiacomplus/v2rayExtractor/refs/heads/main/mix/sub.html';

export default function SettingsScreen() {
  const [subUrl, setSubUrl] = useState(DEFAULT_URL);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const url = await AsyncStorage.getItem('subscriptionUrl');
      if (url) setSubUrl(url);
    } catch (e) {
      // ignore
    }
  };

  const saveSettings = async () => {
    try {
      await AsyncStorage.setItem('subscriptionUrl', subUrl);
      setSaved(true);
      Keyboard.dismiss();
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      Alert.alert('خطا', 'خطا در ذخیره تنظیمات');
    }
  };

  const clearData = async () => {
    Alert.alert(
      'حذف داده‌ها',
      'آیا از حذف تمام کانفیگ‌ها و نتایج تست مطمئن هستید؟',
      [
        { text: 'لغو', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: async () => {
            try {
              await fetch(`${API_BASE}/api/configs/clear`, { method: 'DELETE' });
              await AsyncStorage.removeItem('bestConfig');
              Alert.alert('انجام شد', 'داده‌ها پاک شدند');
            } catch (e) {
              Alert.alert('خطا', 'خطا در حذف داده‌ها');
            }
          },
        },
      ]
    );
  };

  const resetUrl = () => {
    setSubUrl(DEFAULT_URL);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.headerTitle}>تنظیمات</Text>

          {/* Subscription URL */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="link-variant" size={20} color={COLORS.secondary} />
              <Text style={styles.sectionTitle}>لینک اشتراک</Text>
            </View>
            <TextInput
              testID="subscription-url-input"
              style={styles.input}
              value={subUrl}
              onChangeText={setSubUrl}
              placeholder="آدرس لینک اشتراک V2Ray"
              placeholderTextColor={COLORS.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              multiline
              numberOfLines={3}
            />
            <View style={styles.buttonRow}>
              <TouchableOpacity
                testID="save-url-button"
                style={styles.primaryButton}
                onPress={saveSettings}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons
                  name={saved ? 'check' : 'content-save'}
                  size={18}
                  color="#000"
                />
                <Text style={styles.primaryButtonText}>
                  {saved ? 'ذخیره شد!' : 'ذخیره'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                testID="reset-url-button"
                style={styles.secondaryButton}
                onPress={resetUrl}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="restore" size={18} color={COLORS.textSecondary} />
                <Text style={styles.secondaryButtonText}>پیش‌فرض</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Data Management */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="database" size={20} color={COLORS.red} />
              <Text style={styles.sectionTitle}>مدیریت داده‌ها</Text>
            </View>
            <TouchableOpacity
              testID="clear-data-button"
              style={styles.dangerButton}
              onPress={clearData}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="delete-outline" size={20} color={COLORS.red} />
              <Text style={styles.dangerButtonText}>حذف تمام کانفیگ‌ها و نتایج</Text>
            </TouchableOpacity>
          </View>

          {/* About */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="information" size={20} color={COLORS.primary} />
              <Text style={styles.sectionTitle}>درباره</Text>
            </View>
            <View style={styles.aboutCard}>
              <Text style={styles.aboutTitle}>V2Ray Config Manager</Text>
              <Text style={styles.aboutVersion}>نسخه 1.0.0</Text>
              <Text style={styles.aboutDesc}>
                این اپلیکیشن کانفیگ‌های V2Ray را از لینک اشتراک دریافت و تست می‌کند و بهترین کانفیگ را پیدا می‌کند.
              </Text>
              <View style={styles.aboutFeatures}>
                <View style={styles.featureRow}>
                  <MaterialCommunityIcons name="check-circle" size={16} color={COLORS.primary} />
                  <Text style={styles.featureText}>پشتیبانی از VLESS, VMess, SS, Trojan</Text>
                </View>
                <View style={styles.featureRow}>
                  <MaterialCommunityIcons name="check-circle" size={16} color={COLORS.primary} />
                  <Text style={styles.featureText}>تست دسته‌ای (۵۰ تایی)</Text>
                </View>
                <View style={styles.featureRow}>
                  <MaterialCommunityIcons name="check-circle" size={16} color={COLORS.primary} />
                  <Text style={styles.featureText}>انتخاب خودکار بهترین کانفیگ</Text>
                </View>
                <View style={styles.featureRow}>
                  <MaterialCommunityIcons name="check-circle" size={16} color={COLORS.primary} />
                  <Text style={styles.featureText}>نمایش کانال تلگرام کانفیگ</Text>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 30,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 24,
    textAlign: 'right',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  input: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 14,
    color: COLORS.text,
    fontSize: 13,
    textAlign: 'left',
    minHeight: 80,
    textAlignVertical: 'top',
    fontFamily: 'monospace',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 12,
  },
  primaryButtonText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.card,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  secondaryButtonText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.red + '15',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.red + '30',
  },
  dangerButtonText: {
    color: COLORS.red,
    fontSize: 14,
    fontWeight: '600',
  },
  aboutCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  aboutTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  aboutVersion: {
    color: COLORS.textMuted,
    fontSize: 13,
    marginBottom: 12,
  },
  aboutDesc: {
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'right',
    marginBottom: 16,
  },
  aboutFeatures: {
    gap: 8,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
});
