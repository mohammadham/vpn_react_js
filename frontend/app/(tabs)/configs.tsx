import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const COLORS = {
  bg: '#0B0F19',
  card: '#151B2B',
  primary: '#00FF94',
  secondary: '#3B82F6',
  red: '#FF3333',
  yellow: '#FACC15',
  text: '#F3F4F6',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',
  border: '#2D3748',
};

const API_BASE = process.env.EXPO_PUBLIC_BACKEND_URL;

const PROTOCOL_COLORS: Record<string, string> = {
  vless: '#3B82F6',
  vmess: '#8B5CF6',
  shadowsocks: '#F59E0B',
  trojan: '#EF4444',
};

interface TestResult {
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

export default function ConfigsScreen() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    fetchResults();
  }, []);

  const fetchResults = async () => {
    setLoading(true);
    try {
      const resp = await fetch(`${API_BASE}/api/configs/results`);
      const data = await resp.json();
      setResults(data.results || []);
    } catch (e) {
      // ignore
    }
    setLoading(false);
  };

  const filteredResults = results.filter(r => {
    if (filter === 'all') return true;
    return r.protocol === filter;
  });

  const openTelegram = useCallback((channel: string) => {
    const clean = channel.replace('@', '').trim();
    Linking.openURL(`https://t.me/${clean}`).catch(() => {
      Alert.alert('خطا', 'امکان باز کردن لینک نیست');
    });
  }, []);

  const getLatencyColor = (ms: number) => {
    if (ms < 200) return COLORS.primary;
    if (ms < 500) return COLORS.yellow;
    return COLORS.red;
  };

  const renderItem = ({ item }: { item: TestResult }) => (
    <View testID={`config-item-${item.config_id}`} style={styles.configCard}>
      <View style={styles.cardTop}>
        <View style={[styles.protocolBadge, { backgroundColor: (PROTOCOL_COLORS[item.protocol] || COLORS.secondary) + '20' }]}>
          <Text style={[styles.protocolText, { color: PROTOCOL_COLORS[item.protocol] || COLORS.secondary }]}>
            {item.protocol.toUpperCase()}
          </Text>
        </View>
        <View style={styles.latencyContainer}>
          <MaterialCommunityIcons name="wifi" size={14} color={getLatencyColor(item.latency_ms)} />
          <Text style={[styles.latencyText, { color: getLatencyColor(item.latency_ms) }]}>
            {item.latency_ms}ms
          </Text>
        </View>
      </View>

      <Text style={styles.serverText} numberOfLines={1}>{item.server}:{item.port}</Text>

      <View style={styles.cardBottom}>
        <View style={styles.countryBadge}>
          <Text style={styles.countryText}>{item.country || '??'}</Text>
        </View>
        <Text style={styles.nameText} numberOfLines={1}>{item.name}</Text>
        {item.is_telegram && item.telegram_channel && (
          <TouchableOpacity
            testID={`telegram-btn-${item.config_id}`}
            style={styles.telegramIcon}
            onPress={() => openTelegram(item.telegram_channel!)}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="send" size={18} color="#229ED9" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const protocols = ['all', 'vless', 'vmess', 'shadowsocks', 'trojan'];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>کانفیگ‌های تست شده</Text>
        <Text style={styles.headerCount}>{filteredResults.length} مورد</Text>
      </View>

      {/* Filter tabs */}
      <View style={styles.filterRow}>
        {protocols.map(p => (
          <TouchableOpacity
            key={p}
            testID={`filter-${p}`}
            style={[styles.filterTab, filter === p && styles.filterTabActive]}
            onPress={() => setFilter(p)}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterText, filter === p && styles.filterTextActive]}>
              {p === 'all' ? 'همه' : p.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>در حال بارگذاری...</Text>
        </View>
      ) : (
        <FlatList
          testID="configs-list"
          data={filteredResults}
          renderItem={renderItem}
          keyExtractor={item => item.config_id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={fetchResults}
              tintColor={COLORS.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="format-list-bulleted" size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>هنوز تستی انجام نشده</Text>
              <Text style={styles.emptySubtext}>ابتدا از تب اتصال، تست را شروع کنید</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  headerCount: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterTabActive: {
    backgroundColor: COLORS.primary + '20',
    borderColor: COLORS.primary + '40',
  },
  filterText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  filterTextActive: {
    color: COLORS.primary,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 30,
  },
  configCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  protocolBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  protocolText: {
    fontSize: 11,
    fontWeight: '700',
  },
  latencyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  latencyText: {
    fontSize: 13,
    fontWeight: '700',
  },
  serverText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginBottom: 8,
    fontFamily: 'monospace',
  },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  countryBadge: {
    backgroundColor: COLORS.bg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  countryText: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  nameText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    flex: 1,
  },
  telegramIcon: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#229ED9' + '15',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
    gap: 8,
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
  emptySubtext: {
    color: COLORS.textMuted,
    fontSize: 13,
  },
});
