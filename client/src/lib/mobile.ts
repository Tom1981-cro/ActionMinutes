import { Share } from '@capacitor/share';
import { LocalNotifications, LocalNotificationSchema } from '@capacitor/local-notifications';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

export const isNativePlatform = () => Capacitor.isNativePlatform();
export const getPlatform = () => Capacitor.getPlatform();

export async function shareContent(options: {
  title?: string;
  text?: string;
  url?: string;
  dialogTitle?: string;
}): Promise<boolean> {
  if (isNativePlatform()) {
    try {
      await Share.share(options);
      return true;
    } catch (error) {
      console.error('Native share failed:', error);
      return false;
    }
  }
  
  if (navigator.share) {
    try {
      await navigator.share({
        title: options.title,
        text: options.text,
        url: options.url,
      });
      return true;
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('Web share failed:', error);
      }
      return false;
    }
  }
  
  return false;
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      return true;
    } catch (e) {
      return false;
    } finally {
      document.body.removeChild(textArea);
    }
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (isNativePlatform()) {
    try {
      const permission = await LocalNotifications.requestPermissions();
      return permission.display === 'granted';
    } catch (error) {
      console.error('Notification permission request failed:', error);
      return false;
    }
  }
  
  if ('Notification' in window) {
    const result = await Notification.requestPermission();
    return result === 'granted';
  }
  
  return false;
}

export async function scheduleNotification(options: {
  id: number;
  title: string;
  body: string;
  scheduleAt?: Date;
}): Promise<boolean> {
  if (isNativePlatform()) {
    try {
      const notification: LocalNotificationSchema = {
        id: options.id,
        title: options.title,
        body: options.body,
        schedule: options.scheduleAt ? { at: options.scheduleAt } : undefined,
        smallIcon: 'ic_launcher_foreground',
        iconColor: '#6366f1',
      };
      
      await LocalNotifications.schedule({ notifications: [notification] });
      return true;
    } catch (error) {
      console.error('Failed to schedule notification:', error);
      return false;
    }
  }
  
  return false;
}

export async function cancelNotification(id: number): Promise<boolean> {
  if (isNativePlatform()) {
    try {
      await LocalNotifications.cancel({ notifications: [{ id }] });
      return true;
    } catch (error) {
      console.error('Failed to cancel notification:', error);
      return false;
    }
  }
  return false;
}

export function setupAppListeners() {
  if (!isNativePlatform()) return;
  
  App.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack) {
      window.history.back();
    } else {
      App.exitApp();
    }
  });
  
  App.addListener('appUrlOpen', ({ url }) => {
    const path = new URL(url).pathname;
    if (path) {
      window.location.href = path;
    }
  });
}

export async function downloadFile(content: string, filename: string, mimeType: string): Promise<boolean> {
  try {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
    
    if (isNativePlatform()) {
      await shareContent({
        title: filename,
        text: `${filename}`,
        dialogTitle: 'Save or Share File',
      });
    }
    
    return true;
  } catch (error) {
    console.error('Download failed:', error);
    return false;
  }
}

export const APP_VERSION = '1.0.0';
export const BUILD_NUMBER = '1';
