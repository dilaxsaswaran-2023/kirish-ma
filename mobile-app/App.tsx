import React from 'react';
import {StyleSheet, View} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {colors} from './src/theme';
import {Navigator} from './src/navigation/Navigator';
import type {Route} from './src/navigation/routes';
import {SessionProvider} from './src/state/SessionContext';
import {ControlProvider} from './src/state/ControlContext';

import {WelcomeScreen} from './src/screens/Welcome';
import {SignInScreen} from './src/screens/SignIn';
import {HomeScreen} from './src/screens/Home';
import {SiteScreen, SitesScreen} from './src/screens/Sites';
import {
  ComponentScreen,
  ComponentsScreen,
  DeviceScreen,
  DevicesScreen,
  DiagnosticsScreen,
} from './src/screens/Devices';
import {ReadingsScreen} from './src/screens/Readings';
import {
  DurationScreen,
  ProtectionScreen,
  StartConfirmScreen,
  WaterNowScreen,
} from './src/screens/Control';
import {
  BlockedScreen,
  CompleteScreen,
  LiveScreen,
  StopConfirmScreen,
  StopUnknownScreen,
} from './src/screens/Live';
import {PathScreen, PathsScreen, TopologyScreen} from './src/screens/Paths';
import {SequenceScreen} from './src/screens/Sequence';
import {ScheduleScreen, SchedulesScreen} from './src/screens/Schedules';
import {AlertScreen, AlertsScreen, HistoryScreen} from './src/screens/Alerts';
import {SettingsScreen} from './src/screens/Settings';

/** Every route in the app, keyed by name. */
function renderRoute(route: Route): React.ReactNode {
  switch (route.name) {
    case 'welcome':
      return <WelcomeScreen />;
    case 'signin':
      return <SignInScreen />;
    case 'home':
      return <HomeScreen />;

    case 'sites':
      return <SitesScreen />;
    case 'site':
      return <SiteScreen />;
    case 'devices':
      return <DevicesScreen />;
    case 'device':
      return <DeviceScreen />;
    case 'components':
      return <ComponentsScreen />;
    case 'component':
      return <ComponentScreen />;
    case 'readings':
      return <ReadingsScreen />;
    case 'diagnostics':
      return <DiagnosticsScreen />;

    case 'protection':
      return <ProtectionScreen />;
    case 'waterNow':
      return <WaterNowScreen />;
    case 'duration':
      return <DurationScreen />;
    case 'startConfirm':
      return <StartConfirmScreen />;
    case 'live':
      return <LiveScreen />;
    case 'stopConfirm':
      return <StopConfirmScreen />;
    case 'complete':
      return <CompleteScreen />;
    case 'blocked':
      return <BlockedScreen />;
    case 'stopUnknown':
      return <StopUnknownScreen />;

    case 'paths':
      return <PathsScreen />;
    case 'path':
      return <PathScreen />;
    case 'topology':
      return <TopologyScreen />;
    case 'sequence':
      return <SequenceScreen />;

    case 'schedules':
      return <SchedulesScreen />;
    case 'schedule':
      return <ScheduleScreen />;

    case 'alerts':
      return <AlertsScreen />;
    case 'alert':
      return <AlertScreen />;
    case 'history':
      return <HistoryScreen />;

    case 'settings':
      return <SettingsScreen />;
    default:
      return <HomeScreen />;
  }
}

export default function App() {
  return (
    <SafeAreaProvider>
      <SessionProvider>
        <ControlProvider>
          <View style={styles.root}>
            <Navigator initialRoute="welcome" render={renderRoute} />
          </View>
        </ControlProvider>
      </SessionProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: colors.paper},
});
