import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RootStackParamList } from '../navigation';
import { api } from '../services/api';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { colors, spacing, fontSize, borderRadius } from '../utils/colors';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type ScreenRouteProp = RouteProp<RootStackParamList, 'Extraction'>;

interface Meeting {
  id: string;
  title: string;
  rawNotes: string;
  summary?: string;
  extractedAt?: string;
}

interface ActionItem {
  id: string;
  description: string;
  ownerName?: string;
  dueDate?: string;
  status: string;
  confidence?: number;
}

interface Decision {
  id: string;
  description: string;
  madeBy?: string;
  rationale?: string;
}

interface Risk {
  id: string;
  description: string;
  severity: string;
  mitigation?: string;
}

export default function ExtractionScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ScreenRouteProp>();
  const queryClient = useQueryClient();
  const { meetingId } = route.params;
  const [isExtracting, setIsExtracting] = useState(false);

  const { data: meeting, isLoading: loadingMeeting } = useQuery({
    queryKey: ['meeting', meetingId],
    queryFn: async () => {
      const response = await api.get<Meeting>(`/api/meetings/${meetingId}`);
      return response.data;
    },
  });

  const { data: actionItems = [] } = useQuery({
    queryKey: ['actionItems', meetingId],
    queryFn: async () => {
      const response = await api.get<ActionItem[]>(`/api/meetings/${meetingId}/action-items`);
      return response.data || [];
    },
  });

  const { data: decisions = [] } = useQuery({
    queryKey: ['decisions', meetingId],
    queryFn: async () => {
      const response = await api.get<Decision[]>(`/api/meetings/${meetingId}/decisions`);
      return response.data || [];
    },
  });

  const { data: risks = [] } = useQuery({
    queryKey: ['risks', meetingId],
    queryFn: async () => {
      const response = await api.get<Risk[]>(`/api/meetings/${meetingId}/risks`);
      return response.data || [];
    },
  });

  const extractMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post(`/api/meetings/${meetingId}/extract`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meeting', meetingId] });
      queryClient.invalidateQueries({ queryKey: ['actionItems', meetingId] });
      queryClient.invalidateQueries({ queryKey: ['decisions', meetingId] });
      queryClient.invalidateQueries({ queryKey: ['risks', meetingId] });
      Alert.alert('Success', 'AI extraction completed!');
    },
    onError: (error) => {
      Alert.alert('Error', 'Failed to extract. Please try again.');
    },
  });

  const handleExtract = () => {
    setIsExtracting(true);
    extractMutation.mutate(undefined, {
      onSettled: () => setIsExtracting(false),
    });
  };

  if (loadingMeeting) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const hasExtraction = meeting?.extractedAt;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Card style={styles.meetingCard}>
          <Text style={styles.meetingTitle}>{meeting?.title || 'Untitled'}</Text>
          <Text style={styles.notesPreview} numberOfLines={4}>
            {meeting?.rawNotes}
          </Text>
        </Card>

        {!hasExtraction ? (
          <Card style={styles.extractCard}>
            <View style={styles.extractIcon}>
              <Ionicons name="sparkles" size={32} color={colors.primary} />
            </View>
            <Text style={styles.extractTitle}>AI Extraction</Text>
            <Text style={styles.extractDescription}>
              Let AI analyze your meeting notes to extract action items,
              decisions, and risks automatically.
            </Text>
            <Button
              title={isExtracting ? 'Extracting...' : 'Start Extraction'}
              onPress={handleExtract}
              loading={isExtracting}
              style={styles.extractButton}
            />
          </Card>
        ) : (
          <>
            {meeting?.summary && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Summary</Text>
                <Card>
                  <Text style={styles.summaryText}>{meeting.summary}</Text>
                </Card>
              </View>
            )}

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Action Items</Text>
                <Badge text={`${actionItems.length}`} variant="violet" size="sm" />
              </View>
              {actionItems.length === 0 ? (
                <Text style={styles.emptyText}>No action items found</Text>
              ) : (
                actionItems.map((item) => (
                  <Card key={item.id} style={styles.itemCard}>
                    <View style={styles.itemHeader}>
                      <Ionicons
                        name={item.status === 'done' ? 'checkmark-circle' : 'ellipse-outline'}
                        size={20}
                        color={item.status === 'done' ? colors.success : colors.text.tertiary}
                      />
                      <Text style={styles.itemDescription}>{item.description}</Text>
                    </View>
                    {(item.ownerName || item.dueDate) && (
                      <View style={styles.itemMeta}>
                        {item.ownerName && (
                          <View style={styles.metaItem}>
                            <Ionicons name="person-outline" size={12} color={colors.text.tertiary} />
                            <Text style={styles.metaText}>{item.ownerName}</Text>
                          </View>
                        )}
                        {item.dueDate && (
                          <View style={styles.metaItem}>
                            <Ionicons name="calendar-outline" size={12} color={colors.text.tertiary} />
                            <Text style={styles.metaText}>{item.dueDate}</Text>
                          </View>
                        )}
                      </View>
                    )}
                  </Card>
                ))
              )}
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Decisions</Text>
                <Badge text={`${decisions.length}`} variant="emerald" size="sm" />
              </View>
              {decisions.length === 0 ? (
                <Text style={styles.emptyText}>No decisions found</Text>
              ) : (
                decisions.map((decision) => (
                  <Card key={decision.id} style={styles.itemCard}>
                    <Text style={styles.itemDescription}>{decision.description}</Text>
                    {decision.madeBy && (
                      <View style={styles.metaItem}>
                        <Ionicons name="person-outline" size={12} color={colors.text.tertiary} />
                        <Text style={styles.metaText}>By {decision.madeBy}</Text>
                      </View>
                    )}
                  </Card>
                ))
              )}
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Risks</Text>
                <Badge text={`${risks.length}`} variant="warning" size="sm" />
              </View>
              {risks.length === 0 ? (
                <Text style={styles.emptyText}>No risks identified</Text>
              ) : (
                risks.map((risk) => (
                  <Card key={risk.id} style={styles.itemCard}>
                    <View style={styles.itemHeader}>
                      <Ionicons name="warning-outline" size={18} color={colors.warning} />
                      <Text style={styles.itemDescription}>{risk.description}</Text>
                    </View>
                    {risk.mitigation && (
                      <Text style={styles.mitigationText}>
                        Mitigation: {risk.mitigation}
                      </Text>
                    )}
                  </Card>
                ))
              )}
            </View>

            <Button
              title="Re-extract"
              variant="outline"
              onPress={handleExtract}
              loading={isExtracting}
              style={styles.reextractButton}
            />
          </>
        )}
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
  meetingCard: {
    marginBottom: spacing.lg,
  },
  meetingTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  notesPreview: {
    fontSize: fontSize.sm,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  extractCard: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  extractIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  extractTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  extractDescription: {
    fontSize: fontSize.sm,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  extractButton: {
    width: '100%',
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text.primary,
  },
  summaryText: {
    fontSize: fontSize.sm,
    color: colors.text.secondary,
    lineHeight: 22,
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.text.muted,
    fontStyle: 'italic',
  },
  itemCard: {
    marginBottom: spacing.sm,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  itemDescription: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.text.primary,
    lineHeight: 20,
  },
  itemMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.sm,
    marginLeft: 28,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: fontSize.xs,
    color: colors.text.tertiary,
  },
  mitigationText: {
    fontSize: fontSize.xs,
    color: colors.text.secondary,
    marginTop: spacing.sm,
    marginLeft: 26,
    fontStyle: 'italic',
  },
  reextractButton: {
    marginTop: spacing.md,
  },
});
