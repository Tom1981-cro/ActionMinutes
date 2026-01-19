import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, startOfDay, isToday } from 'date-fns';
import { api } from '../services/api';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { colors, spacing, fontSize, borderRadius } from '../utils/colors';

interface JournalEntry {
  id: string;
  title: string;
  content: string;
  mood?: string;
  createdAt: string;
}

const MOODS = [
  { key: 'great', emoji: '😊', label: 'Great' },
  { key: 'good', emoji: '🙂', label: 'Good' },
  { key: 'okay', emoji: '😐', label: 'Okay' },
  { key: 'bad', emoji: '😔', label: 'Bad' },
  { key: 'terrible', emoji: '😢', label: 'Terrible' },
];

export default function JournalScreen() {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [showNewEntry, setShowNewEntry] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [selectedMood, setSelectedMood] = useState<string | null>(null);

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['journal'],
    queryFn: async () => {
      const response = await api.get<JournalEntry[]>('/api/notes?journal=true');
      return response.data || [];
    },
  });

  const { data: dailyPrompt } = useQuery({
    queryKey: ['dailyPrompt'],
    queryFn: async () => {
      const response = await api.get<{ prompt: string }>('/api/notes/prompts/daily');
      return response.data?.prompt || 'What are you grateful for today?';
    },
  });

  const createEntry = useMutation({
    mutationFn: async (data: { content: string; mood?: string }) => {
      const response = await api.post('/api/notes', {
        title: `Journal - ${format(new Date(), 'MMMM d, yyyy')}`,
        content: data.content,
        mood: data.mood,
        isJournal: true,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal'] });
      setShowNewEntry(false);
      setNewContent('');
      setSelectedMood(null);
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['journal'] });
    setRefreshing(false);
  }, [queryClient]);

  const handleSave = () => {
    if (newContent.trim()) {
      createEntry.mutate({
        content: newContent.trim(),
        mood: selectedMood || undefined,
      });
    }
  };

  const todayEntry = entries.find((e) => isToday(new Date(e.createdAt)));

  const renderItem = ({ item }: { item: JournalEntry }) => {
    const mood = MOODS.find((m) => m.key === item.mood);
    
    return (
      <Card style={styles.entryCard}>
        <View style={styles.entryHeader}>
          <View style={styles.entryDate}>
            <Text style={styles.entryDay}>
              {format(new Date(item.createdAt), 'd')}
            </Text>
            <Text style={styles.entryMonth}>
              {format(new Date(item.createdAt), 'MMM')}
            </Text>
          </View>
          {mood && <Text style={styles.moodEmoji}>{mood.emoji}</Text>}
        </View>
        
        <Text style={styles.entryContent} numberOfLines={4}>
          {item.content.replace(/<[^>]*>/g, '')}
        </Text>
        
        <Text style={styles.entryTime}>
          {format(new Date(item.createdAt), 'h:mm a')}
        </Text>
      </Card>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Journal</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowNewEntry(true)}
        >
          <Ionicons name="add" size={24} color={colors.text.primary} />
        </TouchableOpacity>
      </View>

      {!todayEntry && dailyPrompt && (
        <TouchableOpacity
          style={styles.promptCard}
          onPress={() => setShowNewEntry(true)}
        >
          <View style={styles.promptIcon}>
            <Ionicons name="sparkles" size={24} color={colors.primary} />
          </View>
          <View style={styles.promptContent}>
            <Text style={styles.promptLabel}>Today's Prompt</Text>
            <Text style={styles.promptText}>{dailyPrompt}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />
        </TouchableOpacity>
      )}

      <FlatList
        data={entries}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyState}>
              <Ionicons
                name="book-outline"
                size={64}
                color={colors.text.muted}
              />
              <Text style={styles.emptyTitle}>Start journaling</Text>
              <Text style={styles.emptyText}>
                Reflect on your day with daily prompts
              </Text>
            </View>
          ) : null
        }
      />

      <Modal
        visible={showNewEntry}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowNewEntry(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowNewEntry(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>New Entry</Text>
            <TouchableOpacity
              onPress={handleSave}
              disabled={!newContent.trim()}
            >
              <Text
                style={[
                  styles.saveText,
                  !newContent.trim() && styles.saveTextDisabled,
                ]}
              >
                Save
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.moodSelector}>
            <Text style={styles.moodLabel}>How are you feeling?</Text>
            <View style={styles.moodOptions}>
              {MOODS.map((mood) => (
                <TouchableOpacity
                  key={mood.key}
                  style={[
                    styles.moodButton,
                    selectedMood === mood.key && styles.moodButtonActive,
                  ]}
                  onPress={() =>
                    setSelectedMood(selectedMood === mood.key ? null : mood.key)
                  }
                >
                  <Text style={styles.moodButtonEmoji}>{mood.emoji}</Text>
                  <Text
                    style={[
                      styles.moodButtonLabel,
                      selectedMood === mood.key && styles.moodButtonLabelActive,
                    ]}
                  >
                    {mood.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {dailyPrompt && (
            <View style={styles.promptBanner}>
              <Ionicons name="sparkles" size={16} color={colors.primary} />
              <Text style={styles.promptBannerText}>{dailyPrompt}</Text>
            </View>
          )}

          <TextInput
            style={styles.textArea}
            placeholder="Write your thoughts..."
            placeholderTextColor={colors.text.muted}
            value={newContent}
            onChangeText={setNewContent}
            multiline
            textAlignVertical="top"
            autoFocus
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.text.primary,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promptCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    padding: spacing.md,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  promptIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  promptContent: {
    flex: 1,
  },
  promptLabel: {
    fontSize: fontSize.xs,
    color: colors.primary,
    fontWeight: '600',
    marginBottom: 2,
  },
  promptText: {
    fontSize: fontSize.sm,
    color: colors.text.primary,
  },
  listContent: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
  },
  entryCard: {
    marginBottom: spacing.md,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  entryDate: {
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  entryDay: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text.primary,
  },
  entryMonth: {
    fontSize: fontSize.xs,
    color: colors.text.secondary,
    textTransform: 'uppercase',
  },
  moodEmoji: {
    fontSize: 24,
  },
  entryContent: {
    fontSize: fontSize.md,
    color: colors.text.secondary,
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  entryTime: {
    fontSize: fontSize.xs,
    color: colors.text.muted,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl * 2,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: spacing.md,
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text.primary,
  },
  cancelText: {
    fontSize: fontSize.md,
    color: colors.text.secondary,
  },
  saveText: {
    fontSize: fontSize.md,
    color: colors.primary,
    fontWeight: '600',
  },
  saveTextDisabled: {
    color: colors.text.muted,
  },
  moodSelector: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  moodLabel: {
    fontSize: fontSize.sm,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  moodOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  moodButton: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
  },
  moodButtonActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  moodButtonEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  moodButtonLabel: {
    fontSize: fontSize.xs,
    color: colors.text.tertiary,
  },
  moodButtonLabelActive: {
    color: colors.primary,
  },
  promptBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    padding: spacing.md,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderRadius: borderRadius.md,
  },
  promptBannerText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.text.secondary,
    fontStyle: 'italic',
  },
  textArea: {
    flex: 1,
    color: colors.text.primary,
    fontSize: fontSize.md,
    lineHeight: 24,
    padding: spacing.lg,
  },
});
