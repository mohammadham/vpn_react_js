import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Alert,
  ScrollView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { COLORS, PROTOCOL_COLORS } from '../constants/colors';
import { apiService } from '../services/apiService';
import { useAppStore } from '../store/useAppStore';
import { parseConfig } from '../utils/parser';
import { ConfigResult } from '../types';
import { openTelegram } from '../utils/links';

export default function ConfigsScreen() {
  const { subscription } = useAppStore();
  const [configs, setConfigs] = useState<ConfigResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    fetchConfigs();
  }, [subscription]);

  const fetchConfigs = async () => {
    setLoading(true);
    try {
      let raw: string[] = [];
      if (subscription && subscription.configs.length > 0) {
        raw = subscription.configs;
      } else {
        raw = await apiService.getConfigs();
      }
      const parsed = raw.map(parseConfig).filter(Boolean) as ConfigResult[];
      setConfigs(parsed);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const copyToClipboard = async (text: string) => {
    await Clipboard.setStringAsync(text);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('کپی شد', 'کانفیگ با موفقیت در حافظه کپی شد.');
  };

  const filteredConfigs = configs.filter(c => {
    if (filter === 'all') return true;
    return c.protocol === filter;
  });

  const renderItem = ({ item }: { item: ConfigResult }) => (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={[styles.protocolBadge, { backgroundColor: (PROTOCOL_COLORS[item.protocol] || COLORS.secondary) + '20' }]}>
          <Text style={[styles.protocolText, { color: PROTOCOL_COLORS[item.protocol] || COLORS.secondary }]}>
            {item.protocol.toUpperCase()}
          </Text>
        </View>
        <View style={styles.actionButtons}>
          {item.is_telegram && item.telegram_channel && (
            <TouchableOpacity onPress={() => openTelegram(item.telegram_channel!)} style={styles.actionIcon}>
              <MaterialCommunityIcons name="send" size={18} color="#229ED9" />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => copyToClipboard(item.raw || '')} style={styles.actionIcon}>
            <MaterialCommunityIcons name="content-copy" size={18} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.nameText} numberOfLines={1}>{item.name || item.server}</Text>

      <View style={styles.cardBottom}>
        <View style={styles.metaBadge}>
          <MaterialCommunityIcons name="map-marker-outline" size={12} color={COLORS.textMuted} />
          <Text style={styles.metaText}>{item.country || 'International'}</Text>
        </View>
        <View style={styles.metaBadge}>
          <MaterialCommunityIcons name="swap-vertical" size={12} color={COLORS.textMuted} />
          <Text style={styles.metaText}>{item.port}</Text>
        </View>
      </View>
    </View>
  );

  const protocols = ['all', 'vless', 'vmess', 'shadowsocks', 'trojan'];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>لیست کانفیگ‌ها</Text>
        <TouchableOpacity onPress={fetchConfigs} disabled={loading}>
          <MaterialCommunityIcons name="refresh" size={24} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {protocols.map(p => (
            <TouchableOpacity
              key={p}
              style={[styles.filterTab, filter === p && styles.filterTabActive]}
              onPress={() => setFilter(p)}
            >
              <Text style={[styles.filterText, filter === p && styles.filterTextActive]}>
                {p === 'all' ? 'همه' : p.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredConfigs}
          renderItem={renderItem}
          keyExtractor={(item, index) => index.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={fetchConfigs} tintColor={COLORS.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="flask-empty-outline" size={60} color={COLORS.border} />
              <Text style={styles.emptyText}>هیچ کانفیگی یافت نشد</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 60, marginBottom: 20 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: COLORS.text },
  filterContainer: { marginBottom: 15 },
  filterScroll: { paddingHorizontal: 16, gap: 10 },
  filterTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
  filterTabActive: { backgroundColor: COLORS.primary + '20', borderColor: COLORS.primary + '40' },
  filterText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },
  filterTextActive: { color: COLORS.primary },
  listContent: { paddingHorizontal: 16, paddingBottom: 30 },
  card: { backgroundColor: COLORS.card, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  protocolBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  protocolText: { fontSize: 11, fontWeight: 'bold' },
  actionButtons: { flexDirection: 'row', gap: 12 },
  actionIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.bg, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  nameText: { color: COLORS.text, fontSize: 15, fontWeight: '600', marginBottom: 12 },
  cardBottom: { flexDirection: 'row', gap: 10 },
  metaBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.bg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  metaText: { color: COLORS.textMuted, fontSize: 11, fontWeight: '500' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { alignItems: 'center', paddingTop: 100 },
  emptyText: { color: COLORS.textMuted, fontSize: 16, marginTop: 15 },
});
