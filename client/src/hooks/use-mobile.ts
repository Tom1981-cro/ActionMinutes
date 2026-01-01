import { useCallback, useEffect, useState } from 'react';
import { 
  shareContent, 
  copyToClipboard, 
  requestNotificationPermission,
  scheduleNotification,
  cancelNotification,
  isNativePlatform,
  getPlatform,
  setupAppListeners,
  downloadFile,
  APP_VERSION,
  BUILD_NUMBER,
} from '@/lib/mobile';

export function useMobile() {
  const [isNative, setIsNative] = useState(false);
  const [platform, setPlatform] = useState<string>('web');
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  useEffect(() => {
    setIsNative(isNativePlatform());
    setPlatform(getPlatform());
    setupAppListeners();
  }, []);

  const share = useCallback(async (options: {
    title?: string;
    text?: string;
    url?: string;
  }) => {
    return shareContent(options);
  }, []);

  const copy = useCallback(async (text: string) => {
    return copyToClipboard(text);
  }, []);

  const enableNotifications = useCallback(async () => {
    const granted = await requestNotificationPermission();
    setNotificationsEnabled(granted);
    return granted;
  }, []);

  const scheduleReminder = useCallback(async (options: {
    id: number;
    title: string;
    body: string;
    scheduleAt?: Date;
  }) => {
    return scheduleNotification(options);
  }, []);

  const cancelReminder = useCallback(async (id: number) => {
    return cancelNotification(id);
  }, []);

  const download = useCallback(async (content: string, filename: string, mimeType: string) => {
    return downloadFile(content, filename, mimeType);
  }, []);

  return {
    isNative,
    platform,
    notificationsEnabled,
    share,
    copy,
    enableNotifications,
    scheduleReminder,
    cancelReminder,
    download,
    version: APP_VERSION,
    buildNumber: BUILD_NUMBER,
  };
}
