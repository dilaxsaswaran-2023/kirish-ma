import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {Icon} from '../icons';
import {colors, radius, type as typography} from '../theme';
import {useNavigation} from '../navigation/Navigator';
import {Screen} from '../ui/Screen';
import {ActionButton} from '../ui/ActionButton';
import {Hero, Note} from '../ui/blocks';

export function WelcomeScreen() {
  const navigation = useNavigation();
  return (
    <Screen title="AgroThulir" subtitle="A little care. A greener tomorrow." hideBack showTabs={false}>
      <View style={styles.art}>
        <Icon name="leaf" color={colors.green} size={92} strokeWidth={1.4} />
        <Text style={styles.artText}>Motors · Valves · Water</Text>
      </View>
      <Hero
        icon="leaf"
        label="YOUR FIELD, IN YOUR HAND"
        value="Grow with care"
        sub="Every start opens the valve first and waits for the controller to confirm it."
      />
      <ActionButton label="Get started" icon="arrow" onPress={() => navigation.navigate('signin')} />
      <Note icon="shield" label="Simple. Safe. Connected." sub="Protection is built into every run." />
    </Screen>
  );
}

const styles = StyleSheet.create({
  art: {
    height: 190,
    borderRadius: radius.hero,
    backgroundColor: colors.sage,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  artText: {...typography.small, color: colors.green, fontWeight: '600'},
});
