import React, { useState } from 'react';
import { ApiError } from '../api/client';
import { useNavigation } from '../navigation/Navigator';
import { useSession } from '../state/SessionContext';
import { Screen } from '../ui/Screen';
import { ActionButton } from '../ui/ActionButton';
import { Hero, Note } from '../ui/blocks';
import { InputField } from '../ui/inputs';
import { ErrorState } from '../ui/StateViews';

export function SignInScreen() {
  const navigation = useNavigation();
  const session = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<ApiError | undefined>(undefined);

  const submit = async () => {
    setError(undefined);
    try {
      await session.signIn({ email: email.trim(), password });
      navigation.reset('home');
    } catch (cause) {
      setError(cause as ApiError);
    }
  };

  return (
    <Screen
      title="Welcome to Kirish"
      subtitle="Sign in to view and use your farm equipment."
      showTabs={false}
    >
      <Hero
        icon="leaf"
        label="YOUR FARM"
        value="Farming made easier"
        sub="Check your equipment and start or stop it from your phone."
      />
      <InputField
        label="Email"
        placeholder="Enter your email"
        value={email}
        onChangeText={setEmail}
        icon="user"
        keyboardType="email-address"
      />
      <InputField
        label="Password"
        value={password}
        onChangeText={setPassword}
        icon="lock"
        secureTextEntry
      />
      <ActionButton
        label={session.connecting ? 'Connecting…' : 'Sign in'}
        icon="arrow"
        onPress={submit}
        busy={session.connecting}
        disabled={!email.trim() || !password}
      />
      {error ? <ErrorState error={error} onRetry={submit} /> : null}
      <Note
        icon="shield"
        label="Need help signing in?"
        sub="Ask your farm manager for your email and password."
      />
    </Screen>
  );
}
