import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {Animated, BackHandler, Easing, StyleSheet, View} from 'react-native';
import type {Route, RouteName, RouteParams} from './routes';

type NavigationValue = {
  route: Route;
  stack: Route[];
  canGoBack: boolean;
  navigate: <Name extends RouteName>(name: Name, params?: RouteParams[Name]) => void;
  replace: <Name extends RouteName>(name: Name, params?: RouteParams[Name]) => void;
  /** Clears the stack and starts again at one screen (used by tabs and sign-out). */
  reset: <Name extends RouteName>(name: Name, params?: RouteParams[Name]) => void;
  /** Pops back to an earlier screen if it is on the stack, else resets to it. */
  popTo: <Name extends RouteName>(name: Name, params?: RouteParams[Name]) => void;
  goBack: () => void;
};

const NavigationContext = createContext<NavigationValue | undefined>(undefined);

let counter = 0;
const makeRoute = (name: RouteName, params: unknown): Route =>
  ({key: `${name}-${(counter += 1)}`, name, params} as Route);

type Props = {
  initialRoute: RouteName;
  /** Maps a route to its screen element. */
  render: (route: Route) => React.ReactNode;
};

export function Navigator({initialRoute, render}: Props) {
  const [stack, setStack] = useState<Route[]>(() => [makeRoute(initialRoute, undefined)]);
  const route = stack[stack.length - 1];

  const navigate = useCallback((name: RouteName, params?: unknown) => {
    setStack(current => [...current, makeRoute(name, params)]);
  }, []);

  const replace = useCallback((name: RouteName, params?: unknown) => {
    setStack(current => [...current.slice(0, -1), makeRoute(name, params)]);
  }, []);

  const reset = useCallback((name: RouteName, params?: unknown) => {
    setStack([makeRoute(name, params)]);
  }, []);

  const goBack = useCallback(() => {
    setStack(current => (current.length > 1 ? current.slice(0, -1) : current));
  }, []);

  const popTo = useCallback((name: RouteName, params?: unknown) => {
    setStack(current => {
      const index = current.map(item => item.name).lastIndexOf(name);
      if (index >= 0) {
        return current.slice(0, index + 1);
      }
      return [...current, makeRoute(name, params)];
    });
  }, []);

  // The hardware back button follows the same stack as the on-screen back arrow.
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (stack.length <= 1) {
        return false;
      }
      goBack();
      return true;
    });
    return () => subscription.remove();
  }, [stack.length, goBack]);

  const value = useMemo<NavigationValue>(
    () => ({
      route,
      stack,
      canGoBack: stack.length > 1,
      navigate: navigate as NavigationValue['navigate'],
      replace: replace as NavigationValue['replace'],
      reset: reset as NavigationValue['reset'],
      popTo: popTo as NavigationValue['popTo'],
      goBack,
    }),
    [route, stack, navigate, replace, reset, popTo, goBack],
  );

  return (
    <NavigationContext.Provider value={value}>
      <Transition routeKey={route.key} depth={stack.length}>
        {render(route)}
      </Transition>
    </NavigationContext.Provider>
  );
}

/** A short slide/fade so screen changes read as movement, not as a flicker. */
function Transition({
  routeKey,
  depth,
  children,
}: {
  routeKey: string;
  depth: number;
  children: React.ReactNode;
}) {
  const progress = useRef(new Animated.Value(1)).current;
  const previousDepth = useRef(depth);
  // +1 when pushing forward, -1 when going back, so the slide matches direction.
  const [direction, setDirection] = useState(1);

  useEffect(() => {
    setDirection(depth >= previousDepth.current ? 1 : -1);
    previousDepth.current = depth;
    progress.setValue(0);
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: 180,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [routeKey, depth, progress]);

  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [direction * 24, 0],
  });

  return (
    <Animated.View style={[StyleSheet.absoluteFill, {opacity: progress, transform: [{translateX}]}]}>
      <View style={styles.fill}>{children}</View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({fill: {flex: 1}});

export function useNavigation() {
  const value = useContext(NavigationContext);
  if (!value) {
    throw new Error('useNavigation must be used inside Navigator');
  }
  return value;
}

/** Typed access to the current screen's parameters. */
export function useParams<Name extends RouteName>(): RouteParams[Name] {
  return useNavigation().route.params as RouteParams[Name];
}
