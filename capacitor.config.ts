import { CapacitorConfig } from '@capacitor/core';

const config: CapacitorConfig = {
  appId: 'app.lovable.61fcf01737434c0184761f378c6f1e3b',
  appName: 'PoolHeat',
  webDir: 'dist',
  server: {
    url: 'https://61fcf017-3743-4c01-8476-1f378c6f1e3b.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    LocalNotifications: {
      smallIcon: "ic_stat_icon_config_sample",
      iconColor: "#00BFFF",
      sound: "beep.wav",
    },
    SplashScreen: {
      launchShowDuration: 0,
      backgroundColor: "#0B0F14",
      showSpinner: false,
    },
  },
};

export default config;