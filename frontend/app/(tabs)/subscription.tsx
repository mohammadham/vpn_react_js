import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { useAppStore } from '../store/useAppStore';
import { apiService } from '../services/apiService';
import { CameraView, useCameraPermissions } from 'expo-camera';

export default function SubscriptionScreen() {
  const { subscription, setSubscription } = useAppStore();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  useEffect(() => {
    if (subscription) {
      setCode(subscription.code);
    }
  }, [subscription]);

  const handleAddSubscription = async (inputCode: string) => {
    if (!inputCode) return;
    setLoading(true);
    try {
      const subData = await apiService.getSubscription(inputCode);
      setSubscription({ ...subData, code: inputCode });
      Alert.alert('موفقیت', 'اشتراک با موفقیت فعال شد');
      setShowScanner(false);
    } catch (error: any) {
      Alert.alert('خطا', error.message || 'خطا در بارگذاری اشتراک');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveSubscription = () => {
    Alert.alert('حذف اشتراک', 'آیا از حذف این اشتراک مطمئن هستید؟', [
      { text: 'لغو', style: 'cancel' },
      {
        text: 'حذف',
        style: 'destructive',
        onPress: () => {
          setSubscription(null);
          setCode('');
        },
      },
    ]);
  };

  const onScan = (result: { data: string }) => {
    setShowScanner(false);
    handleAddSubscription(result.data);
  };

  const openScanner = async () => {
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) {
        Alert.alert('خطا', 'دسترسی به دوربین داده نشد');
        return;
      }
    }
    setShowScanner(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.headerTitle}>مدیریت اشتراک</Text>

        {!subscription ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>افزودن اشتراک جدید</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="کد اشتراک (AdminID-ClientID)"
                placeholderTextColor={COLORS.textMuted}
                value={code}
                onChangeText={setCode}
                autoCapitalize="none"
              />
              <TouchableOpacity style={styles.scanButton} onPress={openScanner}>
                <MaterialCommunityIcons name="qrcode-scan" size={24} color={COLORS.primary} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => handleAddSubscription(code)}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <>
                  <MaterialCommunityIcons name="plus" size={20} color="#000" />
                  <Text style={styles.primaryButtonText}>فعالسازی اشتراک</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.subCard}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.subStatus}>اشتراک فعال</Text>
                <Text style={styles.subCode}>{subscription.code}</Text>
              </View>
              <TouchableOpacity onPress={handleRemoveSubscription}>
                <MaterialCommunityIcons name="trash-can-outline" size={24} color={COLORS.red} />
              </TouchableOpacity>
            </View>

            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>حجم مصرفی</Text>
                <Text style={styles.statValue}>
                  {subscription.usedVolumeGB.toFixed(2)} / {subscription.totalVolumeGB} GB
                </Text>
                <View style={styles.progressBg}>
                   <View
                    style={[
                        styles.progressFill,
                        { width: `${Math.min((subscription.usedVolumeGB / subscription.totalVolumeGB) * 100, 100)}%` }
                    ]}
                   />
                </View>
              </View>

              <View style={styles.statBox}>
                <Text style={styles.statLabel}>زمان باقی‌مانده</Text>
                <Text style={styles.statValue}>{subscription.remainingDays} روز</Text>
              </View>

              <View style={styles.statBox}>
                <Text style={styles.statLabel}>کاربران متصل</Text>
                <Text style={styles.statValue}>{subscription.activeUsers} نفر</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
               <MaterialCommunityIcons name="information-outline" size={16} color={COLORS.textSecondary} />
               <Text style={styles.infoText}>کانفیگ‌های این اشتراک در تب "کانفیگ‌ها" لود شده‌اند.</Text>
            </View>
          </View>
        )}

        <Modal visible={showScanner} animationType="slide">
          <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
            <View style={styles.scannerHeader}>
              <TouchableOpacity onPress={() => setShowScanner(false)}>
                <MaterialCommunityIcons name="close" size={30} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.scannerTitle}>اسکن QR Code</Text>
            </View>
            <CameraView
              style={StyleSheet.absoluteFillObject}
              onBarcodeScanned={onScan}
              barcodeScannerSettings={{
                barcodeTypes: ['qr'],
              }}
            />
          </SafeAreaView>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scrollContent: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 30 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: COLORS.text, marginBottom: 30, textAlign: 'right' },
  section: { backgroundColor: COLORS.card, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: COLORS.border },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginBottom: 15, textAlign: 'right' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 10 },
  input: { flex: 1, backgroundColor: COLORS.bg, borderRadius: 12, padding: 15, color: COLORS.text, textAlign: 'left', borderWidth: 1, borderColor: COLORS.border },
  scanButton: { padding: 12, backgroundColor: COLORS.bg, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border },
  primaryButton: { backgroundColor: COLORS.primary, padding: 15, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  primaryButtonText: { color: '#000', fontWeight: 'bold', fontSize: 16 },
  subCard: { backgroundColor: COLORS.card, borderRadius: 20, padding: 25, borderWidth: 1, borderColor: COLORS.primary + '30' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 25 },
  subStatus: { color: COLORS.primary, fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  subCode: { color: COLORS.text, fontSize: 18, fontWeight: 'bold', marginTop: 4 },
  statsGrid: { gap: 15 },
  statBox: { backgroundColor: COLORS.bg, borderRadius: 15, padding: 15 },
  statLabel: { color: COLORS.textSecondary, fontSize: 13, marginBottom: 8, textAlign: 'right' },
  statValue: { color: COLORS.text, fontSize: 16, fontWeight: '700', textAlign: 'left' },
  progressBg: { height: 6, backgroundColor: COLORS.card, borderRadius: 3, marginTop: 10, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: COLORS.primary },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 20 },
  infoText: { color: COLORS.textSecondary, fontSize: 12, flex: 1, textAlign: 'right' },
  scannerHeader: { position: 'absolute', top: 50, left: 0, right: 0, zIndex: 10, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, justifyContent: 'space-between' },
  scannerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});
