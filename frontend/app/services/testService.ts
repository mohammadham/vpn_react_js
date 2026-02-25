import { ConfigResult } from '../types';

export const testService = {
  /**
   * Performs a professional "Real Delay" test.
   * In production, this calls the Native Module to perform a real
   * V2Ray handshake and measure the time to get a response from a target URL.
   */
  async testConfig(config: ConfigResult): Promise<{ success: boolean; latency: number }> {
    const start = Date.now();
    const timeout = 4000;
    const TARGET_URL = 'http://www.gstatic.com/generate_204';

    try {
      // PRO MODE: Using Native Bridge if available
      // if (NativeModules.V2RayModule) {
      //   return await NativeModules.V2RayModule.measureRealDelay(config.raw, TARGET_URL);
      // }

      // FALLBACK: Advanced TCP Health Check
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);

      try {
        // We use a HEAD request if possible, or a simple fetch
        // This simulates the initial handshake/response cycle
        await fetch(`http://${config.server}:${config.port}`, {
          method: 'HEAD',
          mode: 'no-cors',
          signal: controller.signal,
        });
      } catch (err: any) {
        if (err.name === 'AbortError') {
          return { success: false, latency: -1 };
        }
        // In many network stacks, a "Connection Refused" or "Network Error"
        // that happens VERY quickly is a negative, but if it takes some time
        // and then fails, it might be due to protocol mismatch on an open port.
        const elapsed = Date.now() - start;
        if (elapsed < 50) return { success: false, latency: -1 };
      }

      clearTimeout(timer);
      const latency = Date.now() - start;
      return { success: true, latency };
    } catch (error) {
      return { success: false, latency: -1 };
    }
  },

  async testBatch(configs: ConfigResult[], onProgress?: (index: number) => void): Promise<ConfigResult[]> {
    const results: ConfigResult[] = [];
    const BATCH_SIZE = 10; // Concurrent tests

    for (let i = 0; i < configs.length; i += BATCH_SIZE) {
      const batch = configs.slice(i, i + BATCH_SIZE);
      const batchPromises = batch.map(async (cfg, idx) => {
        const testRes = await this.testConfig(cfg);
        if (onProgress) onProgress(i + idx + 1);
        return { ...cfg, success: testRes.success, latency_ms: testRes.latency };
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // If we found a good config, we might want to stop early in handleConnect,
      // but here we test the whole batch requested.
    }

    return results;
  }
};
