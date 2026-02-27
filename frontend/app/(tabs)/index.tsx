import React, { useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Animated,
  ScrollView,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { useAppStore } from '../store/useAppStore';
import { apiService } from '../services/apiService';
import { testService } from '../services/testService';
import { parseConfig } from '../utils/parser';
import { openTelegram } from '../utils/links';
import { V2RayService } from '../services/V2RayService';
import { ConfigResult } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

export default function DashboardScreen() {
  const {
    connectionState, setConnectionState,
    bestConfig, setBestConfig,
    subscription, loadInitialState,
    testTarget
  } = useAppStore();

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadInitialState();
  }, []);

  useEffect(() => {
    let animation: Animated.CompositeAnimation | null = null;
    if (connectionState === 'connected') {
      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 2000, useNativeDriver: false }),
          Animated.timing(glowAnim, { toValue: 0, duration: 2000, useNativeDriver: false }),
        ])
      );
      animation.start();
    } else {
      glowAnim.setValue(0);
    }
    return () => {
      if (animation) animation.stop();
    };
  }, [connectionState]);

  const handleConnect = async () => {
    if (connectionState === 'connected') {
      await V2RayService.stop();
      setConnectionState('disconnected');
      return;
    }

    setConnectionState('connecting');
    const { localConfigs, setLocalConfigs, lastFetchedAt, cleanupConfigs, updateConfigMetadata } = useAppStore.getState();

    try {
      let finalConfigs: ConfigResult[] = [];
      const now = Date.now();
      const shouldFetch = (now - lastFetchedAt > 24 * 60 * 60 * 1000);

      if (shouldFetch) {
        let rawConfigs: string[] = [];
        try {
          if (subscription && subscription.configs.length > 0) {
            rawConfigs = subscription.configs;
          } else {
            rawConfigs = await apiService.getConfigs();
          }
        } catch (e) {
          console.log('Fetch failed, using local cache');
        }

        if (rawConfigs.length > 0) {
          const parsed = rawConfigs.map(parseConfig).filter(Boolean) as ConfigResult[];

          // Merge with previous local configs (keep metadata)
          const newConfigs = parsed.map(c => {
            const existing = localConfigs.find(lc => lc.config_id === c.config_id);
            return {
              ...c,
              firstSeen: existing?.firstSeen || now,
              everSucceeded: existing?.everSucceeded || false,
              isLiked: existing?.isLiked || false,
              lastTestSuccess: existing?.lastTestSuccess ?? undefined,
            } as ConfigResult;
          });

          // Keep unique configs
          const merged = [...newConfigs];
          localConfigs.forEach(lc => {
            if (!merged.find(mc => mc.config_id === lc.config_id)) {
              merged.push(lc);
            }
          });

          finalConfigs = merged;
          setLocalConfigs(merged);
          AsyncStorage.setItem('lastFetchedAt', now.toString());
          useAppStore.setState({ lastFetchedAt: now });
        } else {
          finalConfigs = localConfigs;
        }
      } else {
        finalConfigs = localConfigs;
      }

      cleanupConfigs(); // Remove old dead configs

      if (finalConfigs.length === 0) {
        Alert.alert('خطا', 'هیچ کانفیگی یافت نشد. لطفا اشتراک خود را بررسی کنید.');
        setConnectionState('disconnected');
        return;
      }

      // Priority Sorting
      const sortedConfigs = [...finalConfigs].sort((a, b) => {
        // 1. Liked configs first
        if (a.isLiked !== b.isLiked) return a.isLiked ? -1 : 1;

        // 2. Ever succeeded configs next
        if (a.everSucceeded !== b.everSucceeded) return a.everSucceeded ? -1 : 1;

        // 3. Last test status: Success (1), Unknown (0), Failure (-1)
        const getStatusOrder = (c: any) => {
            if (c.lastTestSuccess === true) return 1;
            if (c.lastTestSuccess === false) return -1;
            return 0;
        };
        return getStatusOrder(b) - getStatusOrder(a);
      });
      setConnectionState('testing');

      // Test top 20 configs
      const toTest = sortedConfigs.slice(0, 20);
      const results = await testService.testBatch(
        toTest,
        testTarget?.url,
        testTarget?.method || 'HEAD'
      );

      // Update metadata after test
      results.forEach(r => {
        updateConfigMetadata(r.config_id, {
          lastTestSuccess: r.success,
          everSucceeded: r.everSucceeded || r.success
        });
      });

      const successResults = results.filter(r => r.success).sort((a, b) => a.latency_ms - b.latency_ms);

      if (successResults.length > 0) {
        const best = successResults[0];
        const started = await V2RayService.start(best.raw!);
        if (started) {
          setBestConfig(best);
          setConnectionState('connected');

          // Auto-report usage if private sub
          if (subscription) {
            apiService.reportUsage(subscription.code, 0, true).catch(() => {});
          }
        } else {
           Alert.alert('خطا', 'مشکل در برقراری تونل VPN');
           setConnectionState('disconnected');
        }
      } else {
        Alert.alert('نتیجه', 'هیچ کانفیگ فعالی در حال حاضر یافت نشد.');
        setConnectionState('disconnected');
      }
    } catch (error: any) {
      Alert.alert('خطا', 'خطا در برقراری ارتباط با سرور');
      setConnectionState('disconnected');
    }
  };

  const getStatusColor = () => {
    if (connectionState === 'connected') return COLORS.primary;
    if (connectionState === 'error') return COLORS.red;
    if (connectionState === 'disconnected') return COLORS.textMuted;
    return COLORS.yellow;
  };

  const getStatusText = () => {
    switch (connectionState) {
      case 'connected': return 'ایمن و متصل';
      case 'testing': return 'در حال یافتن بهترین مسیر...';
      case 'connecting': return 'در حال آماده‌سازی...';
      case 'error': return 'خطا در اتصال';
      default: return 'عدم اتصال';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Top Info */}
        <View style={styles.topSection}>
          <Text style={styles.brandText}>V2Ray Manager</Text>
          <Text style={[styles.statusText, { color: getStatusColor() }]}>
            {getStatusText()}
          </Text>
        </View>

        {/* Main Switch (WARP Style) */}
        <View style={styles.centerSection}>
          <Animated.View style={[styles.glowCircle, {
            opacity: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.1, 0.4] }),
            transform: [{ scale: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.2] }) }],
            backgroundColor: getStatusColor(),
          }]} />

          <TouchableOpacity
            onPress={handleConnect}
            activeOpacity={0.8}
            disabled={connectionState === 'connecting' || connectionState === 'testing'}
            style={[styles.mainButton, { borderColor: getStatusColor() + '40' }]}
          >
            { (connectionState === 'connecting' || connectionState === 'testing') ? (
              <ActivityIndicator size="large" color={COLORS.primary} />
            ) : (
              <MaterialCommunityIcons
                name="power"
                size={80}
                color={getStatusColor()}
              />
            )}
          </TouchableOpacity>
        </View>

        {/* Bottom Details */}
        <View style={styles.bottomSection}>
          {connectionState === 'connected' && bestConfig ? (
            <Animated.View style={styles.detailCard}>
              <View style={styles.detailRow}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>پروتکل</Text>
                  <Text style={styles.detailValue}>{bestConfig.protocol.toUpperCase()}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>تاخیر</Text>
                  <Text style={[styles.detailValue, { color: COLORS.primary }]}>{bestConfig.latency_ms}ms</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <TouchableOpacity
                onPress={() => bestConfig.telegram_channel && openTelegram(bestConfig.telegram_channel)}
                style={styles.locationRow}
              >
                <MaterialCommunityIcons name="map-marker" size={20} color={COLORS.secondary} />
                <Text style={styles.locationText}>
                  {bestConfig.country || 'International'} Server
                </Text>
                {bestConfig.is_telegram && (
                  <MaterialCommunityIcons name="send" size={18} color="#229ED9" style={{ marginLeft: 'auto' }} />
                )}
              </TouchableOpacity>
            </Animated.View>
          ) : (
            <View style={styles.infoBox}>
               <Text style={styles.infoText}>
                 {subscription ? `اشتراک فعال: ${subscription.code}` : 'از اشتراک رایگان عمومی استفاده می‌کنید'}
               </Text>
               <Text style={styles.subInfoText}>
                 ترافیک شما رمزنگاری شده و از فیلترینگ عبور می‌کند.
               </Text>
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { flex: 1, justifyContent: 'space-between', paddingVertical: 50 },
  topSection: { alignItems: 'center' },
  brandText: { color: COLORS.text, fontSize: 14, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 },
  statusText: { fontSize: 28, fontWeight: 'bold' },
  centerSection: { alignItems: 'center', justifyContent: 'center' },
  glowCircle: { position: 'absolute', width: 220, height: 220, borderRadius: 110 },
  mainButton: { width: 180, height: 180, borderRadius: 90, backgroundColor: COLORS.card, borderWidth: 4, justifyContent: 'center', alignItems: 'center', elevation: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 15 },
  bottomSection: { paddingHorizontal: 30 },
  detailCard: { backgroundColor: COLORS.card, borderRadius: 24, padding: 20, borderWidth: 1, borderColor: COLORS.border },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between' },
  detailItem: { alignItems: 'center', flex: 1 },
  detailLabel: { color: COLORS.textMuted, fontSize: 11, marginBottom: 5 },
  detailValue: { color: COLORS.text, fontSize: 16, fontWeight: 'bold' },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 15 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  locationText: { color: COLORS.textSecondary, fontSize: 14, fontWeight: '600' },
  infoBox: { alignItems: 'center' },
  infoText: { color: COLORS.text, fontSize: 15, fontWeight: '600', marginBottom: 8 },
  subInfoText: { color: COLORS.textMuted, fontSize: 12, textAlign: 'center' },
});
