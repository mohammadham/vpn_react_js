import { WORKER_URL } from '../constants/api';
import { Country, ConfigResult, SubscriptionInfo } from '../types';

export const apiService = {
  WORKER_URL,
  async getCountries(): Promise<Country[]> {
    const response = await fetch(`${WORKER_URL}/api/countries`);
    if (!response.ok) throw new Error('Failed to fetch countries');
    return response.json();
  },

  async getConfigs(countryCode?: string, sort: string = 'best', limit: number = 100): Promise<string[]> {
    let url = `${WORKER_URL}/api/configs?sort=${sort}&limit=${limit}`;
    if (countryCode) {
      url += `&country=${countryCode}`;
    }
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch configs');
    const data = await response.json();
    return data.configs || [];
  },

  async getSubscription(code: string): Promise<SubscriptionInfo> {
    const response = await fetch(`${WORKER_URL}/api/user-sub?code=${code}`);
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'کد اشتراک نامعتبر است');
    }

    // The worker returns base64 configs in /api/user-sub or /api/sub
    // But the doc says /api/user-sub returns personal config list in Base64 format.
    // We might need to handle both the stats and the configs.
    const data = await response.json();
    return data;
  },

  async reportUsage(code: string, volumeMB: number, activate: boolean = false) {
    const response = await fetch(`${WORKER_URL}/api/user-sub/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, volumeMB, activate }),
    });
    return response.json();
  },

  async getAppUpdate() {
    const response = await fetch(`${WORKER_URL}/api/app-update`);
    if (!response.ok) throw new Error('Failed to fetch update info');
    return response.json();
  },

  async getAnnouncements() {
    const response = await fetch(`${WORKER_URL}/api/announcements`);
    if (!response.ok) throw new Error('Failed to fetch announcements');
    return response.json();
  },

  async getTestTargets(): Promise<{ name: string; url: string; port: number; method: string }[]> {
    const response = await fetch(`${WORKER_URL}/api/test-targets`);
    if (!response.ok) {
        // Fallback default targets
        return [
            { name: 'Google (HTTP)', url: 'http://www.google.com', port: 80, method: 'HEAD' },
            { name: 'Cloudflare (HTTPS)', url: 'https://www.cloudflare.com', port: 443, method: 'GET' },
            { name: 'Speedtest API', url: 'https://www.speedtest.net', port: 443, method: 'HEAD' }
        ];
    }
    return response.json();
  },

  async voteConfig(votes: { hash: string, type: 'like' | 'dislike' }[], token?: string) {
    // Note: Dashboard API requires authentication.
    // If we're doing "Auto-Like", we might need a system token or the worker should allow it.
    // Based on the doc, /dashboard/api/vote requires a Bearer Token.
    const response = await fetch(`${WORKER_URL}/dashboard/api/vote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ votes }),
    });
    return response.json();
  }
};
