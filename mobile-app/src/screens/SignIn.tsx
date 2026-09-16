import React, {useState} from 'react';
import {ApiError} from '../api/client';
import {useNavigation} from '../navigation/Navigator';
import {useSession} from '../state/SessionContext';
import {Screen} from '../ui/Screen';
import {ActionButton} from '../ui/ActionButton';
import {Hero, Note} from '../ui/blocks';
import {InputField} from '../ui/inputs';
import {ErrorState} from '../ui/StateViews';

export function SignInScreen() {
  const navigation = useNavigation();
  const session = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<ApiError | undefined>(undefined);

  const submit = async () => {
    setError(undefined);
    try {
      await session.signIn({email, password});
      navigation.reset('home');
    } catch (cause) {
      setError(cause as ApiError);
    }
  };

  return (
    <Screen title="Welcome back" subtitle="Sign in to control your assigned sites." showTabs={false}>
      <Hero
        icon="leaf"
        label="KIRISH OPERATIONS"
        value="Your devices"
        sub="Sites, operational flows, alerts, and schedules in one place."
      />
      <InputField label="Email" value={email} onChangeText={setEmail} icon="user" keyboardType="default" />
      <InputField label="Password" value={password} onChangeText={setPassword} icon="lock" secureTextEntry />
      <ActionButton
        label={session.connecting ? 'Connecting…' : 'Sign in'}
        icon="arrow"
        onPress={submit}
        busy={session.connecting}
      />
      {error ? <ErrorState error={error} onRetry={submit} /> : null}
      <Note
        icon="shield"
        label="Site access is protected"
        sub="The backend decides which sites and flows you can see and control."
      />
    </Screen>
  );
}
