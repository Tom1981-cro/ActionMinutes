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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, isToday, isTomorrow, isPast } from 'date-fns';
import { RootStackParamList } from '../navigation';
import { api } from '../services/api';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { colors, spacing, fontSize, borderRadius } from '../utils/colors';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface ActionItem {
  id: string;
  description: string;
  ownerName?: string;
  dueDate?: string;
  status: string;
  priority?: string;
  meetingId?: string;
  meetingTitle?: string;
}

export default function InboxScreen() {
  const navigation = useNavigation<NavigationProp>();
  const queryClient = useQueryClient();
  const [quickAddText, setQuickAddText] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const { data: actionItems = [], isLoading } = useQuery({
    queryKey: ['actionItems'],
    queryFn: async () => {
      const response = await api.get<ActionItem[]>('/api/action-items');
      return response.data || [];
    },
  });

  const createTask = useMutation({
    mutationFn: async (description: string) => {
      const response = await api.post('/api/action-items', { description });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['actionItems'] });
      setQuickAddText('');
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const response = await api.patch(`/api/action-items/${id}`, { status });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['actionItems'] });
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['actionItems'] });
    setRefreshing(false);
  }, [queryClient]);

  const handleQuickAdd = () => {
    if (quickAddText.trim()) {
      createTask.mutate(quickAddText.trim());
    }
  };

  const getDueDateColor = (dueDate?: string) => {
    if (!dueDate) return colors.text.tertiary;
    const date = new Date(dueDate);
    if (isPast(date) && !isToday(date)) return colors.error;
    if (isToday(date)) return colors.warning;
    if (isTomorrow(date)) return colors.feature.amber.text;
    return colors.text.secondary;
  };

  const formatDueDate = (dueDate?: string) => {
    if (!dueDate) return null;
    const date = new Date(dueDate);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'MMM d');
  };

  const pendingItems = actionItems.filter((item) => item.status !== 'done');
  const completedItems = actionItems.filter((item) => item.status === 'done');

  const renderItem = ({ item }: { item: ActionItem }) => {
    const isCompleted = item.status === 'done';
    
    return (
      <Card style={styles.itemCard}>
        <View style={styles.itemRow}>
          <TouchableOpacity
            style={styles.checkbox}
            onPress={() =>
              updateStatus.mutate({
                id: item.id,
                status: isCompleted ? 'pending' : 'done',
              })
            }
          >
            <Ionicons
              name={isCompleted ? 'checkmark-circle' : 'ellipse-outline'}
              size={24}
              color={isCompleted ? colors.success : colors.text.tertiary}
            />
          </TouchableOpacity>
          
          <View style={styles.itemContent}>
            <Text
              style={[
                styles.itemDescription,
                isCompleted && styles.itemCompleted,
              ]}
              numberOfLines={2}
            >
              {item.description}
            </Text>
            
            <View style={styles.itemMeta}>
              {item.dueDate && (
                <View style={styles.metaItem}>
                  <Ionicons
                    name="calendar-outline"
                    size={12}
                    color={getDueDateColor(item.dueDate)}
                  />
                  <Text
                    style={[
                      styles.metaText,
                      { color: getDueDateColor(item.dueDate) },
                    ]}
                  >
                    {formatDueDate(item.dueDate)}
                  </Text>
                </View>
              )}
              
              {item.priority === 'high' && (
                <Badge text="High" variant="error" size="sm" />
              )}
              
              {item.meetingTitle && (
                <Text style={styles.meetingText} numberOfLines={1}>
                  {item.meetingTitle}
                </Text>
              )}
            </View>
          </View>
        </View>
      </Card>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Inbox</Text>
        <Text style={styles.subtitle}>
          {pendingItems.length} pending tasks
        </Text>
      </View>

      <View style={styles.quickAddContainer}>
        <TextInput
          style={styles.quickAddInput}
          placeholder="Add a task..."
          placeholderTextColor={colors.text.muted}
          value={quickAddText}
          onChangeText={setQuickAddText}
          onSubmitEditing={handleQuickAdd}
          returnKeyType="done"
        />
        <TouchableOpacity
          style={[
            styles.quickAddButton,
            !quickAddText.trim() && styles.quickAddButtonDisabled,
          ]}
          onPress={handleQuickAdd}
          disabled={!quickAddText.trim()}
        >
          <Ionicons
            name="add"
            size={24}
            color={quickAddText.trim() ? colors.text.primary : colors.text.muted}
          />
        </TouchableOpacity>
      </View>

      <FlatList
        data={[...pendingItems, ...completedItems.slice(0, 5)]}
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
                name="checkmark-circle-outline"
                size={64}
                color={colors.text.muted}
              />
              <Text style={styles.emptyTitle}>All caught up!</Text>
              <Text style={styles.emptyText}>
                Add a task above or capture a meeting
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
    padding: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.text.primary,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  quickAddContainer: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  quickAddInput: {
    flex: 1,
    color: colors.text.primary,
    fontSize: fontSize.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  quickAddButton: {
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  quickAddButtonDisabled: {
    backgroundColor: colors.surfaceElevated,
  },
  listContent: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
  },
  itemCard: {
    marginBottom: spacing.sm,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkbox: {
    marginRight: spacing.sm,
    marginTop: 2,
  },
  itemContent: {
    flex: 1,
  },
  itemDescription: {
    fontSize: fontSize.md,
    color: colors.text.primary,
    lineHeight: 22,
  },
  itemCompleted: {
    textDecorationLine: 'line-through',
    color: colors.text.tertiary,
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: fontSize.xs,
  },
  meetingText: {
    fontSize: fontSize.xs,
    color: colors.text.tertiary,
    maxWidth: 120,
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
