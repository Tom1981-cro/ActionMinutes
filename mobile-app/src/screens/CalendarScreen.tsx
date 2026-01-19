import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  format,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameDay,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isToday,
} from 'date-fns';
import { api } from '../services/api';
import { Card } from '../components/Card';
import { colors, spacing, fontSize, borderRadius } from '../utils/colors';

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  allDay?: boolean;
  provider?: string;
  providerEventId?: string;
}

type ViewMode = 'day' | 'week' | 'month';

export default function CalendarScreen() {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [refreshing, setRefreshing] = useState(false);

  const startDate = viewMode === 'month' 
    ? startOfMonth(selectedDate) 
    : startOfWeek(selectedDate);
  const endDate = viewMode === 'month' 
    ? endOfMonth(selectedDate) 
    : endOfWeek(selectedDate);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['calendarEvents', startDate.toISOString(), endDate.toISOString()],
    queryFn: async () => {
      const response = await api.get<CalendarEvent[]>(
        `/api/calendar/events?start=${startDate.toISOString()}&end=${endDate.toISOString()}`
      );
      return response.data || [];
    },
  });

  const { data: providers = [] } = useQuery({
    queryKey: ['calendarProviders'],
    queryFn: async () => {
      const response = await api.get<{ provider: string; connected: boolean }[]>(
        '/api/calendar/providers'
      );
      return response.data || [];
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['calendarEvents'] });
    setRefreshing(false);
  }, [queryClient]);

  const handleSync = async () => {
    await api.post('/api/calendar/sync');
    await queryClient.invalidateQueries({ queryKey: ['calendarEvents'] });
  };

  const navigateDate = (direction: number) => {
    const days = viewMode === 'month' ? 30 : viewMode === 'week' ? 7 : 1;
    setSelectedDate(addDays(selectedDate, direction * days));
  };

  const weekDays = eachDayOfInterval({
    start: startOfWeek(selectedDate),
    end: endOfWeek(selectedDate),
  });

  const eventsForDate = (date: Date) =>
    events.filter((e) => isSameDay(new Date(e.startTime), date));

  const selectedEvents = eventsForDate(selectedDate);

  const renderEvent = ({ item }: { item: CalendarEvent }) => (
    <Card style={styles.eventCard}>
      <View style={styles.eventTime}>
        {item.allDay ? (
          <Text style={styles.allDayText}>All Day</Text>
        ) : (
          <>
            <Text style={styles.eventTimeText}>
              {format(new Date(item.startTime), 'h:mm a')}
            </Text>
            <Text style={styles.eventTimeSeparator}>-</Text>
            <Text style={styles.eventTimeText}>
              {format(new Date(item.endTime), 'h:mm a')}
            </Text>
          </>
        )}
      </View>
      <View style={styles.eventContent}>
        <Text style={styles.eventTitle} numberOfLines={1}>
          {item.title}
        </Text>
        {item.description && (
          <Text style={styles.eventDescription} numberOfLines={2}>
            {item.description}
          </Text>
        )}
        {item.provider && (
          <View style={styles.providerBadge}>
            <Ionicons
              name={item.provider === 'google' ? 'logo-google' : 'mail'}
              size={12}
              color={colors.text.tertiary}
            />
            <Text style={styles.providerText}>
              {item.provider === 'google' ? 'Google' : 'Outlook'}
            </Text>
          </View>
        )}
      </View>
    </Card>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Calendar</Text>
        <TouchableOpacity style={styles.syncButton} onPress={handleSync}>
          <Ionicons name="sync" size={20} color={colors.text.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.navigation}>
        <TouchableOpacity onPress={() => navigateDate(-1)}>
          <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>
          {format(selectedDate, viewMode === 'month' ? 'MMMM yyyy' : 'MMMM d, yyyy')}
        </Text>
        <TouchableOpacity onPress={() => navigateDate(1)}>
          <Ionicons name="chevron-forward" size={24} color={colors.text.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.viewToggle}>
        {(['day', 'week', 'month'] as ViewMode[]).map((mode) => (
          <TouchableOpacity
            key={mode}
            style={[styles.viewButton, viewMode === mode && styles.viewButtonActive]}
            onPress={() => setViewMode(mode)}
          >
            <Text
              style={[styles.viewButtonText, viewMode === mode && styles.viewButtonTextActive]}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.weekStrip}>
        {weekDays.map((day) => {
          const dayEvents = eventsForDate(day);
          const isSelected = isSameDay(day, selectedDate);
          const dayIsToday = isToday(day);
          
          return (
            <TouchableOpacity
              key={day.toISOString()}
              style={[
                styles.dayItem,
                isSelected && styles.dayItemSelected,
                dayIsToday && !isSelected && styles.dayItemToday,
              ]}
              onPress={() => setSelectedDate(day)}
            >
              <Text
                style={[
                  styles.dayName,
                  isSelected && styles.dayTextSelected,
                ]}
              >
                {format(day, 'EEE')}
              </Text>
              <Text
                style={[
                  styles.dayNumber,
                  isSelected && styles.dayTextSelected,
                  dayIsToday && !isSelected && styles.dayNumberToday,
                ]}
              >
                {format(day, 'd')}
              </Text>
              {dayEvents.length > 0 && (
                <View
                  style={[
                    styles.eventDot,
                    isSelected && styles.eventDotSelected,
                  ]}
                />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.selectedDateHeader}>
        <Text style={styles.selectedDateText}>
          {format(selectedDate, 'EEEE, MMMM d')}
        </Text>
        <Text style={styles.eventCount}>
          {selectedEvents.length} event{selectedEvents.length !== 1 ? 's' : ''}
        </Text>
      </View>

      <FlatList
        data={selectedEvents}
        renderItem={renderEvent}
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
                name="calendar-outline"
                size={48}
                color={colors.text.muted}
              />
              <Text style={styles.emptyTitle}>No events</Text>
              <Text style={styles.emptyText}>
                Connect your calendar to see events
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
    paddingBottom: spacing.sm,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.text.primary,
  },
  syncButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  navTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text.primary,
  },
  viewToggle: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.xs,
  },
  viewButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.sm,
  },
  viewButtonActive: {
    backgroundColor: colors.primary,
  },
  viewButtonText: {
    fontSize: fontSize.sm,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  viewButtonTextActive: {
    color: colors.text.primary,
  },
  weekStrip: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  dayItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  dayItemSelected: {
    backgroundColor: colors.primary,
  },
  dayItemToday: {
    borderWidth: 1,
    borderColor: colors.primary,
  },
  dayName: {
    fontSize: fontSize.xs,
    color: colors.text.tertiary,
    marginBottom: 4,
  },
  dayNumber: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text.primary,
  },
  dayNumberToday: {
    color: colors.primary,
  },
  dayTextSelected: {
    color: colors.text.primary,
  },
  eventDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
    marginTop: 4,
  },
  eventDotSelected: {
    backgroundColor: colors.text.primary,
  },
  selectedDateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  selectedDateText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text.primary,
  },
  eventCount: {
    fontSize: fontSize.sm,
    color: colors.text.secondary,
  },
  listContent: {
    padding: spacing.lg,
  },
  eventCard: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  eventTime: {
    width: 80,
    alignItems: 'flex-end',
    marginRight: spacing.md,
  },
  eventTimeText: {
    fontSize: fontSize.sm,
    color: colors.text.secondary,
  },
  eventTimeSeparator: {
    fontSize: fontSize.xs,
    color: colors.text.muted,
  },
  allDayText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: '500',
  },
  eventContent: {
    flex: 1,
  },
  eventTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 2,
  },
  eventDescription: {
    fontSize: fontSize.sm,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  providerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  providerText: {
    fontSize: fontSize.xs,
    color: colors.text.tertiary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyTitle: {
    fontSize: fontSize.md,
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
