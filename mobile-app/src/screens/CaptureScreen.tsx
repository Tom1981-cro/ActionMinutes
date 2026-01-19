import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { RootStackParamList } from '../navigation';
import { api } from '../services/api';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { colors, spacing, fontSize, borderRadius } from '../utils/colors';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type CaptureMode = 'text' | 'camera' | 'audio';

export default function CaptureScreen() {
  const navigation = useNavigation<NavigationProp>();
  const queryClient = useQueryClient();
  
  const [mode, setMode] = useState<CaptureMode>('text');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const createMeeting = useMutation({
    mutationFn: async (data: { title: string; rawNotes: string }) => {
      const response = await api.post('/api/meetings', data);
      return response.data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      Alert.alert('Success', 'Meeting captured! Would you like to extract action items?', [
        { text: 'Later', style: 'cancel' },
        {
          text: 'Extract Now',
          onPress: () => navigation.navigate('Extraction', { meetingId: data.id }),
        },
      ]);
      setTitle('');
      setContent('');
    },
    onError: (error) => {
      Alert.alert('Error', 'Failed to save meeting. Please try again.');
    },
  });

  const handleCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera access is required to scan notes.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.9,
      allowsEditing: true,
    });

    if (!result.canceled && result.assets[0]) {
      setIsProcessing(true);
      try {
        const response = await api.uploadFile<{ text: string }>('/api/ocr', {
          uri: result.assets[0].uri,
          name: 'scan.jpg',
          type: 'image/jpeg',
        });
        
        if (response.data?.text) {
          setContent((prev) => prev + (prev ? '\n\n' : '') + response.data!.text);
          setMode('text');
        }
      } catch (error) {
        Alert.alert('Error', 'Failed to process image. Please try again.');
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      quality: 0.9,
      allowsEditing: true,
    });

    if (!result.canceled && result.assets[0]) {
      setIsProcessing(true);
      try {
        const response = await api.uploadFile<{ text: string }>('/api/ocr', {
          uri: result.assets[0].uri,
          name: 'image.jpg',
          type: 'image/jpeg',
        });
        
        if (response.data?.text) {
          setContent((prev) => prev + (prev ? '\n\n' : '') + response.data!.text);
          setMode('text');
        }
      } catch (error) {
        Alert.alert('Error', 'Failed to process image. Please try again.');
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleSave = () => {
    if (!content.trim()) {
      Alert.alert('Missing content', 'Please add some notes before saving.');
      return;
    }
    
    createMeeting.mutate({
      title: title.trim() || 'Untitled Meeting',
      rawNotes: content.trim(),
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>Capture</Text>
          <Text style={styles.subtitle}>
            Record meeting notes or scan handwritten notes
          </Text>
        </View>

        <View style={styles.modeSelector}>
          <TouchableOpacity
            style={[styles.modeButton, mode === 'text' && styles.modeButtonActive]}
            onPress={() => setMode('text')}
          >
            <Ionicons
              name="create-outline"
              size={20}
              color={mode === 'text' ? colors.primary : colors.text.tertiary}
            />
            <Text
              style={[styles.modeText, mode === 'text' && styles.modeTextActive]}
            >
              Type
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeButton, mode === 'camera' && styles.modeButtonActive]}
            onPress={() => setMode('camera')}
          >
            <Ionicons
              name="camera-outline"
              size={20}
              color={mode === 'camera' ? colors.primary : colors.text.tertiary}
            />
            <Text
              style={[styles.modeText, mode === 'camera' && styles.modeTextActive]}
            >
              Scan
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeButton, mode === 'audio' && styles.modeButtonActive]}
            onPress={() => setMode('audio')}
          >
            <Ionicons
              name="mic-outline"
              size={20}
              color={mode === 'audio' ? colors.primary : colors.text.tertiary}
            />
            <Text
              style={[styles.modeText, mode === 'audio' && styles.modeTextActive]}
            >
              Record
            </Text>
          </TouchableOpacity>
        </View>

        {mode === 'camera' && (
          <Card style={styles.scanCard}>
            {isProcessing ? (
              <View style={styles.processingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.processingText}>Processing image...</Text>
              </View>
            ) : (
              <View style={styles.scanOptions}>
                <TouchableOpacity style={styles.scanButton} onPress={handleCamera}>
                  <View style={styles.scanIconContainer}>
                    <Ionicons name="camera" size={32} color={colors.primary} />
                  </View>
                  <Text style={styles.scanButtonText}>Take Photo</Text>
                  <Text style={styles.scanButtonHint}>
                    Capture handwritten notes
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.scanButton} onPress={handleGallery}>
                  <View style={styles.scanIconContainer}>
                    <Ionicons name="images" size={32} color={colors.primary} />
                  </View>
                  <Text style={styles.scanButtonText}>Choose Photo</Text>
                  <Text style={styles.scanButtonHint}>
                    Select from gallery
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </Card>
        )}

        {mode === 'audio' && (
          <Card style={styles.audioCard}>
            <View style={styles.audioContent}>
              <TouchableOpacity style={styles.recordButton}>
                <Ionicons name="mic" size={48} color={colors.text.primary} />
              </TouchableOpacity>
              <Text style={styles.audioHint}>
                Tap to start recording
              </Text>
              <Text style={styles.audioSubhint}>
                Your voice will be transcribed automatically
              </Text>
            </View>
          </Card>
        )}

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.titleInput}
            placeholder="Meeting title (optional)"
            placeholderTextColor={colors.text.muted}
            value={title}
            onChangeText={setTitle}
          />

          <TextInput
            style={styles.contentInput}
            placeholder="Start typing your meeting notes..."
            placeholderTextColor={colors.text.muted}
            value={content}
            onChangeText={setContent}
            multiline
            textAlignVertical="top"
          />
        </View>

        <View style={styles.actions}>
          <Button
            title="Save & Extract"
            onPress={handleSave}
            loading={createMeeting.isPending}
            disabled={!content.trim()}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  header: {
    marginBottom: spacing.lg,
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
  modeSelector: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.xs,
    marginBottom: spacing.lg,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  modeButtonActive: {
    backgroundColor: colors.surfaceElevated,
  },
  modeText: {
    fontSize: fontSize.sm,
    color: colors.text.tertiary,
    fontWeight: '500',
  },
  modeTextActive: {
    color: colors.primary,
  },
  scanCard: {
    marginBottom: spacing.lg,
  },
  processingContainer: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  processingText: {
    color: colors.text.secondary,
    marginTop: spacing.md,
  },
  scanOptions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  scanButton: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.lg,
  },
  scanIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  scanButtonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text.primary,
  },
  scanButtonHint: {
    fontSize: fontSize.xs,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  audioCard: {
    marginBottom: spacing.lg,
  },
  audioContent: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  recordButton: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  audioHint: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text.primary,
  },
  audioSubhint: {
    fontSize: fontSize.sm,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
  },
  inputContainer: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  titleInput: {
    color: colors.text.primary,
    fontSize: fontSize.lg,
    fontWeight: '600',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  contentInput: {
    color: colors.text.primary,
    fontSize: fontSize.md,
    padding: spacing.md,
    minHeight: 200,
    lineHeight: 24,
  },
  actions: {
    marginTop: spacing.md,
  },
});
