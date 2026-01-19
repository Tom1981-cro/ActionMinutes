import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, borderRadius, spacing, fontSize } from '../utils/colors';

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'violet' | 'fuchsia' | 'amber' | 'emerald';

interface BadgeProps {
  text: string;
  variant?: BadgeVariant;
  style?: ViewStyle;
  size?: 'sm' | 'md';
}

export function Badge({ text, variant = 'default', style, size = 'md' }: BadgeProps) {
  return (
    <View style={[styles.base, styles[variant], styles[`size_${size}`], style]}>
      <Text style={[styles.text, styles[`text_${variant}`], styles[`text_${size}`]]}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
  },
  size_sm: {
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
  },
  size_md: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm + 2,
  },
  
  default: {
    backgroundColor: colors.surfaceElevated,
  },
  success: {
    backgroundColor: colors.feature.emerald.bg,
  },
  warning: {
    backgroundColor: colors.feature.amber.bg,
  },
  error: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  info: {
    backgroundColor: colors.feature.blue.bg,
  },
  violet: {
    backgroundColor: colors.feature.violet.bg,
  },
  fuchsia: {
    backgroundColor: colors.feature.fuchsia.bg,
  },
  amber: {
    backgroundColor: colors.feature.amber.bg,
  },
  emerald: {
    backgroundColor: colors.feature.emerald.bg,
  },
  
  text: {
    fontWeight: '500',
  },
  text_sm: {
    fontSize: fontSize.xs - 1,
  },
  text_md: {
    fontSize: fontSize.xs,
  },
  text_default: {
    color: colors.text.secondary,
  },
  text_success: {
    color: colors.feature.emerald.text,
  },
  text_warning: {
    color: colors.feature.amber.text,
  },
  text_error: {
    color: colors.error,
  },
  text_info: {
    color: colors.feature.blue.text,
  },
  text_violet: {
    color: colors.feature.violet.text,
  },
  text_fuchsia: {
    color: colors.feature.fuchsia.text,
  },
  text_amber: {
    color: colors.feature.amber.text,
  },
  text_emerald: {
    color: colors.feature.emerald.text,
  },
});
