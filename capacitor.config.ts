import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.roadracer.mc',
  appName: 'Road Racer MC',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
