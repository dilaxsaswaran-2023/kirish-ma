import React from 'react';
import {ActivityIndicator, Pressable, StyleSheet, Text, View} from 'react-native';
import {Icon, IconName} from '../icons';
import {colors, radius, sizes, type as typography} from '../theme';

export type ActionTone = 'green' | 'outline' | 'red' | 'amber' | 'ghost';

const palette: Record<ActionTone, {background: string; text: string; border: string}> = {
  green: {background: colors.green, text: colors.white, border: colors.green},
  red: {background: colors.red, text: colors.white, border: colors.red},
  amber: {background: colors.amber, text: colors.white, border: colors.amber},
  outline: {background: colors.white, text: colors.green, border: colors.line},
  ghost: {background: 'transparent', text: colors.green, border: 'transparent'},
};

type Props = {
  label: string;
  onPress: () => void;
  icon?: IconName;
  tone?: ActionTone;
  busy?: boolean;
  disabled?: boolean;
};

/** 56 px primary action, large enough to be used with wet or gloved hands. */
export function ActionButton({label, onPress, icon = 'next', tone = 'green', busy, disabled}: Props) {
  const scheme = palette[tone];
  const inactive = disabled || busy;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{disabled: Boolean(inactive), busy: Boolean(busy)}}
      onPress={onPress}
      disabled={inactive}
      style={({pressed}) => [
        styles.button,
        {backgroundColor: scheme.background, borderColor: scheme.border},
        pressed ? styles.pressed : null,
        inactive ? styles.inactive : null,
      ]}>
      <View style={styles.inner}>
        {busy ? (
          <ActivityIndicator color={scheme.text} />
        ) : (
          <Icon name={icon} color={scheme.text} size={24} />
        )}
        <Text style={[styles.label, {color: scheme.text}]} numberOfLines={1}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: sizes.action,
    borderRadius: radius.action,
    borderWidth: 1,
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  inner: {flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12},
  label: {...typography.action, flexShrink: 1},
  pressed: {opacity: 0.82},
  inactive: {opacity: 0.55},
});
