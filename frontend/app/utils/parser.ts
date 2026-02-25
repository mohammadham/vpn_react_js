import { ConfigResult } from '../types';
import { Buffer } from 'buffer';

function decodeBase64(str: string): string {
  try {
    // In React Native, we can use atob if available or a buffer/library
    // For simplicity, we assume we have a way to decode or we use a basic approach
    // We can use 'base-64' package or buffer.
    return Buffer.from(str, 'base64').toString('utf-8');
  } catch (e) {
    console.error('Base64 decode failed', e);
    return '';
  }
}

function parseConfigName(fragment: string) {
  const decoded = decodeURIComponent(fragment);
  let name = decoded;
  let country = "";
  let telegram_channel = undefined;
  let is_telegram = false;

  if (decoded.includes("::")) {
    const parts = decoded.split("::");
    country = parts[parts.length - 1].trim();
    name = parts[0].trim();
  }

  if (name.includes(">>")) {
    name = name.replace(">>", "").trim();
  }

  const clean_name = name.trim();

  if (clean_name.startsWith("@")) {
    is_telegram = true;
    telegram_channel = clean_name;
  } else if (/@|telegram|tel@|t\.me\//i.test(clean_name)) {
    is_telegram = true;
    // Basic extraction
    const match = clean_name.match(/@[\w\d_]+/);
    if (match) telegram_channel = match[0];
  }

  return { name, country, telegram_channel, is_telegram };
}

export function parseConfig(raw: string): ConfigResult | null {
  try {
    const config_id = raw; // Use raw as ID or hash it
    if (raw.startsWith('vless://')) {
      const url = new URL(raw);
      const { name, country, telegram_channel, is_telegram } = parseConfigName(url.hash.slice(1));
      return {
        config_id,
        raw,
        protocol: 'vless',
        server: url.hostname,
        port: parseInt(url.port) || 443,
        name,
        country,
        telegram_channel,
        is_telegram,
        success: false,
        latency_ms: -1
      };
    } else if (raw.startsWith('vmess://')) {
      const encoded = raw.slice(8);
      const decoded = JSON.parse(Buffer.from(encoded, 'base64').toString('utf-8'));
      const { name, country, telegram_channel, is_telegram } = parseConfigName(decoded.ps);
      return {
        config_id,
        raw,
        protocol: 'vmess',
        server: decoded.add,
        port: parseInt(decoded.port) || 443,
        name,
        country,
        telegram_channel,
        is_telegram,
        success: false,
        latency_ms: -1
      };
    } else if (raw.startsWith('trojan://')) {
      const url = new URL(raw);
      const { name, country, telegram_channel, is_telegram } = parseConfigName(url.hash.slice(1));
      return {
        config_id,
        raw,
        protocol: 'trojan',
        server: url.hostname,
        port: parseInt(url.port) || 443,
        name,
        country,
        telegram_channel,
        is_telegram,
        success: false,
        latency_ms: -1
      };
    } else if (raw.startsWith('ss://')) {
       // SS parsing can be complex if it's legacy base64
       // We'll implement a basic one
       if (raw.includes('#')) {
         const [main, fragment] = raw.split('#');
         const { name, country, telegram_channel, is_telegram } = parseConfigName(fragment);
         const urlPart = main.slice(5);
         if (urlPart.includes('@')) {
            const [userInfo, serverPart] = urlPart.split('@');
            const [server, port] = serverPart.split(':');
            return {
              config_id,
              raw,
              protocol: 'shadowsocks',
              server,
              port: parseInt(port) || 443,
              name,
              country,
              telegram_channel,
              is_telegram,
              success: false,
              latency_ms: -1
            };
         }
       }
    }
  } catch (e) {
    console.error('Failed to parse config', raw, e);
  }
  return null;
}
