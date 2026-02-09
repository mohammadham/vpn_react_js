import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Animated,
  ScrollView,
  Alert,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const COLORS = {
  bg: '#0B0F19',
  card: '#151B2B',
  primary: '#00FF94',
  primaryDim: 'rgba(0,255,148,0.1)',
  primaryGlow: 'rgba(0,255,148,0.3)',
  secondary: '#3B82F6',
  red: '#FF3333',
  yellow: '#FACC15',
  text: '#F3F4F6',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',
  border: '#2D3748',
};

const API_BASE = process.env.EXPO_PUBLIC_BACKEND_URL;

type ConnectionState = 'disconnected' | 'connecting' | 'testing' | 'connected';

interface ConfigResult {
  config_id: string;
  protocol: string;
  server: string;
  port: number;
  name: string;
  country: string;
  telegram_channel?: string;
  is_telegram: boolean;
  success: boolean;
  latency_ms: number;
}

export default function DashboardScreen() {
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [configs, setConfigs] = useState<any[]>([]);
  const [bestConfig, setBestConfig] = useState<ConfigResult | null>(null);
  const [progress, setProgress] = useState({ current: 0, total: 0, batch: 0 });
  const [testedCount, setTestedCount] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadSavedState();
  }, []);

  useEffect(() => {
    if (connectionState === 'connected') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 1500, useNativeDriver: false }),
          Animated.timing(glowAnim, { toValue: 0, duration: 1500, useNativeDriver: false }),
        ])
      ).start();
    } else {
      glowAnim.setValue(0);
    }
  }, [connectionState]);

  useEffect(() => {
    if (connectionState === 'testing') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.05, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 0.95, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [connectionState]);

  const loadSavedState = async () => {
    try {
      const saved = await AsyncStorage.getItem('bestConfig');
      if (saved) {
        const parsed = JSON.parse(saved);
        setBestConfig(parsed);
      }
    } catch (e) {
      // ignore
    }
  };

  const saveBestConfig = async (config: ConfigResult) => {
    try {
      await AsyncStorage.setItem('bestConfig', JSON.stringify(config));
    } catch (e) {
      // ignore
    }
  };

  const handleConnect = async () => {
    if (connectionState === 'connected') {
      setConnectionState('disconnected');
      setBestConfig(null);
      await AsyncStorage.removeItem('bestConfig');
      return;
    }

    if (connectionState === 'testing' || connectionState === 'connecting') {
      return;
    }

    setConnectionState('connecting');
    setTestedCount(0);
    setSuccessCount(0);

    try {
      // Load subscription URL
      const subUrl = await AsyncStorage.getItem('subscriptionUrl');
      const url = subUrl || 'https://raw.githubusercontent.com/arshiacomplus/v2rayExtractor/refs/heads/main/mix/sub.html';

      // Fetch configs
      const fetchResp = await fetch(`${API_BASE}/api/configs/fetch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const fetchData = await fetchResp.json();

      if (!fetchData.configs || fetchData.configs.length === 0) {
        Alert.alert('خطا', 'هیچ کانفیگی یافت نشد');
        setConnectionState('disconnected');
        return;
      }

      const allConfigs = fetchData.configs;
      setConfigs(allConfigs);
      setConnectionState('testing');

      // Batch testing
      const BATCH_SIZE = 50;
      const totalBatches = Math.ceil(allConfigs.length / BATCH_SIZE);
      let found = false;
      let totalTested = 0;
      let totalSuccess = 0;

      for (let i = 0; i < totalBatches && !found; i++) {
        const batch = allConfigs.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);
        setProgress({ current: i + 1, total: totalBatches, batch: batch.length });

        const testResp = await fetch(`${API_BASE}/api/configs/test-batch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ configs: batch }),
        });
        const testData = await testResp.json();
        const results: ConfigResult[] = testData.results || [];

        totalTested += results.length;
        const successResults = results.filter(r => r.success);
        totalSuccess += successResults.length;
        setTestedCount(totalTested);
        setSuccessCount(totalSuccess);

        if (successResults.length > 0) {
          // Find best (lowest latency)
          successResults.sort((a, b) => a.latency_ms - b.latency_ms);
          const best = successResults[0];
          setBestConfig(best);
          await saveBestConfig(best);
          setConnectionState('connected');
          found = true;
        }
      }

      if (!found) {
        Alert.alert('نتیجه', 'هیچ کانفیگ فعالی یافت نشد. لطفاً لینک اشتراک را بررسی کنید.');
        setConnectionState('disconnected');
      }
    } catch (error: any) {
      Alert.alert('خطا', error.message || 'خطا در ارتباط با سرور');
      setConnectionState('disconnected');
    }
  };

  const openTelegram = useCallback((channel: string) => {
    let cleanChannel = channel.replace('@', '').trim();
    const url = `https://t.me/${cleanChannel}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('خطا', 'امکان باز کردن لینک وجود ندارد');
    });
  }, []);

  const getStatusColor = () => {
    switch (connectionState) {
      case 'connected': return COLORS.primary;
      case 'testing': return COLORS.yellow;
      case 'connecting': return COLORS.yellow;
      default: return COLORS.red;
    }
  };

  const getStatusText = () => {
    switch (connectionState) {
      case 'connected': return 'متصل';
      case 'testing': return `در حال تست...`;
      case 'connecting': return 'در حال دریافت کانفیگ‌ها...';
      default: return 'قطع';
    }
  };

  const getButtonColor = () => {
    switch (connectionState) {
      case 'connected': return COLORS.primary;
      case 'testing': return COLORS.yellow;
      case 'connecting': return COLORS.yellow;
      default: return COLORS.red;
    }
  };

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.2, 0.6],
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>V2Ray Manager</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor() + '20' }]}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
            <Text style={[styles.statusText, { color: getStatusColor() }]}>{getStatusText()}</Text>
          </View>
        </View>

        {/* Connect Button */}
        <View style={styles.buttonContainer}>
          <Animated.View style={[styles.glowRing, {
            opacity: glowOpacity,
            borderColor: getButtonColor(),
            transform: [{ scale: pulseAnim }],
          }]} />
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <TouchableOpacity
              testID="connect-button"
              style={[styles.connectButton, {
                borderColor: getButtonColor() + '40',
                backgroundColor: getButtonColor() + '15',
              }]}
              onPress={handleConnect}
              activeOpacity={0.7}
              disabled={connectionState === 'testing' || connectionState === 'connecting'}
            >
              {(connectionState === 'testing' || connectionState === 'connecting') ? (
                <ActivityIndicator size="large" color={COLORS.yellow} />
              ) : (
                <MaterialCommunityIcons
                  name="power"
                  size={64}
                  color={getButtonColor()}
                />
              )}
            </TouchableOpacity>
          </Animated.View>
          <Text style={styles.buttonHint}>
            {connectionState === 'disconnected' ? 'برای اتصال لمس کنید' :
             connectionState === 'connected' ? 'برای قطع لمس کنید' :
             'لطفاً صبر کنید...'}
          </Text>
        </View>

        {/* Progress */}
        {(connectionState === 'testing') && (
          <View style={styles.progressCard}>
            <Text style={styles.progressTitle}>در حال تست کانفیگ‌ها</Text>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, {
                width: progress.total > 0 ? `${(progress.current / progress.total) * 100}%` : '0%'
              }]} />
            </View>
            <Text style={styles.progressText}>
              دسته {progress.current} از {progress.total} ({progress.batch} کانفیگ)
            </Text>
            <View style={styles.progressStats}>
              <Text style={styles.progressStatText}>تست شده: {testedCount}</Text>
              <Text style={[styles.progressStatText, { color: COLORS.primary }]}>موفق: {successCount}</Text>
            </View>
          </View>
        )}

        {/* Connected Info */}
        {connectionState === 'connected' && bestConfig && (
          <View style={styles.connectedCard}>
            <View style={styles.connectedHeader}>
              <MaterialCommunityIcons name="check-circle" size={24} color={COLORS.primary} />
              <Text style={styles.connectedTitle}>متصل به بهترین کانفیگ</Text>
            </View>

            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>پروتکل</Text>
                <Text style={styles.statValue}>{bestConfig.protocol.toUpperCase()}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>تأخیر</Text>
                <Text style={[styles.statValue, {
                  color: bestConfig.latency_ms < 200 ? COLORS.primary :
                         bestConfig.latency_ms < 500 ? COLORS.yellow : COLORS.red
                }]}>{bestConfig.latency_ms}ms</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>کشور</Text>
                <Text style={styles.statValue}>{bestConfig.country || 'نامشخص'}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>سرور</Text>
                <Text style={[styles.statValue, { fontSize: 11 }]} numberOfLines={1}>
                  {bestConfig.server}
                </Text>
              </View>
            </View>

            {/* Telegram Channel */}
            {bestConfig.is_telegram && bestConfig.telegram_channel && (
              <TouchableOpacity
                testID="telegram-channel-button"
                style={styles.telegramButton}
                onPress={() => openTelegram(bestConfig.telegram_channel!)}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="send" size={20} color="#229ED9" />
                <Text style={styles.telegramText}>{bestConfig.telegram_channel}</Text>
                <MaterialCommunityIcons name="open-in-new" size={16} color={COLORS.textMuted} />
              </TouchableOpacity>
            )}

            {/* Test Summary */}
            <View style={styles.summaryRow}>
              <Text style={styles.summaryText}>
                تست شده: {testedCount} | موفق: {successCount}
              </Text>
            </View>
          </View>
        )}

        {/* Disconnected state info */}
        {connectionState === 'disconnected' && !bestConfig && (
          <View style={styles.infoCard}>
            <MaterialCommunityIcons name="information-outline" size={24} color={COLORS.secondary} />
            <Text style={styles.infoText}>
              با لمس دکمه اتصال، کانفیگ‌ها دریافت و تست می‌شوند و به بهترین کانفیگ متصل خواهید شد.
            </Text>
          </View>
        )}
      </ScrollView>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 40,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  buttonContainer: {
    alignItems: 'center',
    marginBottom: 30,
    position: 'relative',
  },
  glowRing: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 2,
  },
  connectButton: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#00FF94',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  buttonHint: {
    color: COLORS.textMuted,
    fontSize: 13,
    marginTop: 16,
  },
  progressCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  progressTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'right',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: COLORS.bg,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.yellow,
    borderRadius: 4,
  },
  progressText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    textAlign: 'right',
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  progressStatText: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  connectedCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.primary + '30',
  },
  connectedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  connectedTitle: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    minWidth: '40%',
    backgroundColor: COLORS.bg,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  statLabel: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginBottom: 4,
  },
  statValue: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
  },
  telegramButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#229ED9' + '15',
    borderRadius: 12,
    padding: 14,
    gap: 10,
    marginBottom: 12,
  },
  telegramText: {
    color: '#229ED9',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  summaryRow: {
    alignItems: 'center',
  },
  summaryText: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  infoCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  infoText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    flex: 1,
    lineHeight: 22,
    textAlign: 'right',
  },
});
