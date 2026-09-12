import React from 'react';
import {ActivityIndicator, StyleSheet, Text, View} from 'react-native';
import type {ApiError} from '../api/client';
import {presentError} from '../api/errors';
import {Icon, IconName} from '../icons';
import {colors, radius, spacing, tones, type as typography} from '../theme';
import {ActionButton} from './ActionButton';
import {Note} from './blocks';

export function Loading({label = 'Reading live state…'}: {label?: string}) {
  return (
    <View style={styles.centre}>
      <ActivityIndicator size="large" color={colors.green} />
      <Text style={styles.small}>{label}</Text>
    </View>
  );
}

/**
 * Shows the service's own message together with what it means for the farmer.
 * A failed read never implies anything about equipment state.
 */
export function ErrorState({error, onRetry}: {error: ApiError; onRetry?: () => void}) {
  const presentation = presentError(error);
  return (
    <View style={styles.errorBox}>
      <Note
        icon={presentation.icon}
        label={presentation.headline}
        sub={presentation.guidance}
        tone={presentation.tone}
      />
      <View style={[styles.detail, {backgroundColor: tones[presentation.tone].bg}]}>
        <Text style={[styles.detailText, {color: tones[presentation.tone].fg}]}>{error.message}</Text>
        <Text style={[styles.code, {color: tones[presentation.tone].fg}]}>{error.code}</Text>
      </View>
      {onRetry ? <ActionButton label="Try again" icon="refresh" tone="outline" onPress={onRetry} /> : null}
    </View>
  );
}

export function EmptyState({
  icon = 'leaf',
  title,
  sub,
}: {
  icon?: IconName;
  title: string;
  sub?: string;
}) {
  return (
    <View style={styles.centre}>
      <View style={styles.emptyBadge}>
        <Icon name={icon} color={colors.green} size={40} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {sub ? <Text style={styles.small}>{sub}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  centre: {alignItems: 'center', justifyContent: 'center', paddingVertical: 48, gap: 14},
  small: {...typography.small, color: colors.muted, textAlign: 'center'},
  errorBox: {gap: spacing.gap},
  detail: {borderRadius: radius.card, padding: spacing.inner, gap: 6},
  detailText: {...typography.small},
  code: {fontSize: 12, fontWeight: '700', letterSpacing: 0.6},
  emptyBadge: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.sage,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {...typography.body, color: colors.ink, textAlign: 'center'},
});
