import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.arenablanca.ordering',
  appName: 'Arena Blanca',
  webDir: 'www', // placeholder — not used since we load a remote URL
  server: {
    url: 'https://food-orderingsystem-staging.vercel.app',
    cleartext: false, // HTTPS only — no need for cleartext
    androidScheme: 'https',
  },
  android: {
    backgroundColor: '#0f172a',
  },
};

export default config;
