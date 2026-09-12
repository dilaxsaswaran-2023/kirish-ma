import React, { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, radius, space } from './theme';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

export function IconTile({ name, tone = 'green', size = 25 }: { name: IconName; tone?: 'green' | 'blue' | 'amber' | 'red'; size?: number }) {
  const palette = {
    green: [colors.sage, colors.green], blue: [colors.blueBg, colors.blue],
    amber: [colors.amberBg, colors.amber], red: [colors.redBg, colors.red],
  }[tone];
  return <View style={[styles.iconTile, { backgroundColor: palette[0] }]}><MaterialCommunityIcons name={name} size={size} color={palette[1]} /></View>;
}

export function Header({ title, subtitle, back, action }: { title: string; subtitle?: string; back?: () => void; action?: ReactNode }) {
  return (
    <View style={styles.header}>
      <View style={styles.headerRow}>
        {back && <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={back} style={styles.iconButton}><MaterialCommunityIcons name="arrow-left" size={24} color={colors.ink} /></Pressable>}
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {action}
      </View>
    </View>
  );
}

export function Card({ children, style, onPress, label }: { children: ReactNode; style?: ViewStyle | ViewStyle[]; onPress?: () => void; label?: string }) {
  const body = <View style={[styles.card, style]}>{children}</View>;
  return onPress ? <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}>{body}</Pressable> : body;
}

export function Badge({ label, tone = 'green' }: { label: string; tone?: 'green' | 'amber' | 'red' | 'blue' | 'neutral' }) {
  const map = {
    green: [colors.sage, colors.green], amber: [colors.amberBg, colors.amber], red: [colors.redBg, colors.red],
    blue: [colors.blueBg, colors.blue], neutral: ['#EEF0EC', colors.muted],
  }[tone];
  return <View style={[styles.badge, { backgroundColor: map[0] }]}><Text style={[styles.badgeText, { color: map[1] }]}>{label}</Text></View>;
}

export function Metric({ icon, label, value, tone = 'green' }: { icon: IconName; label: string; value: string; tone?: 'green' | 'blue' | 'amber' | 'red' }) {
  return <Card style={styles.metric}><IconTile name={icon} tone={tone} /><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></Card>;
}

export function PrimaryButton({ label, icon, onPress, tone = 'primary', disabled = false }: { label: string; icon?: IconName; onPress: () => void; tone?: 'primary' | 'danger' | 'soft'; disabled?: boolean }) {
  const palette = tone === 'danger' ? [colors.red, colors.white] : tone === 'soft' ? [colors.sage, colors.forest] : [colors.forest, colors.white];
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.primaryButton, { backgroundColor: disabled ? colors.line : palette[0], opacity: pressed ? .82 : 1 }]}>
    {icon && <MaterialCommunityIcons name={icon} size={21} color={disabled ? colors.muted : palette[1]} />}
    <Text style={[styles.primaryButtonText, { color: disabled ? colors.muted : palette[1] }]}>{label}</Text>
  </Pressable>;
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return <View style={styles.sectionTitle}><Text style={styles.sectionTitleText}>{children}</Text>{action}</View>;
}

export function Row({ icon, title, subtitle, badge, onPress, tone = 'green' }: { icon: IconName; title: string; subtitle: string; badge?: ReactNode; onPress?: () => void; tone?: 'green' | 'blue' | 'amber' | 'red' }) {
  return <Card onPress={onPress} label={title} style={styles.rowCard}>
    <IconTile name={icon} tone={tone} />
    <View style={{ flex: 1 }}><Text style={styles.rowTitle}>{title}</Text><Text style={styles.rowSubtitle}>{subtitle}</Text></View>
    {badge}
    {onPress && <MaterialCommunityIcons name="chevron-right" size={24} color={colors.muted} />}
  </Card>;
}

export function Divider() { return <View style={styles.divider} />; }

const styles = StyleSheet.create({
  header: { paddingHorizontal: space.lg, paddingTop: space.sm, paddingBottom: space.md, backgroundColor: colors.ivory },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  title: { color: colors.ink, fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { color: colors.muted, fontSize: 13, marginTop: 3 },
  iconButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', marginLeft: -12 },
  iconTile: { width: 48, height: 48, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, padding: space.md },
  badge: { borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 5, alignSelf: 'flex-start' },
  badgeText: { fontSize: 11, fontWeight: '800', letterSpacing: .2 },
  metric: { width: '48%', minHeight: 132, gap: 7 },
  metricValue: { color: colors.ink, fontSize: 23, fontWeight: '800' },
  metricLabel: { color: colors.muted, fontSize: 12, lineHeight: 17 },
  primaryButton: { minHeight: 52, borderRadius: 16, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  primaryButtonText: { fontSize: 15, fontWeight: '800' },
  sectionTitle: { marginTop: space.sm, marginBottom: space.sm, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitleText: { color: colors.ink, fontSize: 18, fontWeight: '800' },
  rowCard: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.sm },
  rowTitle: { color: colors.ink, fontSize: 15, fontWeight: '800' },
  rowSubtitle: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 2 },
  divider: { height: 1, backgroundColor: colors.line, marginVertical: space.md },
});
