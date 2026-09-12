import React, {useEffect} from 'react';
import {clock, componentStateLabel, minutesLabel, relativeTime} from '../format';
import {presentError} from '../api/errors';
import {useNavigation} from '../navigation/Navigator';
import {useControl} from '../state/ControlContext';
import {sensorsOf} from '../state/equipment';
import {Screen} from '../ui/Screen';
import {ActionButton} from '../ui/ActionButton';
import {Hero, Metrics, Note, Row, Steps} from '../ui/blocks';
import {EmptyState} from '../ui/StateViews';

/**
 * One screen for the whole protected run. The phase comes from the service's
 * command state and the controller's confirmed component states, so waiting,
 * blocked and unknown are shown as themselves — the screen never advances just
 * because time has passed.
 */
export function LiveScreen() {
  const navigation = useNavigation();
  const control = useControl();
  const {phase, pump, valve, command, session, components, secondsRemaining} = control;

  useEffect(() => {
    if (phase === 'complete') {
      navigation.replace('complete');
    } else if (phase === 'blocked') {
      navigation.replace('blocked');
    } else if (phase === 'unknown') {
      navigation.replace('stopUnknown');
    }
  }, [phase, navigation]);

  if (phase === 'idle') {
    return (
      <Screen title="No run in progress" subtitle="Nothing is being controlled right now.">
        <EmptyState
          icon="motor"
          title="No active run"
          sub="Start a run from a controller to see live feedback here."
        />
        <ActionButton label="Back home" icon="home" onPress={() => navigation.reset('home')} />
      </Screen>
    );
  }

  const valveLabel = valve?.name ?? 'Valve';
  const pumpLabel = pump?.name ?? 'Motor';
  const flowSensor = sensorsOf(components).find(sensor => /flow/i.test(sensor.name));
  const moistureSensor = sensorsOf(components).find(sensor => /moist/i.test(sensor.name));

  if (phase === 'requesting') {
    return (
      <Screen title="Sending request" subtitle="Nothing has moved yet." hideBack showTabs={false}>
        <Hero
          icon="clock"
          label="WAITING FOR THE SERVICE"
          value="Sending…"
          sub="The request is being checked before any command reaches the controller."
        />
      </Screen>
    );
  }

  if (phase === 'opening') {
    return (
      <Screen title="Opening valve" subtitle="Motor stays off until confirmed." hideBack showTabs={false}>
        <Hero
          icon="valve"
          label="WAITING FOR FEEDBACK"
          value={valveLabel}
          sub={`Command ${command?.state?.toLowerCase() ?? 'accepted'} · ${pumpLabel} is off`}
        />
        <Steps
          items={[
            {
              icon: 'clock',
              label: `${valveLabel} opening`,
              sub: valve
                ? `Reported ${componentStateLabel(valve).toLowerCase()} · waiting for open`
                : 'Waiting for position feedback',
              tone: 'amber',
            },
            {
              icon: 'lock',
              label: `${pumpLabel} off`,
              sub: 'The motor is held off until the valve confirms',
            },
          ]}
        />
        <Note
          icon="shield"
          label="No motor command has been sent"
          sub="If the valve does not confirm, the run stops here and the motor stays off."
        />
      </Screen>
    );
  }

  if (phase === 'starting') {
    return (
      <Screen title="Starting motor" subtitle={`${valveLabel} is confirmed open.`} hideBack showTabs={false}>
        <Hero
          icon="motor"
          label="WAITING FOR FEEDBACK"
          value={pumpLabel}
          sub={`${valveLabel} open · waiting for motor-running feedback`}
        />
        <Steps
          items={[
            {icon: 'check', label: `${valveLabel} open`, sub: 'Position confirmed'},
            {
              icon: 'clock',
              label: `${pumpLabel} starting`,
              sub: pump ? `Reported ${componentStateLabel(pump).toLowerCase()}` : 'Waiting for feedback',
              tone: 'amber',
            },
          ]}
        />
        <ActionButton label="Stop request" icon="stop" tone="outline" onPress={() => navigation.navigate('stopConfirm')} />
      </Screen>
    );
  }

  if (phase === 'running') {
    // The service does not stop a run on a timer; the motor keeps running until
    // a safe stop is confirmed. When the planned time is up we say exactly that
    // instead of implying the run has ended.
    const planElapsed = secondsRemaining === 0;
    return (
      <Screen
        title="Watering now"
        subtitle={`${valveLabel} · confirmed live`}
        hideBack
        showTabs={false}>
        <Hero
          icon="motor"
          label={`MOTOR ON · ${valveLabel.toUpperCase()} OPEN`}
          value={
            planElapsed
              ? 'Planned time is up'
              : secondsRemaining === undefined
              ? 'Running'
              : clock(secondsRemaining)
          }
          sub={
            session
              ? planElapsed
                ? `The ${minutesLabel(session.durationSeconds)} you planned has passed and the motor is still reported running.`
                : `of ${minutesLabel(session.durationSeconds)} planned`
              : undefined
          }
          tone={planElapsed ? 'amber' : 'blue'}
        />
        {planElapsed ? (
          <Note
            icon="clock"
            label="Stop the run when you are ready"
            sub="Nothing stops the motor on a timer. It keeps running until a safe stop is confirmed."
            tone="amber"
          />
        ) : null}
        <Metrics
          items={[
            {
              icon: 'drop',
              value: flowSensor?.latest_value ?? '—',
              label: flowSensor?.name ?? 'Water flow',
            },
            {
              icon: 'sensor',
              value: moistureSensor?.latest_value ?? '—',
              label: moistureSensor?.name ?? 'Soil moisture',
            },
          ]}
        />
        <ActionButton
          label="Stop watering"
          icon="stop"
          tone="red"
          onPress={() => navigation.navigate('stopConfirm')}
        />
        <Row
          icon="valve"
          label={`${valveLabel} · ${valve ? componentStateLabel(valve) : 'Open'}`}
          sub="Locked while the motor is running"
          tone="blue"
        />
        <Note
          icon="shield"
          label="The motor always stops before the valve closes"
          sub="A valve close is refused while the motor is still reported running."
        />
        <Note
          icon="clock"
          label="The planned time is a plan, not a cut-off"
          sub="The run ends when you stop it and the controller confirms motor-off and a closed valve."
        />
        {pump ? (
          <Note
            icon="wifi"
            label={`Last confirmed reading ${relativeTime(pump.measured_at)}`}
            sub={`Feedback quality: ${pump.feedback_quality.toLowerCase()}`}
          />
        ) : null}
      </Screen>
    );
  }

  if (phase === 'stopping') {
    return (
      <Screen title="Stopping motor" subtitle={`${valveLabel} stays open.`} hideBack showTabs={false}>
        <Hero
          icon="motor"
          label="STOP REQUEST SENT"
          value="Waiting…"
          sub="Motor-off feedback is needed before the valve may close."
          tone="amber"
        />
        <Note icon="valve" label={`${valveLabel} is held open`} sub="Closing it now could damage the pipe." />
        <Note
          icon="clock"
          label="Time alone will not confirm this"
          sub="If the controller does not report motor-off, the motor is treated as still running."
        />
        <ActionButton label="Retry safe stop" icon="stop" tone="outline" onPress={control.retryStop} busy={control.busy} />
      </Screen>
    );
  }

  // phase === 'closing'
  return (
    <Screen title="Closing valve" subtitle={`${pumpLabel} is confirmed off.`} hideBack showTabs={false}>
      <Hero
        icon="valve"
        label="MOTOR OFF"
        value={`Closing ${valveLabel}`}
        sub="Waiting for the valve to confirm its closed position."
      />
      <Note icon="shield" label="The water path is shutting down safely" />
    </Screen>
  );
}

export function StopConfirmScreen() {
  const navigation = useNavigation();
  const control = useControl();
  const valveLabel = control.valve?.name ?? 'the valve';
  const pumpLabel = control.pump?.name ?? 'the motor';

  const stop = async () => {
    await control.safeStop();
    navigation.replace('live');
  };

  return (
    <Screen title="Stop watering?" subtitle="The order is protected." showTabs={false}>
      <Steps
        items={[
          {icon: 'stop', label: `Stop ${pumpLabel}`, sub: 'Wait for confirmed motor-off'},
          {icon: 'valve', label: `Close ${valveLabel}`, sub: 'Only after the motor is off'},
        ]}
      />
      <ActionButton label="Stop safely" icon="stop" tone="red" onPress={stop} busy={control.busy} />
      <ActionButton label="Keep watering" icon="back" tone="outline" onPress={navigation.goBack} />
    </Screen>
  );
}

export function CompleteScreen() {
  const navigation = useNavigation();
  const control = useControl();
  const result = control.lastResult;

  return (
    <Screen
      title={result?.stoppedEarly ? 'Watering stopped' : 'Watering finished'}
      subtitle={result?.stoppedEarly ? 'Stopped before the planned time' : 'The planned run is complete'}
      hideBack>
      <Hero
        icon="check"
        label="SAFE STOP CONFIRMED"
        value="All off"
        sub={`${control.pump?.name ?? 'Motor'} off · ${control.valve?.name ?? 'valve'} closed, both confirmed by the controller.`}
      />
      <Metrics
        items={[
          {
            icon: 'clock',
            value: result ? clock(result.elapsedSeconds) : '—',
            label: 'Confirmed run time',
          },
          {
            icon: 'calendar',
            value: result ? minutesLabel(result.durationSeconds) : '—',
            label: 'Planned run time',
          },
        ]}
      />
      <Note
        icon="shield"
        label="Recorded by the service"
        sub={result ? `Run ${result.runId}` : 'The run and its commands are in the activity record.'}
      />
      <ActionButton
        label="Back home"
        icon="home"
        onPress={() => {
          control.reset();
          navigation.reset('home');
        }}
      />
      <ActionButton
        label="See past activity"
        icon="clock"
        tone="outline"
        onPress={() => navigation.navigate('history')}
      />
    </Screen>
  );
}

export function BlockedScreen() {
  const navigation = useNavigation();
  const control = useControl();
  const refusal = control.blocked;
  // Two ways a start can end here: the service refused it outright, or it was
  // accepted but the valve never reported open before the command expired.
  const presentation = refusal
    ? presentError(refusal)
    : {
        headline: 'The valve did not confirm open',
        guidance:
          'Check the valve, its power and its position sensor on site before trying again.',
        icon: 'valve' as const,
        tone: 'amber' as const,
        equipmentUntouched: false,
      };
  const timedOut = !refusal && Boolean(control.session);

  const releaseAndStop = async () => {
    await control.retryStop();
    navigation.replace('live');
  };

  return (
    <Screen title="Motor kept off" subtitle="No watering was started." hideBack showTabs={false}>
      <Hero
        icon="shield"
        label="START BLOCKED"
        value={presentation.headline}
        sub={
          refusal?.message ??
          `${control.valve?.name ?? 'The valve'} has not reported an open position, so the motor was never started.`
        }
        tone="amber"
      />
      <Note icon={presentation.icon} label="What to do" sub={presentation.guidance} tone={presentation.tone} />
      {presentation.equipmentUntouched ? (
        <Note
          icon="lock"
          label="Nothing was energised"
          sub="The service refused the request before any command reached the controller."
        />
      ) : (
        <Note
          icon="motor"
          label={`${control.pump?.name ?? 'The motor'} is reported ${
            control.pump ? componentStateLabel(control.pump).toLowerCase() : 'off'
          }`}
          sub="Send a safe stop to release the equipment the run reserved."
          tone="amber"
        />
      )}
      {refusal ? <Note icon="alert" label={`Service code: ${refusal.code}`} tone="amber" /> : null}
      {timedOut ? (
        <ActionButton label="Send safe stop" icon="stop" tone="red" onPress={releaseAndStop} busy={control.busy} />
      ) : null}
      <ActionButton
        label="Back to controls"
        icon="back"
        onPress={() => {
          control.reset();
          navigation.reset('home');
        }}
      />
      <ActionButton
        label="View alerts"
        icon="bell"
        tone="outline"
        onPress={() => navigation.navigate('alerts')}
      />
    </Screen>
  );
}

export function StopUnknownScreen() {
  const navigation = useNavigation();
  const control = useControl();

  const retry = async () => {
    await control.retryStop();
    navigation.replace('live');
  };

  return (
    <Screen title="Stop not confirmed" subtitle="Treat the motor as running." hideBack showTabs={false}>
      <Hero
        icon="alert"
        label="STATE UNKNOWN"
        value="Check on site"
        sub={`${control.valve?.name ?? 'The valve'} stays open. The controller has not reported motor-off.`}
        tone="red"
      />
      <Note
        icon="stop"
        label="Use the local stop"
        sub="Verify at the controller that the motor is off before anyone closes the valve."
        tone="red"
      />
      <Note
        icon="clock"
        label="Why this is not a finished run"
        sub="The stop command expired without confirmation. Elapsed time is not evidence that the motor stopped."
        tone="amber"
      />
      <ActionButton label="Retry safe stop" icon="stop" tone="red" onPress={retry} busy={control.busy} />
      <ActionButton
        label="View alerts"
        icon="bell"
        tone="outline"
        onPress={() => navigation.navigate('alerts')}
      />
    </Screen>
  );
}
