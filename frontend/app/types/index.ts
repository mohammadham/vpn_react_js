export interface ConfigResult {
  config_id: string;
  protocol: string;
  server: string;
  port: number;
  name: string;
  country: string;
  countryCode?: string;
  telegram_channel?: string;
  is_telegram: boolean;
  success: boolean;
  latency_ms: number;
  raw?: string;
  quality_score?: number;
  params?: Record<string, string>; // Advanced V2Ray parameters
  // Metadata for local management
  firstSeen: number;
  lastTestSuccess?: boolean;
  isLiked: boolean;
  everSucceeded: boolean;
  lastFetchedAt?: number;
}

export type ConnectionState = 'disconnected' | 'connecting' | 'testing' | 'connected' | 'error';

export interface SubscriptionInfo {
  code: string;
  totalVolumeGB: number;
  usedVolumeGB: number;
  remainingDays: number;
  activeUsers: number;
  configs: string[];
}

export interface Country {
  country: string;
  countryCode: string;
  count: number;
}

export interface TestTarget {
  name: string;
  url: string;
  port: number;
  method: string;
}
