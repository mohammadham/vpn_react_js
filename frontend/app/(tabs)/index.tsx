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
  Modal,
  Image,
  Linking,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { useAppStore } from '../store/useAppStore';
import { apiService } from '../services/apiService';
import { testService } from '../services/testService';
import { AppUpdate, Announcement, Ad } from '../types';
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
    testTarget, setLastAd, lastAd,
    userIP, trafficStats, autoSwitchEnabled
  } = useAppStore();

  const [updateInfo, setUpdateInfo] = React.useState<AppUpdate | null>(null);
  const [announcement, setAnnouncement] = React.useState<Announcement | null>(null);
  const [showAd, setShowAd] = React.useState(false);
  const [showUpdateModal, setShowUpdateModal] = React.useState(false);
  const [nextBtnActive, setNextBtnActive] = React.useState(false);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadInitialState();
    checkUpdateAndAnnouncements();
  }, []);

  const checkUpdateAndAnnouncements = async () => {
    try {
      const update = await apiService.getAppUpdate();
      if (update.version !== '1.0.0') {
        setUpdateInfo(update);
        setShowUpdateModal(true);
      }

      const announcements = await apiService.getAnnouncements();
      if (announcements.active) {
        setAnnouncement(announcements);
      }

      // Pre-fetch ad
      try {
        const adResponse = await fetch(`${apiService.WORKER_URL}/api/ads`);
        if (adResponse.ok) {
           const ad = await adResponse.json();
           setLastAd(ad);
        }
      } catch (e) {}

    } catch (e) {}
  };

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

          // Post-connection tasks
          setShowAd(true); // Show ad after connection
          fetchUserIP();
          startTrafficMonitoring();

          // Next button becomes active after 1 minute
          setNextBtnActive(false);
          setTimeout(() => setNextBtnActive(true), 60000);

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

  const fetchUserIP = async () => {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      useAppStore.setState({ userIP: data.ip });
    } catch (e) {}
  };

  const startTrafficMonitoring = () => {
    let lastIn = 0;
    let lastOut = 0;
    let zeroStreamCount = 0;

    const interval = setInterval(async () => {
      if (useAppStore.getState().connectionState !== 'connected') {
        clearInterval(interval);
        return;
      }

      // Mocking native speed data since V2RayModule doesn't exist in web
      const mockDown = Math.random() * 500; // KB/s
      const mockUp = Math.random() * 100;

      const stats = {
        downSpeed: `${mockDown.toFixed(1)} KB/s`,
        upSpeed: `${mockUp.toFixed(1)} KB/s`,
        downTotal: '0 MB',
        upTotal: '0 MB'
      };

      useAppStore.setState({ trafficStats: stats });

      // Auto Switch Logic
      if (autoSwitchEnabled && mockDown < 1) {
        zeroStreamCount++;
        if (zeroStreamCount >= 30) {
          clearInterval(interval);
          handleConnect(); // Disconnect and reconnect (which finds next best)
        }
      } else {
        zeroStreamCount = 0;
      }

    }, 1000);
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
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>سرعت (D/U)</Text>
                  <Text style={[styles.detailValue, { fontSize: 11 }]}>
                    {trafficStats ? `${trafficStats.downSpeed} / ${trafficStats.upSpeed}` : '0/0 KB/s'}
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.locationRow}>
                <MaterialCommunityIcons name="web" size={20} color={COLORS.secondary} />
                <Text style={styles.locationText}>
                  {userIP || 'در حال دریافت IP...'}
                </Text>
                <Text style={[styles.locationText, { marginLeft: 'auto', fontSize: 12, color: COLORS.textMuted }]}>
                  {bestConfig.country || 'Unknown'}
                </Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.actionRow}>
                <TouchableOpacity
                    onPress={() => bestConfig.telegram_channel && openTelegram(bestConfig.telegram_channel)}
                    style={styles.channelBtn}
                >
                    <MaterialCommunityIcons name="send" size={16} color="#fff" />
                    <Text style={styles.channelBtnText}>کانال تلگرام</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={handleConnect}
                    style={[styles.nextBtn, !nextBtnActive && { opacity: 0.5 }]}
                    disabled={!nextBtnActive}
                >
                    <MaterialCommunityIcons name="skip-next" size={20} color={COLORS.primary} />
                    <Text style={styles.nextBtnText}>
                      {nextBtnActive ? 'سرور بعدی' : 'آماده‌سازی...'}
                    </Text>
                </TouchableOpacity>
              </View>

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

        {/* Ad Modal */}
        <Modal visible={showAd && !!lastAd} transparent animationType="slide">
          <View style={styles.modalCenter}>
            <View style={styles.adCard}>
              <View style={styles.adHeader}>
                <Text style={styles.adTag}>حمایت مالی (تبلیغات)</Text>
                <TouchableOpacity onPress={() => setShowAd(false)}>
                  <MaterialCommunityIcons name="close" size={20} color={COLORS.textMuted} />
                </TouchableOpacity>
              </View>
              {lastAd?.image && <Image source={{ uri: lastAd.image }} style={styles.adImage} />}
              <Text style={styles.adTitle}>{lastAd?.title}</Text>
              <Text style={styles.adDesc}>{lastAd?.content}</Text>
              <TouchableOpacity
                style={styles.adBtn}
                onPress={() => {
                  setShowAd(false);
                  if (lastAd?.link) Linking.openURL(lastAd.link);
                }}
              >
                <Text style={styles.adBtnText}>مشاهده جزییات</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Announcement Banner */}
        {announcement && (
           <View style={styles.announcementBar}>
              <MaterialCommunityIcons name="bullhorn-outline" size={18} color={COLORS.bg} />
              <Text style={styles.announcementText} numberOfLines={1}>{announcement.message}</Text>
              <TouchableOpacity onPress={() => setAnnouncement(null)}>
                <MaterialCommunityIcons name="close" size={16} color={COLORS.bg} />
              </TouchableOpacity>
           </View>
        )}

        {/* Update Modal */}
        <Modal visible={showUpdateModal && !!updateInfo} transparent>
           <View style={styles.modalCenter}>
             <View style={styles.updateCard}>
                <MaterialCommunityIcons name="update" size={40} color={COLORS.primary} />
                <Text style={styles.updateTitle}>نسخه جدید در دسترس است</Text>
                <Text style={styles.updateVer}>نسخه {updateInfo?.version}</Text>
                <Text style={styles.updateDesc}>{updateInfo?.description}</Text>
                <TouchableOpacity
                  style={styles.adBtn}
                  onPress={() => updateInfo?.link && Linking.openURL(updateInfo.link)}
                >
                  <Text style={styles.adBtnText}>بروزرسانی مستقیم</Text>
                </TouchableOpacity>
                {!updateInfo?.force && (
                  <TouchableOpacity onPress={() => setShowUpdateModal(false)} style={{ marginTop: 10 }}>
                    <Text style={{ color: COLORS.textMuted }}>بعداً</Text>
                  </TouchableOpacity>
                )}
             </View>
           </View>
        </Modal>

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
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 12 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  locationText: { color: COLORS.textSecondary, fontSize: 14, fontWeight: '600' },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  channelBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#229ED9', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  channelBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  nextBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  nextBtnText: { color: COLORS.primary, fontSize: 12, fontWeight: '600' },
  infoBox: { alignItems: 'center' },
  infoText: { color: COLORS.text, fontSize: 15, fontWeight: '600', marginBottom: 8 },
  subInfoText: { color: COLORS.textMuted, fontSize: 12, textAlign: 'center' },
  modalCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.8)' },
  adCard: { backgroundColor: COLORS.card, width: width * 0.85, borderRadius: 24, padding: 20, borderWidth: 1, borderColor: COLORS.border },
  adHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  adTag: { color: COLORS.primary, fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
  adImage: { width: '100%', height: 150, borderRadius: 12, marginBottom: 15 },
  adTitle: { color: COLORS.text, fontSize: 18, fontWeight: 'bold', marginBottom: 10, textAlign: 'right' },
  adDesc: { color: COLORS.textSecondary, fontSize: 13, textAlign: 'right', marginBottom: 20, lineHeight: 20 },
  adBtn: { backgroundColor: COLORS.primary, width: '100%', paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  adBtnText: { color: COLORS.bg, fontWeight: 'bold' },
  announcementBar: { position: 'absolute', top: 120, left: 20, right: 20, backgroundColor: COLORS.primary, flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 12, gap: 10 },
  announcementText: { color: COLORS.bg, flex: 1, fontSize: 12, fontWeight: 'bold', textAlign: 'right' },
  updateCard: { backgroundColor: COLORS.card, width: width * 0.8, borderRadius: 24, padding: 30, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  updateTitle: { color: COLORS.text, fontSize: 18, fontWeight: 'bold', marginTop: 15 },
  updateVer: { color: COLORS.primary, fontSize: 12, marginVertical: 5 },
  updateDesc: { color: COLORS.textMuted, fontSize: 13, textAlign: 'center', marginBottom: 25 },
});
