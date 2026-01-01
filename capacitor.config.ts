import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.actionminutes.app',
  appName: 'ActionMinutes',
  webDir: 'dist/public',
  
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#6366f1',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    LocalNotifications: {
      smallIcon: 'ic_launcher_foreground',
      iconColor: '#6366f1',
      sound: 'default',
    },
    StatusBar: {
      style: 'light',
      backgroundColor: '#6366f1',
    },
  },

  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
    scheme: 'actionminutes',
  },

  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
};

export default config;
