import React, { useState } from 'react';
import { Platform, Pressable, SafeAreaView, StatusBar as NativeStatusBar, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  AlertsScreen, ComponentsScreen, ControlScreen, CorporateAdminScreen, DeviceDetailScreen,
  DevicesScreen, FlowsScreen, HomeScreen, MoreScreen, SchedulesScreen, SequenceScreen,
  SiteDetailScreen, SitesScreen, SuperAdminScreen, TopologyScreen, WelcomeScreen,
} from './src/screens';
import { colors } from './src/theme';
import { Role, Screen } from './src/types';

type Tab = { screen: Screen; label: string; icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'] };
const operatorTabs: Tab[] = [
  { screen: 'home', label: 'Home', icon: 'home-outline' },
  { screen: 'sites', label: 'Sites', icon: 'map-marker-outline' },
  { screen: 'flows', label: 'Flows', icon: 'transit-connection-variant' },
  { screen: 'alerts', label: 'Alerts', icon: 'bell-outline' },
  { screen: 'more', label: 'More', icon: 'dots-horizontal' },
];
const superTabs: Tab[] = [
  { screen: 'superAdmin', label: 'Overview', icon: 'view-dashboard-outline' },
  { screen: 'corporateAdmin', label: 'Companies', icon: 'office-building-outline' },
  { screen: 'more', label: 'Users', icon: 'account-group-outline' },
  { screen: 'more', label: 'More', icon: 'dots-horizontal' },
];

export default function App() {
  const [screen, setScreen] = useState<Screen>('welcome');
  const [history, setHistory] = useState<Screen[]>([]);
  const [role, setRole] = useState<Role>('OPERATOR');
  const navigate = (next: Screen) => {
    if (next === 'welcome') { setHistory([]); setScreen(next); return; }
    setHistory(h => [...h.slice(-12), screen]);
    setScreen(next);
  };
  const back = () => setHistory(h => {
    if (!h.length) { setScreen(role === 'SUPER_ADMIN' ? 'superAdmin' : 'home'); return h; }
    const next = h[h.length - 1]; setScreen(next); return h.slice(0, -1);
  });
  const props = { navigate, back, role, setRole };
  const content: Record<Screen, React.ReactNode> = {
    welcome: <WelcomeScreen {...props} />, home: <HomeScreen {...props} />, sites: <SitesScreen {...props} />,
    site: <SiteDetailScreen {...props} />, devices: <DevicesScreen {...props} />, device: <DeviceDetailScreen {...props} />,
    components: <ComponentsScreen {...props} />, control: <ControlScreen {...props} />, flows: <FlowsScreen {...props} />,
    topology: <TopologyScreen {...props} />, sequence: <SequenceScreen {...props} />, schedules: <SchedulesScreen />,
    alerts: <AlertsScreen />, more: <MoreScreen {...props} />, corporateAdmin: <CorporateAdminScreen {...props} />,
    superAdmin: <SuperAdminScreen {...props} />,
  };
  const tabs = role === 'SUPER_ADMIN' ? superTabs : operatorTabs;
  const activeTab = tabs.some(t => t.screen === screen) ? screen : undefined;
  const signedIn = screen !== 'welcome';

  return <SafeAreaView style={styles.safe}>
    <StatusBar style="dark" />
    <View style={styles.app}>{content[screen]}</View>
    {signedIn && <View style={styles.tabBar}>{tabs.map((tab, index) => {
      const active = activeTab === tab.screen && !(tab.screen === 'more' && index < tabs.length - 1);
      return <Pressable key={`${tab.label}-${index}`} accessibilityRole="tab" accessibilityState={{ selected: active }} accessibilityLabel={tab.label} onPress={() => navigate(tab.screen)} style={styles.tab}>
        <View style={[styles.tabIcon, active && styles.tabIconActive]}><MaterialCommunityIcons name={tab.icon} size={23} color={active ? colors.forest : colors.muted} />{tab.label === 'Alerts' && <View style={styles.dot} />}</View>
        <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{tab.label}</Text>
      </Pressable>;
    })}</View>}
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.ivory, paddingTop: Platform.OS === 'android' ? NativeStatusBar.currentHeight : 0 }, app: { flex: 1 },
  tabBar: { position: 'absolute', left: 12, right: 12, bottom: 10, height: 76, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', backgroundColor: colors.white, borderRadius: 24, borderWidth: 1, borderColor: colors.line, shadowColor: colors.forest, shadowOffset: { width: 0, height: 5 }, shadowOpacity: .12, shadowRadius: 18, elevation: 8, paddingHorizontal: 4 },
  tab: { flex: 1, minHeight: 60, alignItems: 'center', justifyContent: 'center' }, tabIcon: { minWidth: 42, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }, tabIconActive: { backgroundColor: colors.sage },
  tabLabel: { color: colors.muted, fontSize: 10, fontWeight: '700', marginTop: 2 }, tabLabelActive: { color: colors.forest, fontWeight: '900' }, dot: { position: 'absolute', right: 7, top: 2, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.red, borderWidth: 1.5, borderColor: colors.white },
});
