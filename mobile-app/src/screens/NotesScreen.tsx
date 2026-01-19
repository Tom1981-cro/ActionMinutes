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
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, formatDistanceToNow } from 'date-fns';
import { RootStackParamList } from '../navigation';
import { api } from '../services/api';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { colors, spacing, fontSize, borderRadius } from '../utils/colors';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface Note {
  id: string;
  title: string;
  content: string;
  color?: string;
  isPinned?: boolean;
  isJournal?: boolean;
  mood?: string;
  tags?: { id: string; name: string }[];
  createdAt: string;
  updatedAt: string;
}

export default function NotesScreen() {
  const navigation = useNavigation<NavigationProp>();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ['notes', searchQuery],
    queryFn: async () => {
      const endpoint = searchQuery
        ? `/api/notes?search=${encodeURIComponent(searchQuery)}`
        : '/api/notes';
      const response = await api.get<Note[]>(endpoint);
      return response.data || [];
    },
  });

  const deleteNote = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/notes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });

  const togglePin = useMutation({
    mutationFn: async ({ id, isPinned }: { id: string; isPinned: boolean }) => {
      const response = await api.put(`/api/notes/${id}`, { isPinned: !isPinned });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['notes'] });
    setRefreshing(false);
  }, [queryClient]);

  const handleDelete = (note: Note) => {
    Alert.alert('Delete Note', 'Are you sure you want to delete this note?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteNote.mutate(note.id),
      },
    ]);
  };

  const getNoteColor = (color?: string) => {
    const colorMap: Record<string, string> = {
      violet: colors.feature.violet.bg,
      pink: colors.feature.pink.bg,
      blue: colors.feature.blue.bg,
      green: colors.feature.emerald.bg,
      yellow: colors.feature.amber.bg,
      orange: colors.feature.orange.bg,
    };
    return colorMap[color || ''] || colors.surface;
  };

  const getMoodEmoji = (mood?: string) => {
    const moodMap: Record<string, string> = {
      great: '😊',
      good: '🙂',
      okay: '😐',
      bad: '😔',
      terrible: '😢',
    };
    return moodMap[mood || ''] || '';
  };

  const pinnedNotes = notes.filter((n) => n.isPinned);
  const regularNotes = notes.filter((n) => !n.isPinned);

  const renderItem = ({ item }: { item: Note }) => (
    <TouchableOpacity
      style={[styles.noteCard, { backgroundColor: getNoteColor(item.color) }]}
      onPress={() => navigation.navigate('NoteDetail', { noteId: item.id })}
      onLongPress={() => handleDelete(item)}
    >
      <View style={styles.noteHeader}>
        <View style={styles.noteIcons}>
          {item.isPinned && (
            <Ionicons name="pin" size={14} color={colors.primary} />
          )}
          {item.isJournal && (
            <Ionicons name="book" size={14} color={colors.feature.pink.text} />
          )}
          {item.mood && (
            <Text style={styles.moodEmoji}>{getMoodEmoji(item.mood)}</Text>
          )}
        </View>
        <TouchableOpacity
          onPress={() => togglePin.mutate({ id: item.id, isPinned: !!item.isPinned })}
        >
          <Ionicons
            name={item.isPinned ? 'pin' : 'pin-outline'}
            size={18}
            color={item.isPinned ? colors.primary : colors.text.tertiary}
          />
        </TouchableOpacity>
      </View>
      
      <Text style={styles.noteTitle} numberOfLines={1}>
        {item.title || 'Untitled'}
      </Text>
      
      <Text style={styles.noteContent} numberOfLines={3}>
        {item.content.replace(/<[^>]*>/g, '')}
      </Text>
      
      {item.tags && item.tags.length > 0 && (
        <View style={styles.noteTags}>
          {item.tags.slice(0, 3).map((tag) => (
            <Badge key={tag.id} text={tag.name} size="sm" variant="violet" />
          ))}
          {item.tags.length > 3 && (
            <Text style={styles.moreTagsText}>+{item.tags.length - 3}</Text>
          )}
        </View>
      )}
      
      <Text style={styles.noteDate}>
        {formatDistanceToNow(new Date(item.updatedAt), { addSuffix: true })}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Notes</Text>
        <TouchableOpacity style={styles.addButton}>
          <Ionicons name="add" size={24} color={colors.text.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={colors.text.tertiary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search notes..."
          placeholderTextColor={colors.text.muted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={colors.text.tertiary} />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={[...pinnedNotes, ...regularNotes]}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
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
                name="document-text-outline"
                size={64}
                color={colors.text.muted}
              />
              <Text style={styles.emptyTitle}>No notes yet</Text>
              <Text style={styles.emptyText}>
                Tap + to create your first note
              </Text>
            </View>
          ) : null
        }
      />
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    color: colors.text.primary,
    fontSize: fontSize.md,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.sm,
  },
  listContent: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
  },
  row: {
    justifyContent: 'space-between',
  },
  noteCard: {
    width: '48%',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  noteIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  moodEmoji: {
    fontSize: 14,
  },
  noteTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  noteContent: {
    fontSize: fontSize.sm,
    color: colors.text.secondary,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  noteTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  moreTagsText: {
    fontSize: fontSize.xs,
    color: colors.text.tertiary,
    alignSelf: 'center',
  },
  noteDate: {
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
});
