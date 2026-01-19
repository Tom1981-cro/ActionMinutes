import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { RootStackParamList } from '../navigation';
import { api } from '../services/api';
import { Card } from '../components/Card';
import { colors, spacing, fontSize } from '../utils/colors';

type ScreenRouteProp = RouteProp<RootStackParamList, 'MeetingDetail'>;

interface Meeting {
  id: string;
  title: string;
  rawNotes: string;
  summary?: string;
  date?: string;
  duration?: number;
  attendees?: string[];
  createdAt: string;
}

export default function MeetingDetailScreen() {
  const route = useRoute<ScreenRouteProp>();
  const { meetingId } = route.params;

  const { data: meeting, isLoading } = useQuery({
    queryKey: ['meeting', meetingId],
    queryFn: async () => {
      const response = await api.get<Meeting>(`/api/meetings/${meetingId}`);
      return response.data;
    },
  });

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>{meeting?.title || 'Untitled'}</Text>
        
        <Text style={styles.date}>
          {meeting?.createdAt && format(new Date(meeting.createdAt), 'MMMM d, yyyy')}
        </Text>

        {meeting?.summary && (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Summary</Text>
            <Text style={styles.content}>{meeting.summary}</Text>
          </Card>
        )}

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <Text style={styles.content}>{meeting?.rawNotes}</Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  date: {
    fontSize: fontSize.sm,
    color: colors.text.secondary,
    marginBottom: spacing.lg,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  content: {
    fontSize: fontSize.sm,
    color: colors.text.secondary,
    lineHeight: 22,
  },
});
