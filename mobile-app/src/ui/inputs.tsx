import React from 'react';
import {Pressable, StyleSheet, Text, TextInput, View} from 'react-native';
import {Icon, IconName} from '../icons';
import {colors, radius, sizes, spacing, type as typography} from '../theme';

export function InputField({
  label,
  value,
  onChangeText,
  icon = 'edit',
  placeholder,
  autoCapitalize = 'none',
  keyboardType,
  hint,
}: {
  label: string;
  value: string;
  onChangeText: (next: string) => void;
  icon?: IconName;
  placeholder?: string;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?: 'default' | 'url' | 'numeric';
  hint?: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          keyboardType={keyboardType}
          accessibilityLabel={label}
        />
        <Icon name={icon} color={colors.green} size={20} />
      </View>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

/** A row of one-tap suggestions that fill a text field. */
export function QuickPicks({
  label,
  options,
  value,
  onPick,
}: {
  label: string;
  options: {value: string; label: string}[];
  value: string;
  onPick: (next: string) => void;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.segmentRow}>
        {options.map(option => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              accessibilityState={{selected}}
              accessibilityLabel={`${option.label}: ${option.value}`}
              onPress={() => onPick(option.value)}
              style={[styles.segment, selected ? styles.segmentSelected : null]}>
              <Text style={[styles.segmentText, selected ? styles.segmentTextSelected : null]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: {value: T; label: string}[];
  value: T;
  onChange: (next: T) => void;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.segmentRow}>
        {options.map(option => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{selected}}
              onPress={() => onChange(option.value)}
              style={[styles.segment, selected ? styles.segmentSelected : null]}>
              <Text style={[styles.segmentText, selected ? styles.segmentTextSelected : null]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.card,
    padding: spacing.inner,
    gap: 7,
  },
  label: {...typography.small, color: colors.muted},
  inputRow: {flexDirection: 'row', alignItems: 'center', gap: 10},
  input: {
    flex: 1,
    ...typography.body,
    color: colors.ink,
    paddingVertical: 6,
    minHeight: 34,
  },
  hint: {fontSize: 12, color: colors.muted},
  segmentRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4},
  segment: {
    minHeight: sizes.touch - 8,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: colors.sage,
    borderWidth: 1,
    borderColor: colors.line,
  },
  segmentSelected: {backgroundColor: colors.green, borderColor: colors.green},
  segmentText: {fontSize: 14, fontWeight: '600', color: colors.green},
  segmentTextSelected: {color: colors.white},
});
