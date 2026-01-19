import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store';
import { useAuth } from '../hooks/useAuth';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { colors, spacing, fontSize, borderRadius } from '../utils/colors';

interface SettingsItem {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description?: string;
  onPress: () => void;
  rightElement?: React.ReactNode;
  danger?: boolean;
}

export default function SettingsScreen() {
  const { user } = useStore();
  const { logout } = useAuth();

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  const handleConnectGoogle = async () => {
    Alert.alert(
      'Connect Google',
      'Open the web app to connect your Google account for calendar sync.',
      [{ text: 'OK' }]
    );
  };

  const handleConnectOutlook = async () => {
    Alert.alert(
      'Connect Outlook',
      'Open the web app to connect your Outlook account for calendar sync.',
      [{ text: 'OK' }]
    );
  };

  const handleUpgrade = () => {
    Linking.openURL('https://actionminutes.replit.app/settings');
  };

  const isPro = user?.subscriptionPlan === 'pro';

  const sections: { title: string; items: SettingsItem[] }[] = [
    {
      title: 'Account',
      items: [
        {
          icon: 'person-outline',
          label: 'Profile',
          description: user?.email,
          onPress: () => {},
        },
        {
          icon: 'diamond-outline',
          label: 'Subscription',
          description: isPro ? 'Pro Plan' : 'Free Plan',
          onPress: handleUpgrade,
          rightElement: !isPro && <Badge text="Upgrade" variant="violet" size="sm" />,
        },
      ],
    },
    {
      title: 'Integrations',
      items: [
        {
          icon: 'logo-google',
          label: 'Google Calendar',
          description: 'Sync your calendar events',
          onPress: handleConnectGoogle,
          rightElement: <Badge text="Connect" variant="info" size="sm" />,
        },
        {
          icon: 'mail-outline',
          label: 'Outlook Calendar',
          description: 'Sync your calendar events',
          onPress: handleConnectOutlook,
          rightElement: <Badge text="Connect" variant="info" size="sm" />,
        },
      ],
    },
    {
      title: 'Preferences',
      items: [
        {
          icon: 'notifications-outline',
          label: 'Notifications',
          description: 'Manage push notifications',
          onPress: () => {},
        },
        {
          icon: 'moon-outline',
          label: 'Appearance',
          description: 'Dark mode is always on',
          onPress: () => {},
        },
        {
          icon: 'time-outline',
          label: 'Time Zone',
          description: user?.timezone || 'UTC',
          onPress: () => {},
        },
      ],
    },
    {
      title: 'AI Features',
      items: [
        {
          icon: 'sparkles-outline',
          label: 'AI Extraction',
          description: isPro ? 'Unlimited extractions' : '5 extractions/month',
          onPress: () => {},
        },
        {
          icon: 'mic-outline',
          label: 'Voice Transcription',
          description: isPro ? 'Enabled' : 'Pro feature',
          onPress: () => {},
        },
      ],
    },
    {
      title: 'Support',
      items: [
        {
          icon: 'help-circle-outline',
          label: 'Help Center',
          onPress: () => Linking.openURL('https://actionminutes.replit.app/help'),
        },
        {
          icon: 'chatbubble-outline',
          label: 'Send Feedback',
          onPress: () => {},
        },
        {
          icon: 'document-text-outline',
          label: 'Privacy Policy',
          onPress: () => Linking.openURL('https://actionminutes.replit.app/privacy'),
        },
        {
          icon: 'document-outline',
          label: 'Terms of Service',
          onPress: () => Linking.openURL('https://actionminutes.replit.app/terms'),
        },
      ],
    },
    {
      title: '',
      items: [
        {
          icon: 'log-out-outline',
          label: 'Sign Out',
          onPress: handleLogout,
          danger: true,
        },
      ],
    },
  ];

  const renderItem = (item: SettingsItem) => (
    <TouchableOpacity
      key={item.label}
      style={styles.settingsItem}
      onPress={item.onPress}
    >
      <View
        style={[
          styles.iconContainer,
          item.danger && styles.iconContainerDanger,
        ]}
      >
        <Ionicons
          name={item.icon}
          size={20}
          color={item.danger ? colors.error : colors.primary}
        />
      </View>
      <View style={styles.itemContent}>
        <Text
          style={[styles.itemLabel, item.danger && styles.itemLabelDanger]}
        >
          {item.label}
        </Text>
        {item.description && (
          <Text style={styles.itemDescription}>{item.description}</Text>
        )}
      </View>
      {item.rightElement || (
        <Ionicons
          name="chevron-forward"
          size={20}
          color={colors.text.tertiary}
        />
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>
              {user?.name || 'User'}
            </Text>
            <Text style={styles.profileEmail}>{user?.email}</Text>
          </View>
          <Badge
            text={isPro ? 'Pro' : 'Free'}
            variant={isPro ? 'violet' : 'default'}
          />
        </View>

        {sections.map((section) => (
          <View key={section.title || 'signout'} style={styles.section}>
            {section.title && (
              <Text style={styles.sectionTitle}>{section.title}</Text>
            )}
            <Card style={styles.sectionCard}>
              {section.items.map((item, index) => (
                <View key={item.label}>
                  {renderItem(item)}
                  {index < section.items.length - 1 && (
                    <View style={styles.divider} />
                  )}
                </View>
              ))}
            </Card>
          </View>
        ))}

        <Text style={styles.version}>ActionMinutes v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.text.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text.primary,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text.primary,
  },
  profileEmail: {
    fontSize: fontSize.sm,
    color: colors.text.secondary,
    marginTop: 2,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text.secondary,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionCard: {
    padding: 0,
    overflow: 'hidden',
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  iconContainerDanger: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  itemContent: {
    flex: 1,
  },
  itemLabel: {
    fontSize: fontSize.md,
    color: colors.text.primary,
    fontWeight: '500',
  },
  itemLabelDanger: {
    color: colors.error,
  },
  itemDescription: {
    fontSize: fontSize.sm,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: 60,
  },
  version: {
    fontSize: fontSize.xs,
    color: colors.text.muted,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
