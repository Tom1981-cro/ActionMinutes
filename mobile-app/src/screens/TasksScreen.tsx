import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, isToday, isTomorrow, isPast, addDays } from 'date-fns';
import { api } from '../services/api';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { colors, spacing, fontSize, borderRadius } from '../utils/colors';

interface Task {
  id: string;
  description: string;
  dueDate?: string;
  status: string;
  priority?: string;
  listId?: string;
  recurring?: boolean;
}

type FilterType = 'all' | 'today' | 'upcoming' | 'overdue';

export default function TasksScreen() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<FilterType>('all');
  const [refreshing, setRefreshing] = useState(false);

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      const response = await api.get<Task[]>('/api/action-items');
      return response.data || [];
    },
  });

  const updateTask = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; status?: string }) => {
      const response = await api.patch(`/api/action-items/${id}`, updates);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/action-items/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['tasks'] });
    setRefreshing(false);
  }, [queryClient]);

  const handleDelete = (task: Task) => {
    Alert.alert('Delete Task', 'Are you sure you want to delete this task?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteTask.mutate(task.id),
      },
    ]);
  };

  const filteredTasks = tasks.filter((task) => {
    if (task.status === 'done') return false;
    
    const dueDate = task.dueDate ? new Date(task.dueDate) : null;
    
    switch (filter) {
      case 'today':
        return dueDate && isToday(dueDate);
      case 'upcoming':
        return dueDate && !isPast(dueDate);
      case 'overdue':
        return dueDate && isPast(dueDate) && !isToday(dueDate);
      default:
        return true;
    }
  });

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
    if (isPast(date)) return `Overdue (${format(date, 'MMM d')})`;
    return format(date, 'MMM d');
  };

  const renderItem = ({ item }: { item: Task }) => {
    const isCompleted = item.status === 'done';
    
    return (
      <Card style={styles.taskCard}>
        <View style={styles.taskRow}>
          <TouchableOpacity
            style={styles.checkbox}
            onPress={() =>
              updateTask.mutate({
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
          
          <View style={styles.taskContent}>
            <Text
              style={[styles.taskDescription, isCompleted && styles.taskCompleted]}
              numberOfLines={2}
            >
              {item.description}
            </Text>
            
            <View style={styles.taskMeta}>
              {item.dueDate && (
                <View style={styles.metaItem}>
                  <Ionicons
                    name="calendar-outline"
                    size={12}
                    color={getDueDateColor(item.dueDate)}
                  />
                  <Text
                    style={[styles.metaText, { color: getDueDateColor(item.dueDate) }]}
                  >
                    {formatDueDate(item.dueDate)}
                  </Text>
                </View>
              )}
              
              {item.priority === 'high' && (
                <Badge text="High" variant="error" size="sm" />
              )}
              
              {item.recurring && (
                <Ionicons name="repeat" size={12} color={colors.primary} />
              )}
            </View>
          </View>
          
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDelete(item)}
          >
            <Ionicons name="trash-outline" size={18} color={colors.text.tertiary} />
          </TouchableOpacity>
        </View>
      </Card>
    );
  };

  const filterButtons: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'today', label: 'Today' },
    { key: 'upcoming', label: 'Upcoming' },
    { key: 'overdue', label: 'Overdue' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Tasks</Text>
        <Text style={styles.subtitle}>
          {filteredTasks.length} {filter === 'all' ? 'pending' : filter} tasks
        </Text>
      </View>

      <View style={styles.filters}>
        {filterButtons.map((btn) => (
          <TouchableOpacity
            key={btn.key}
            style={[styles.filterButton, filter === btn.key && styles.filterButtonActive]}
            onPress={() => setFilter(btn.key)}
          >
            <Text
              style={[styles.filterText, filter === btn.key && styles.filterTextActive]}
            >
              {btn.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredTasks}
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
                name="checkbox-outline"
                size={64}
                color={colors.text.muted}
              />
              <Text style={styles.emptyTitle}>No tasks</Text>
              <Text style={styles.emptyText}>
                {filter === 'all'
                  ? 'Add tasks from the Capture screen'
                  : `No ${filter} tasks`}
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
  filters: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  filterButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
  },
  filterText: {
    fontSize: fontSize.sm,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  filterTextActive: {
    color: colors.text.primary,
  },
  listContent: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
  },
  taskCard: {
    marginBottom: spacing.sm,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkbox: {
    marginRight: spacing.sm,
    marginTop: 2,
  },
  taskContent: {
    flex: 1,
  },
  taskDescription: {
    fontSize: fontSize.md,
    color: colors.text.primary,
    lineHeight: 22,
  },
  taskCompleted: {
    textDecorationLine: 'line-through',
    color: colors.text.tertiary,
  },
  taskMeta: {
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
  deleteButton: {
    padding: spacing.xs,
    marginLeft: spacing.sm,
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
