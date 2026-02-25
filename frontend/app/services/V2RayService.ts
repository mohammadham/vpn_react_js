import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

const { V2RayModule } = NativeModules;
const v2rayEventEmitter = new NativeEventEmitter(V2RayModule);

export type V2RayStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export const V2RayService = {
  /**
   * Starts the V2Ray VPN connection with the given config.
   */
  async start(config: string): Promise<boolean> {
    if (__DEV__) {
      console.log('Development Mode: Simulating V2Ray connection...');
      return new Promise((resolve) => {
        setTimeout(() => resolve(true), 1500);
      });
    }

    if (Platform.OS === 'ios') {
      console.warn('V2Ray is currently only supported on Android');
      return false;
    }

    if (!V2RayModule) {
      console.warn('V2RayModule not found. Please build the production app to use VPN.');
      return false;
    }

    try {
      return await V2RayModule.startV2Ray(config);
    } catch (e) {
      console.error('Failed to start V2Ray', e);
      return false;
    }
  },

  /**
   * Stops the V2Ray VPN connection.
   */
  async stop(): Promise<boolean> {
    if (!V2RayModule) return false;
    try {
      return await V2RayModule.stopV2Ray();
    } catch (e) {
      console.error('Failed to stop V2Ray', e);
      return false;
    }
  },

  /**
   * Gets the current status of the VPN.
   */
  async getStatus(): Promise<V2RayStatus> {
    if (!V2RayModule) return 'disconnected';
    try {
      return await V2RayModule.getStatus();
    } catch (e) {
      return 'disconnected';
    }
  },

  /**
   * Subscribes to connection status changes.
   */
  onStatusChange(callback: (status: V2RayStatus) => void) {
    if (!V2RayModule) return { remove: () => {} };
    return v2rayEventEmitter.addListener('onConnectionStatusChanged', (event) => {
      callback(event.status);
    });
  }
};
