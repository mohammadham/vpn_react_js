import { create } from 'zustand';
import { ConfigResult, ConnectionState, Country, SubscriptionInfo, TestTarget } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AppState {
  connectionState: ConnectionState;
  bestConfig: ConfigResult | null;
  selectedCountry: Country | null;
  subscription: SubscriptionInfo | null;
  testTarget: TestTarget | null;
  localConfigs: ConfigResult[];
  lastFetchedAt: number;

  setConnectionState: (state: ConnectionState) => void;
  setBestConfig: (config: ConfigResult | null) => void;
  setSelectedCountry: (country: Country | null) => void;
  setSubscription: (sub: SubscriptionInfo | null) => void;
  setTestTarget: (target: TestTarget | null) => void;
  setLocalConfigs: (configs: ConfigResult[]) => void;
  updateConfigMetadata: (configId: string, updates: Partial<ConfigResult>) => void;
  cleanupConfigs: () => void;

  loadInitialState: () => Promise<void>;
  disconnect: () => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  connectionState: 'disconnected',
  bestConfig: null,
  selectedCountry: null,
  subscription: null,
  testTarget: null,
  localConfigs: [],
  lastFetchedAt: 0,

  setConnectionState: (state) => set({ connectionState: state }),

  setBestConfig: (config) => {
    set({ bestConfig: config });
    if (config) {
      AsyncStorage.setItem('bestConfig', JSON.stringify(config));
    } else {
      AsyncStorage.removeItem('bestConfig');
    }
  },

  setSelectedCountry: (country) => {
    set({ selectedCountry: country });
    if (country) {
      AsyncStorage.setItem('selectedCountry', JSON.stringify(country));
    } else {
      AsyncStorage.removeItem('selectedCountry');
    }
  },

  setSubscription: (sub) => {
    set({ subscription: sub });
    if (sub) {
       AsyncStorage.setItem('subscription', JSON.stringify(sub));
    } else {
       AsyncStorage.removeItem('subscription');
    }
  },

  setTestTarget: (target) => {
    set({ testTarget: target });
    if (target) {
       AsyncStorage.setItem('testTarget', JSON.stringify(target));
    } else {
       AsyncStorage.removeItem('testTarget');
    }
  },

  setLocalConfigs: (configs) => {
    set({ localConfigs: configs });
    AsyncStorage.setItem('localConfigs', JSON.stringify(configs));
  },

  updateConfigMetadata: (configId, updates) => {
    const { localConfigs } = get();
    const updated = localConfigs.map(c =>
      c.config_id === configId ? { ...c, ...updates } : c
    );
    set({ localConfigs: updated });
    AsyncStorage.setItem('localConfigs', JSON.stringify(updated));
  },

  cleanupConfigs: () => {
    const { localConfigs } = get();
    const now = Date.now();
    const threeDaysMs = 3 * 24 * 60 * 60 * 1000;

    const cleaned = localConfigs.filter(c => {
      // Remove if seen > 3 days ago AND never succeeded
      const isOld = c.firstSeen && (now - c.firstSeen > threeDaysMs);
      if (isOld && !c.everSucceeded) return false;
      return true;
    });

    if (cleaned.length !== localConfigs.length) {
      set({ localConfigs: cleaned });
      AsyncStorage.setItem('localConfigs', JSON.stringify(cleaned));
    }
  },

  loadInitialState: async () => {
    try {
      const [bestConfig, selectedCountry, subscription, testTarget, localConfigs, lastFetchedAt] = await Promise.all([
        AsyncStorage.getItem('bestConfig'),
        AsyncStorage.getItem('selectedCountry'),
        AsyncStorage.getItem('subscription'),
        AsyncStorage.getItem('testTarget'),
        AsyncStorage.getItem('localConfigs'),
        AsyncStorage.getItem('lastFetchedAt'),
      ]);

      set({
        bestConfig: bestConfig ? JSON.parse(bestConfig) : null,
        selectedCountry: selectedCountry ? JSON.parse(selectedCountry) : null,
        subscription: subscription ? JSON.parse(subscription) : null,
        testTarget: testTarget ? JSON.parse(testTarget) : null,
        localConfigs: localConfigs ? JSON.parse(localConfigs) : [],
        lastFetchedAt: lastFetchedAt ? parseInt(lastFetchedAt) : 0,
      });
    } catch (e) {
      console.error('Failed to load initial state', e);
    }
  },

  disconnect: async () => {
    set({ connectionState: 'disconnected', bestConfig: null });
    await AsyncStorage.removeItem('bestConfig');
  }
}));
