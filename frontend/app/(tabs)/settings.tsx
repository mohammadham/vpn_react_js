import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { useAppStore } from '../store/useAppStore';
import { apiService } from '../services/apiService';
import { TestTarget } from '../types';

export default function SettingsScreen() {
  const { disconnect, testTarget, setTestTarget, autoSwitchEnabled, setAutoSwitchEnabled } = useAppStore();
  const [notifications, setNotifications] = useState(true);
  const [autoConnect, setAutoConnect] = useState(false);
  const [testTargets, setTestTargets] = useState<TestTarget[]>([]);
  const [loadingTargets, setLoadingTargets] = useState(false);

  useEffect(() => {
    fetchTargets();
  }, []);

  const fetchTargets = async () => {
    setLoadingTargets(true);
    try {
      const targets = await apiService.getTestTargets();
      setTestTargets(targets);
    } catch (e) {
      console.error(e);
    }
    setLoadingTargets(false);
  };

  const handleReset = () => {
    Alert.alert('بازنشانی تنظیمات', 'آیا مایل به پاک کردن کش و تنظیمات برنامه هستید؟', [
      { text: 'انصراف', style: 'cancel' },
      {
        text: 'بله، بازنشانی شود',
        style: 'destructive',
        onPress: async () => {
          await disconnect();
          Alert.alert('انجام شد', 'تنظیمات برنامه به حالت اولیه بازگشت.');
        }
      }
    ]);
  };

  const SettingItem = ({ icon, title, value, type = 'arrow', onPress }: any) => (
    <TouchableOpacity
      style={styles.item}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.itemLeft}>
        <View style={[styles.iconContainer, { backgroundColor: COLORS.bg }]}>
          <MaterialCommunityIcons name={icon} size={22} color={COLORS.primary} />
        </View>
        <Text style={styles.itemTitle}>{title}</Text>
      </View>
      {type === 'switch' ? (
        <Switch
          value={value}
          onValueChange={onPress}
          trackColor={{ false: COLORS.border, true: COLORS.primary + '80' }}
          thumbColor={value ? COLORS.primary : COLORS.textMuted}
        />
      ) : (
        <MaterialCommunityIcons name="chevron-left" size={24} color={COLORS.textMuted} />
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.headerTitle}>تنظیمات</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>عمومی</Text>
          <View style={styles.card}>
            <SettingItem
              icon="bell-outline"
              title="اعلانات برنامه"
              type="switch"
              value={notifications}
              onPress={() => setNotifications(!notifications)}
            />
            <View style={styles.divider} />
            <SettingItem
              icon="lightning-bolt-outline"
              title="اتصال خودکار در شروع"
              type="switch"
              value={autoConnect}
              onPress={() => setAutoConnect(!autoConnect)}
            />
            <View style={styles.divider} />
            <SettingItem
              icon="shuffle-variant"
              title="تغییر خودکار در صورت قطعی"
              type="switch"
              value={autoSwitchEnabled}
              onPress={() => setAutoSwitchEnabled(!autoSwitchEnabled)}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>امنیت و شبکه</Text>
          <View style={styles.card}>
            <SettingItem icon="shield-check-outline" title="پروتکل‌های مجاز" />
            <View style={styles.divider} />
            <SettingItem icon="dns-outline" title="تنظیمات DNS" />
            <View style={styles.divider} />

            <View style={styles.targetSection}>
              <View style={styles.targetHeader}>
                <MaterialCommunityIcons name="flask-outline" size={18} color={COLORS.primary} />
                <Text style={styles.targetLabel}>هدف تست حقیقی</Text>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.targetScroll}>
                <TouchableOpacity
                  style={[styles.targetChip, !testTarget && styles.targetChipActive]}
                  onPress={() => setTestTarget(null)}
                >
                  <Text style={[styles.targetChipText, !testTarget && styles.targetChipTextActive]}>پیش‌فرض (Google)</Text>
                </TouchableOpacity>

                {testTargets.map((t, i) => (
                  <TouchableOpacity
                    key={i}
                    style={[styles.targetChip, testTarget?.url === t.url && styles.targetChipActive]}
                    onPress={() => setTestTarget(t)}
                  >
                    <Text style={[styles.targetChipText, testTarget?.url === t.url && styles.targetChipTextActive]}>{t.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.divider} />
            <SettingItem icon="poker-chip" title="حذف تبلیغات (بزودی)" />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>پشتیبانی</Text>
          <View style={styles.card}>
            <SettingItem icon="send-outline" title="کانال تلگرام ما" onPress={() => {}} />
            <View style={styles.divider} />
            <SettingItem icon="help-circle-outline" title="سوالات متداول" />
            <View style={styles.divider} />
            <SettingItem icon="alert-circle-outline" title="گزارش مشکل" />
          </View>
        </View>

        <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
          <MaterialCommunityIcons name="refresh" size={20} color={COLORS.red} />
          <Text style={styles.resetText}>بازنشانی کل تنظیمات</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>نسخه 1.2.0 (Build 42)</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  targetSection: { padding: 16 },
  targetHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  targetLabel: { color: COLORS.text, fontSize: 14, fontWeight: '600' },
  targetScroll: { gap: 10 },
  targetChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15, backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.border },
  targetChipActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '10' },
  targetChipText: { color: COLORS.textSecondary, fontSize: 12 },
  targetChipTextActive: { color: COLORS.primary, fontWeight: 'bold' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 40 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: COLORS.text, marginBottom: 30, textAlign: 'right' },
  section: { marginBottom: 25 },
  sectionTitle: { fontSize: 13, color: COLORS.textMuted, fontWeight: '700', textTransform: 'uppercase', marginBottom: 12, paddingHorizontal: 5, textAlign: 'right' },
  card: { backgroundColor: COLORS.card, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border },
  item: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  itemLeft: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  iconContainer: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  itemTitle: { color: COLORS.text, fontSize: 15, fontWeight: '600' },
  divider: { height: 1, backgroundColor: COLORS.border, marginHorizontal: 16 },
  resetButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 10, paddingVertical: 15 },
  resetText: { color: COLORS.red, fontSize: 14, fontWeight: '600' },
  versionText: { color: COLORS.textMuted, fontSize: 12, textAlign: 'center', marginTop: 20 },
});
