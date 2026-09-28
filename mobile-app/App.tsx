import React from 'react';
import {StyleSheet, View} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {Navigator} from './src/navigation/Navigator';
import type {Route} from './src/navigation/routes';
import {SessionProvider} from './src/state/SessionContext';
import {SignInScreen} from './src/screens/SignIn';
import {OperationsDeviceScreen, OperationsHomeScreen, OperationsSiteScreen, OperationsZoneScreen} from './src/screens/Operations';
import {colors} from './src/theme';

function renderRoute(route: Route): React.ReactNode {
  switch (route.name) {
    case 'signin': return <SignInScreen />;
    case 'site': return <OperationsSiteScreen />;
    case 'zone': return <OperationsZoneScreen />;
    case 'device': return <OperationsDeviceScreen />;
    case 'home':
    case 'sites':
    default: return <OperationsHomeScreen />;
  }
}

export default function App() {
  return <SafeAreaProvider><SessionProvider><View style={styles.root}>
    <Navigator initialRoute="signin" render={renderRoute} />
  </View></SessionProvider></SafeAreaProvider>;
}

const styles = StyleSheet.create({root: {flex: 1, backgroundColor: colors.paper}});
