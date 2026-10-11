import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.melaku.zemen',
  appName: 'Zemen',
  webDir: 'dist',
  android: {
    // Keep web content out from under the status/navigation bars on Android 15+.
    adjustMarginsForEdgeToEdge: 'force',
  },
};

export default config;
