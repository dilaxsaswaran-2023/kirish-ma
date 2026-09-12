import React from 'react';
import {Pressable, StyleSheet, Text, View, ViewStyle} from 'react-native';
import {Icon, IconName} from '../icons';
import {colors, radius, sizes, spacing, Tone, tones, type as typography} from '../theme';

/**
 * The building blocks of the farmer screens: badge, card, row, note, hero,
 * field, steps, tiles and metrics. Sizes and colours come from the design
 * package so a screen assembled here matches the prototype frame for frame.
 */

export function Badge({
  icon,
  tone = 'green',
  size = sizes.touch,
  onDark = false,
}: {
  icon: IconName;
  tone?: Tone;
  size?: number;
  onDark?: boolean;
}) {
  const palette = tones[tone];
  return (
    <View
      style={[
        styles.badge,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: palette.bg,
        },
        onDark ? styles.badgeOnDark : null,
      ]}>
      <Icon name={icon} color={onDark ? colors.lime : palette.fg} size={Math.round(size * 0.58)} />
    </View>
  );
}

export function Card({children, style}: {children: React.ReactNode; style?: ViewStyle}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionLabel({children}: {children: React.ReactNode}) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

type RowProps = {
  icon: IconName;
  label: string;
  sub?: string;
  tone?: Tone;
  /** Short status word shown on the right, e.g. "On" or "Offline". */
  badge?: string;
  onPress?: () => void;
  disabled?: boolean;
};

export function Row({icon, label, sub, tone = 'green', badge, onPress, disabled}: RowProps) {
  const palette = tones[tone];
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={sub ? `${label}. ${sub}` : label}
      onPress={onPress}
      disabled={!onPress || disabled}
      style={({pressed}) => [styles.card, styles.row, pressed && onPress ? styles.pressed : null]}>
      <Badge icon={icon} tone={tone} />
      <View style={styles.copy}>
        <Text style={styles.rowLabel}>{label}</Text>
        {sub ? <Text style={styles.small}>{sub}</Text> : null}
      </View>
      {badge ? (
        <View style={[styles.pill, {backgroundColor: palette.bg}]}>
          <Text style={[styles.pillText, {color: palette.fg}]}>{badge}</Text>
        </View>
      ) : null}
      {onPress ? <Icon name="next" color={colors.muted} size={20} /> : null}
    </Pressable>
  );
}

export function Note({
  icon,
  label,
  sub,
  tone = 'green',
}: {
  icon: IconName;
  label: string;
  sub?: string;
  tone?: Tone;
}) {
  const palette = tones[tone];
  return (
    <View style={[styles.note, {backgroundColor: palette.bg}]}>
      <Icon name={icon} color={palette.fg} size={22} />
      <View style={styles.copy}>
        <Text style={[styles.noteLabel, {color: palette.fg}]}>{label}</Text>
        {sub ? <Text style={[styles.small, {color: palette.fg}]}>{sub}</Text> : null}
      </View>
    </View>
  );
}

export type HeroTone = 'forest' | 'amber' | 'red' | 'blue';

const heroBackground: Record<HeroTone, string> = {
  forest: colors.forest,
  amber: colors.amber,
  red: colors.red,
  blue: colors.blue,
};

export function Hero({
  icon,
  label,
  value,
  sub,
  tone = 'forest',
  children,
}: {
  icon: IconName;
  label: string;
  value: string;
  sub?: string;
  tone?: HeroTone;
  children?: React.ReactNode;
}) {
  return (
    <View style={[styles.hero, {backgroundColor: heroBackground[tone]}]}>
      <View style={styles.heroTop}>
        <Badge icon={icon} size={56} onDark />
        <View style={styles.copy}>
          <Text style={styles.heroLabel}>{label}</Text>
          <Text style={styles.heroValue}>{value}</Text>
        </View>
      </View>
      {sub ? <Text style={styles.heroSub}>{sub}</Text> : null}
      {children}
    </View>
  );
}

export function Field({
  label,
  value,
  icon = 'edit',
  onPress,
}: {
  label: string;
  value: string;
  icon?: IconName;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      onPress={onPress}
      disabled={!onPress}
      style={({pressed}) => [styles.card, pressed && onPress ? styles.pressed : null]}>
      <Text style={styles.small}>{label}</Text>
      <View style={styles.fieldValue}>
        <Text style={styles.rowLabel}>{value}</Text>
        <Icon name={icon} color={colors.green} size={20} />
      </View>
    </Pressable>
  );
}

export type Step = {
  icon: IconName;
  label: string;
  sub?: string;
  tone?: Tone;
  onPress?: () => void;
};

export function Steps({items}: {items: Step[]}) {
  return (
    <View style={[styles.card, styles.stepsCard]}>
      {items.map((step, index) => (
        <Pressable
          key={`${step.label}-${index}`}
          accessibilityRole={step.onPress ? 'button' : undefined}
          onPress={step.onPress}
          disabled={!step.onPress}
          style={[styles.step, index > 0 ? styles.stepDivider : null]}>
          <Badge icon={step.icon} tone={step.tone ?? 'green'} size={44} />
          <View style={styles.copy}>
            <Text style={styles.rowLabel}>{step.label}</Text>
            {step.sub ? <Text style={styles.small}>{step.sub}</Text> : null}
          </View>
          {step.onPress ? <Icon name="next" color={colors.muted} size={18} /> : null}
        </Pressable>
      ))}
    </View>
  );
}

export type Tile = {icon: IconName; label: string; sub?: string; tone?: Tone; onPress?: () => void};

export function Tiles({items}: {items: Tile[]}) {
  return (
    <View style={styles.grid}>
      {items.map((tile, index) => (
        <Pressable
          key={`${tile.label}-${index}`}
          accessibilityRole={tile.onPress ? 'button' : undefined}
          onPress={tile.onPress}
          disabled={!tile.onPress}
          style={({pressed}) => [
            styles.card,
            styles.gridItem,
            pressed && tile.onPress ? styles.pressed : null,
          ]}>
          <Badge icon={tile.icon} tone={tile.tone ?? 'green'} size={44} />
          <Text style={styles.rowLabel}>{tile.label}</Text>
          {tile.sub ? <Text style={styles.small}>{tile.sub}</Text> : null}
        </Pressable>
      ))}
    </View>
  );
}

export type Metric = {icon: IconName; value: string; label: string; tone?: Tone};

export function Metrics({items}: {items: Metric[]}) {
  return (
    <View style={styles.grid}>
      {items.map((metric, index) => (
        <View key={`${metric.label}-${index}`} style={[styles.card, styles.gridItem]}>
          <Badge icon={metric.icon} tone={metric.tone ?? 'green'} size={44} />
          <Text style={styles.metricValue}>{metric.value}</Text>
          <Text style={styles.small}>{metric.label}</Text>
        </View>
      ))}
    </View>
  );
}

/** Single-choice list, e.g. picking which valve a run should use. */
export function Choices<T extends {id: string}>({
  items,
  selectedId,
  onSelect,
  renderLabel,
  renderSub,
  iconFor,
  toneFor,
  disabledFor,
}: {
  items: T[];
  selectedId: string | undefined;
  onSelect: (item: T) => void;
  renderLabel: (item: T) => string;
  renderSub: (item: T) => string;
  iconFor: (item: T) => IconName;
  toneFor?: (item: T) => Tone;
  disabledFor?: (item: T) => boolean;
}) {
  return (
    <View style={styles.choices}>
      {items.map(item => {
        const selected = item.id === selectedId;
        const disabled = disabledFor?.(item) ?? false;
        const tone = toneFor?.(item) ?? 'green';
        return (
          <Pressable
            key={item.id}
            accessibilityRole="radio"
            accessibilityState={{selected, disabled}}
            onPress={() => onSelect(item)}
            disabled={disabled}
            style={({pressed}) => [
              styles.card,
              styles.row,
              selected ? styles.chosen : null,
              disabled ? styles.disabled : null,
              pressed && !disabled ? styles.pressed : null,
            ]}>
            <Badge icon={iconFor(item)} tone={tone} />
            <View style={styles.copy}>
              <Text style={styles.rowLabel}>{renderLabel(item)}</Text>
              <Text style={styles.small}>{renderSub(item)}</Text>
            </View>
            {selected ? <Icon name="check" color={colors.green} size={22} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

/** Simple bar chart used for the readings screen. */
export function Bars({values, labels}: {values: number[]; labels?: string[]}) {
  const peak = Math.max(1, ...values);
  return (
    <View style={styles.card}>
      <View style={styles.bars}>
        {values.map((value, index) => (
          <View key={index} style={styles.barColumn}>
            <View style={[styles.bar, {height: Math.max(6, (value / peak) * 150)}]} />
            {labels?.[index] ? <Text style={styles.barLabel}>{labels[index]}</Text> : null}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {alignItems: 'center', justifyContent: 'center'},
  badgeOnDark: {backgroundColor: 'rgba(255,255,255,0.13)'},
  card: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.card,
    padding: spacing.inner,
  },
  pressed: {opacity: 0.72},
  disabled: {opacity: 0.55},
  row: {flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: sizes.row},
  copy: {flex: 1, gap: 5, minWidth: 0},
  rowLabel: {...typography.body, color: colors.ink},
  small: {...typography.small, color: colors.muted},
  sectionLabel: {
    ...typography.label,
    color: colors.muted,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  pill: {paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill},
  pillText: {fontSize: 13, fontWeight: '700'},
  note: {flexDirection: 'row', gap: 12, padding: spacing.inner, borderRadius: radius.card},
  noteLabel: {...typography.body},
  hero: {padding: 22, borderRadius: radius.hero, gap: 10},
  heroTop: {flexDirection: 'row', alignItems: 'center', gap: 12},
  heroLabel: {...typography.label, color: colors.lime},
  heroValue: {...typography.heroValue, color: colors.white},
  heroSub: {...typography.small, color: colors.heroCopy},
  fieldValue: {flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 7},
  stepsCard: {paddingVertical: 8, paddingHorizontal: spacing.inner},
  step: {flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12},
  stepDivider: {borderTopWidth: 1, borderTopColor: colors.stepLine},
  grid: {flexDirection: 'row', flexWrap: 'wrap', gap: 12},
  gridItem: {flexGrow: 1, flexBasis: '47%', gap: 10},
  metricValue: {...typography.metric, color: colors.ink},
  choices: {gap: 10},
  chosen: {borderColor: colors.green, backgroundColor: '#F1F7E8'},
  bars: {height: 190, flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingVertical: 16},
  barColumn: {flex: 1, alignItems: 'center', gap: 6},
  bar: {width: 34, backgroundColor: colors.green, borderRadius: 8},
  barLabel: {fontSize: 11, color: colors.muted},
});
