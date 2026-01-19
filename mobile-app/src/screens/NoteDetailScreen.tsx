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
import { Badge } from '../components/Badge';
import { colors, spacing, fontSize } from '../utils/colors';

type ScreenRouteProp = RouteProp<RootStackParamList, 'NoteDetail'>;

interface Note {
  id: string;
  title: string;
  content: string;
  color?: string;
  isPinned?: boolean;
  mood?: string;
  tags?: { id: string; name: string }[];
  createdAt: string;
  updatedAt: string;
}

export default function NoteDetailScreen() {
  const route = useRoute<ScreenRouteProp>();
  const { noteId } = route.params;

  const { data: note, isLoading } = useQuery({
    queryKey: ['note', noteId],
    queryFn: async () => {
      const response = await api.get<Note>(`/api/notes/${noteId}`);
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
        <Text style={styles.title}>{note?.title || 'Untitled'}</Text>
        
        <Text style={styles.date}>
          Updated {note?.updatedAt && format(new Date(note.updatedAt), 'MMMM d, yyyy')}
        </Text>

        {note?.tags && note.tags.length > 0 && (
          <View style={styles.tags}>
            {note.tags.map((tag) => (
              <Badge key={tag.id} text={tag.name} variant="violet" size="sm" />
            ))}
          </View>
        )}

        <Card style={styles.contentCard}>
          <Text style={styles.content}>
            {note?.content.replace(/<[^>]*>/g, '')}
          </Text>
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
    marginBottom: spacing.md,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  contentCard: {
    marginBottom: spacing.lg,
  },
  content: {
    fontSize: fontSize.md,
    color: colors.text.primary,
    lineHeight: 24,
  },
});
