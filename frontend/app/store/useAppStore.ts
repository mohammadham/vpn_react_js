import { create } from 'zustand';
import { ConfigResult, ConnectionState, Country, SubscriptionInfo, TestTarget } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AppState {
  connectionState: ConnectionState;
  bestConfig: ConfigResult | null;
  selectedCountry: Country | null;
  subscription: SubscriptionInfo | null;
  testTarget: TestTarget | null;

  setConnectionState: (state: ConnectionState) => void;
  setBestConfig: (config: ConfigResult | null) => void;
  setSelectedCountry: (country: Country | null) => void;
  setSubscription: (sub: SubscriptionInfo | null) => void;
  setTestTarget: (target: TestTarget | null) => void;

  loadInitialState: () => Promise<void>;
  disconnect: () => Promise<void>;
}

export const useAppStore = create<AppState>((set) => ({
  connectionState: 'disconnected',
  bestConfig: null,
  selectedCountry: null,
  subscription: null,
  testTarget: null,

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

  loadInitialState: async () => {
    try {
      const [bestConfig, selectedCountry, subscription, testTarget] = await Promise.all([
        AsyncStorage.getItem('bestConfig'),
        AsyncStorage.getItem('selectedCountry'),
        AsyncStorage.getItem('subscription'),
        AsyncStorage.getItem('testTarget'),
      ]);

      set({
        bestConfig: bestConfig ? JSON.parse(bestConfig) : null,
        selectedCountry: selectedCountry ? JSON.parse(selectedCountry) : null,
        subscription: subscription ? JSON.parse(subscription) : null,
        testTarget: testTarget ? JSON.parse(testTarget) : null,
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
