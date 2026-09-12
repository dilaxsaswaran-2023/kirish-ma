import React, {useState} from 'react';
import {ApiError, DEFAULT_BASE_URL, DEMO_IDENTITY} from '../api/client';
import type {Role} from '../api/types';
import {useNavigation} from '../navigation/Navigator';
import {useSession} from '../state/SessionContext';
import {Screen} from '../ui/Screen';
import {ActionButton} from '../ui/ActionButton';
import {Hero, Note} from '../ui/blocks';
import {InputField, QuickPicks, Segmented} from '../ui/inputs';
import {ErrorState} from '../ui/StateViews';

/**
 * Where the service is, from the phone's point of view. An emulator reaches the
 * host at 10.0.2.2; a USB device reaches it at localhost once `adb reverse
 * tcp:8080 tcp:8080` is set up; anything else needs the computer's LAN address.
 */
const ADDRESS_PRESETS = [
  {value: 'http://10.0.2.2:8080', label: 'Emulator'},
  {value: 'http://localhost:8080', label: 'USB (adb reverse)'},
];

const ROLES: {value: Role; label: string}[] = [
  {value: 'OPERATOR', label: 'Operator'},
  {value: 'SITE_MANAGER', label: 'Site manager'},
  {value: 'CORPORATE_ADMIN', label: 'Admin'},
  {value: 'VIEWER', label: 'View only'},
];

/**
 * The service identifies callers with workspace headers (X-User-Id,
 * X-Corporation-Id, X-Role). Sign-in collects exactly those, plus the address
 * of the running service, and proves the connection with a real /v1/me call
 * before any equipment screen is shown.
 */
export function SignInScreen() {
  const navigation = useNavigation();
  const session = useSession();
  const [baseUrl, setBaseUrl] = useState(DEFAULT_BASE_URL);
  const [userId, setUserId] = useState(DEMO_IDENTITY.userId);
  const [corporationId, setCorporationId] = useState(DEMO_IDENTITY.corporationId);
  const [role, setRole] = useState<Role>('OPERATOR');
  const [error, setError] = useState<ApiError | undefined>(undefined);

  const submit = async () => {
    setError(undefined);
    try {
      await session.signIn({baseUrl, userId, corporationId, role});
      navigation.reset('home');
    } catch (cause) {
      setError(cause as ApiError);
    }
  };

  return (
    <Screen title="Welcome back" subtitle="Let's get your fields ready." showTabs={false}>
      <Hero
        icon="leaf"
        label="AGROTHULIR"
        value="Hello, farmer"
        sub="Your fields are one tap away."
      />
      <QuickPicks
        label="Where is the service?"
        options={ADDRESS_PRESETS}
        value={baseUrl}
        onPick={setBaseUrl}
      />
      <InputField
        label="Service address"
        value={baseUrl}
        onChangeText={setBaseUrl}
        icon="wifi"
        keyboardType="url"
        hint="On a phone plugged in over USB, run `adb reverse tcp:8080 tcp:8080` and use localhost. Otherwise type this computer's address on your network."
      />
      <InputField label="User" value={userId} onChangeText={setUserId} icon="user" />
      <InputField label="Workspace" value={corporationId} onChangeText={setCorporationId} icon="home" />
      <Segmented label="Role" options={ROLES} value={role} onChange={setRole} />
      <ActionButton
        label={session.connecting ? 'Connecting…' : 'Sign in'}
        icon="arrow"
        onPress={submit}
        busy={session.connecting}
      />
      {error ? <ErrorState error={error} onRetry={submit} /> : null}
      <Note
        icon="shield"
        label="Your field access is protected"
        sub="The service decides what your role may see and control."
      />
    </Screen>
  );
}
