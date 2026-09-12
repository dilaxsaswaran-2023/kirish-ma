import React from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Icon, IconName} from '../icons';
import {colors, radius, sizes, spacing, Tone, tones, type as typography} from '../theme';
import {useNavigation} from '../navigation/Navigator';
import {TABS, TAB_FOR_ROUTE} from '../navigation/routes';

type ScreenProps = {
  title: string;
  subtitle?: string;
  /** Circular status badge beside the title. */
  badge?: {icon: IconName; tone?: Tone};
  children: React.ReactNode;
  /** Hide the back arrow on entry points and on screens that must not be left mid-run. */
  hideBack?: boolean;
  onBack?: () => void;
  showTabs?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
};

export function Screen({
  title,
  subtitle,
  badge,
  children,
  hideBack,
  onBack,
  showTabs = true,
  onRefresh,
  refreshing = false,
}: ScreenProps) {
  const navigation = useNavigation();
  const activeTab = TAB_FOR_ROUTE[navigation.route.name];
  const canBack = !hideBack && (navigation.canGoBack || Boolean(onBack));

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        {canBack ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={onBack ?? navigation.goBack}
            style={({pressed}) => [styles.back, pressed ? styles.pressed : null]}>
            <Icon name="back" color={colors.green} size={24} />
          </Pressable>
        ) : null}
        <View style={styles.headerCopy}>
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={2}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {badge ? (
          <View
            style={[styles.headerBadge, {backgroundColor: tones[badge.tone ?? 'green'].bg}]}>
            <Icon name={badge.icon} color={tones[badge.tone ?? 'green'].fg} size={24} />
          </View>
        ) : null}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.green]}
              tintColor={colors.green}
            />
          ) : undefined
        }>
        {children}
      </ScrollView>

      {showTabs ? <TabBar active={activeTab} /> : null}
    </SafeAreaView>
  );
}

function TabBar({active}: {active?: string}) {
  const navigation = useNavigation();
  return (
    <View style={styles.tabBar}>
      {TABS.map(tab => {
        const selected = tab.name === active;
        return (
          <Pressable
            key={tab.name}
            accessibilityRole="tab"
            accessibilityState={{selected}}
            accessibilityLabel={tab.label}
            onPress={() => navigation.reset(tab.route)}
            style={[styles.tab, selected ? styles.tabActive : null]}>
            <Icon
              name={tab.icon as IconName}
              color={selected ? colors.green : colors.muted}
              size={24}
            />
            <Text style={[styles.tabLabel, selected ? styles.tabLabelActive : null]}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.paper},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: spacing.gutter,
    paddingTop: 12,
    paddingBottom: 10,
  },
  headerCopy: {flex: 1, gap: 5},
  title: {...typography.title, color: colors.ink},
  subtitle: {...typography.small, color: colors.muted},
  back: {
    width: sizes.touch,
    height: sizes.touch,
    borderRadius: sizes.touch / 2,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.line,
  },
  headerBadge: {
    width: sizes.touch,
    height: sizes.touch,
    borderRadius: sizes.touch / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {opacity: 0.7},
  scroll: {flex: 1},
  content: {
    paddingHorizontal: spacing.gutter,
    paddingTop: 8,
    paddingBottom: 32,
    gap: spacing.gap,
  },
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingHorizontal: 14,
    paddingVertical: 10,
    height: sizes.tabBar,
  },
  tab: {
    flex: 1,
    height: 60,
    borderRadius: radius.action,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  tabActive: {backgroundColor: colors.sage},
  tabLabel: {fontSize: 12, color: colors.muted, fontWeight: '600'},
  tabLabelActive: {color: colors.green},
});
