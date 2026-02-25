import { ConfigResult } from '../types';
import { Buffer } from 'buffer';

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
    const match = clean_name.match(/@[\w\d_]+/);
    if (match) telegram_channel = match[0];
  }

  return { name, country, telegram_channel, is_telegram };
}

function getUrlParams(searchParams: URLSearchParams): Record<string, string> {
  const params: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    params[key] = value;
  });
  return params;
}

export function parseConfig(raw: string): ConfigResult | null {
  try {
    const config_id = raw;
    if (raw.startsWith('vless://') || raw.startsWith('trojan://')) {
      const url = new URL(raw);
      const protocol = raw.startsWith('vless://') ? 'vless' : 'trojan';
      const { name, country, telegram_channel, is_telegram } = parseConfigName(url.hash.slice(1));

      return {
        config_id,
        raw,
        protocol,
        server: url.hostname,
        port: parseInt(url.port) || 443,
        name,
        country,
        telegram_channel,
        is_telegram,
        success: false,
        latency_ms: -1,
        params: getUrlParams(url.searchParams)
      };
    } else if (raw.startsWith('vmess://')) {
      const encoded = raw.slice(8);
      const decoded = JSON.parse(Buffer.from(encoded, 'base64').toString('utf-8'));
      const { name, country, telegram_channel, is_telegram } = parseConfigName(decoded.ps);

      // Convert VMess JSON fields to standard params
      const params: Record<string, string> = {
        net: decoded.net || 'tcp',
        type: decoded.type || 'none',
        host: decoded.host || '',
        path: decoded.path || '',
        tls: decoded.tls || '',
        sni: decoded.sni || '',
        alpn: decoded.alpn || '',
        fp: decoded.fp || '',
      };

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
        latency_ms: -1,
        params
      };
    } else if (raw.startsWith('ss://')) {
       // Support legacy and SIP002
       if (raw.includes('#')) {
         const [main, fragment] = raw.split('#');
         const { name, country, telegram_channel, is_telegram } = parseConfigName(fragment);
         const urlPart = main.slice(5);

         if (urlPart.includes('@')) {
            const [userInfo, serverPart] = urlPart.split('@');
            const [server, portPart] = serverPart.split(':');
            const port = parseInt(portPart.split('/')[0]);

            return {
              config_id,
              raw,
              protocol: 'shadowsocks',
              server,
              port: port || 443,
              name,
              country,
              telegram_channel,
              is_telegram,
              success: false,
              latency_ms: -1,
              params: { method_user: userInfo }
            };
         } else {
            // Legacy base64 SS
            const decoded = Buffer.from(urlPart, 'base64').toString('utf-8');
            if (decoded.includes('@')) {
               const [userInfo, serverPart] = decoded.split('@');
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
                 latency_ms: -1,
                 params: { method_user: userInfo }
               };
            }
         }
       }
    }
  } catch (e) {
    console.error('Failed to parse config', raw, e);
  }
  return null;
}
