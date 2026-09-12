import React, {createContext, useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react';
import {ApiError} from '../api/client';
import {getCommand, getComponents, sendCommand} from '../api/endpoints';
import type {Command, CommandReceipt, DeviceComponent} from '../api/types';

/**
 * Protected manual control.
 *
 * The hardware contract the design documents is enforced by reading real
 * feedback only: request valve open, verify open, request motor start, verify
 * running; and on the way down, motor off before the valve closes. Elapsed time
 * never counts as confirmation - every phase below is derived from the command
 * state the service reports plus the component states it has actually
 * confirmed, so an unacknowledged stop surfaces as "state unknown" rather than
 * as a finished run.
 */

export type ControlPhase =
  | 'idle'
  | 'requesting'
  | 'opening'
  | 'starting'
  | 'running'
  | 'stopping'
  | 'closing'
  | 'complete'
  | 'blocked'
  | 'unknown';

type Session = {
  commandId: string;
  runId: string;
  componentId: string;
  deviceId: string;
  valveId: string | undefined;
  action: 'START' | 'SAFE_STOP';
  durationSeconds: number;
  /** When the confirmed run began; used for the planned countdown only. */
  confirmedAt: number | undefined;
  stoppedEarly: boolean;
};

export type ControlResult = {
  runId: string;
  durationSeconds: number;
  elapsedSeconds: number;
  stoppedEarly: boolean;
};

type StartInput = {
  componentId: string;
  deviceId: string;
  valveId?: string;
  durationSeconds: number;
};

type ControlValue = {
  phase: ControlPhase;
  session: Session | undefined;
  command: Command | undefined;
  pump: DeviceComponent | undefined;
  valve: DeviceComponent | undefined;
  /** Every component on the controller, as last confirmed by the service. */
  components: DeviceComponent[];
  /** Why a start was refused, straight from the service's error code. */
  blocked: ApiError | undefined;
  lastResult: ControlResult | undefined;
  busy: boolean;
  secondsRemaining: number | undefined;
  start: (input: StartInput) => Promise<void>;
  /** Track a run the service started for us, e.g. a published water path. */
  adopt: (receipt: CommandReceipt, input: StartInput) => void;
  safeStop: () => Promise<void>;
  retryStop: () => Promise<void>;
  reset: () => void;
};

const ControlContext = createContext<ControlValue | undefined>(undefined);

const POLL_MS = 1000;

const confirmed = (component: DeviceComponent | undefined, state: string) =>
  component?.feedback_quality === 'CONFIRMED' && component.reported_state === state;

function derivePhase(
  session: Session,
  command: Command | undefined,
  pump: DeviceComponent | undefined,
  valve: DeviceComponent | undefined,
): ControlPhase {
  const expired = command ? Date.parse(command.expires_at) + 4000 < Date.now() : false;

  if (session.action === 'START') {
    const valveOpen = valve ? confirmed(valve, 'OPEN') : command?.state === 'CONFIRMED';
    const motorRunning = confirmed(pump, 'RUNNING');
    if (motorRunning && valveOpen) {
      return 'running';
    }
    if (valveOpen) {
      return 'starting';
    }
    // No confirmation within the command's own expiry window: the valve has not
    // reported open, so the motor is reported as kept off rather than started.
    return expired && command?.state !== 'CONFIRMED' ? 'blocked' : 'opening';
  }

  const motorOff = confirmed(pump, 'STOPPED');
  const valveClosed = valve ? confirmed(valve, 'CLOSED') : command?.state === 'STOPPED';
  if (motorOff && valveClosed) {
    return 'complete';
  }
  if (motorOff) {
    return 'closing';
  }
  // An unconfirmed motor stop must be treated as a motor that may still run.
  return expired ? 'unknown' : 'stopping';
}

export function ControlProvider({children}: {children: React.ReactNode}) {
  const [session, setSession] = useState<Session | undefined>(undefined);
  const [command, setCommand] = useState<Command | undefined>(undefined);
  const [components, setComponents] = useState<DeviceComponent[]>([]);
  const [blocked, setBlocked] = useState<ApiError | undefined>(undefined);
  const [lastResult, setLastResult] = useState<ControlResult | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [tick, setTick] = useState(0);
  const sessionRef = useRef<Session | undefined>(undefined);
  sessionRef.current = session;

  const pump = components.find(component => component.id === session?.componentId);
  const valve = components.find(component => component.id === session?.valveId);

  const phase: ControlPhase = useMemo(() => {
    if (blocked) {
      return 'blocked';
    }
    if (busy && !session) {
      return 'requesting';
    }
    if (!session) {
      return 'idle';
    }
    return derivePhase(session, command, pump, valve);
    // tick keeps expiry-driven phases current without pretending time is feedback
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocked, busy, session, command, pump, valve, tick]);

  /** Poll the command receipt and the device's confirmed component states. */
  useEffect(() => {
    if (!session) {
      return;
    }
    let cancelled = false;
    const poll = async () => {
      try {
        const [nextCommand, nextComponents] = await Promise.all([
          getCommand(session.commandId),
          getComponents(session.deviceId),
        ]);
        if (cancelled) {
          return;
        }
        setCommand(nextCommand);
        setComponents(nextComponents);
      } catch {
        // A dropped poll is not evidence of a device state change; the previous
        // confirmed reading stays on screen and the expiry check still applies.
      }
      if (!cancelled) {
        setTick(value => value + 1);
      }
    };
    poll();
    const timer = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [session]);

  /** Stamp the moment the run became confirmed, for the planned countdown. */
  useEffect(() => {
    if (phase !== 'running') {
      return;
    }
    setSession(current =>
      current && current.confirmedAt === undefined ? {...current, confirmedAt: Date.now()} : current,
    );
  }, [phase]);

  /** Record the finished run once the safe stop is fully confirmed. */
  useEffect(() => {
    if (phase !== 'complete' || !session) {
      return;
    }
    const elapsed = session.confirmedAt ? Math.round((Date.now() - session.confirmedAt) / 1000) : 0;
    setLastResult(current =>
      current?.runId === session.runId
        ? current
        : {
            runId: session.runId,
            durationSeconds: session.durationSeconds,
            elapsedSeconds: elapsed,
            stoppedEarly: session.stoppedEarly,
          },
    );
  }, [phase, session]);

  const secondsRemaining = useMemo(() => {
    if (!session?.confirmedAt || session.action !== 'START') {
      return undefined;
    }
    const elapsed = (Date.now() - session.confirmedAt) / 1000;
    return Math.max(0, Math.round(session.durationSeconds - elapsed));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, tick]);

  const start = useCallback(async (input: StartInput) => {
    setBusy(true);
    setBlocked(undefined);
    setLastResult(undefined);
    setCommand(undefined);
    try {
      const receipt: CommandReceipt = await sendCommand(input.componentId, 'START', input.durationSeconds);
      setSession({
        commandId: receipt.commandId,
        runId: receipt.runId,
        componentId: input.componentId,
        deviceId: input.deviceId,
        valveId: input.valveId,
        action: 'START',
        durationSeconds: input.durationSeconds,
        confirmedAt: undefined,
        stoppedEarly: false,
      });
    } catch (cause) {
      setBlocked(
        cause instanceof ApiError
          ? cause
          : new ApiError(0, 'UNEXPECTED_ERROR', 'The start request could not be sent.'),
      );
      throw cause;
    } finally {
      setBusy(false);
    }
  }, []);

  const adopt = useCallback((receipt: CommandReceipt, input: StartInput) => {
    setBlocked(undefined);
    setLastResult(undefined);
    setCommand(undefined);
    setSession({
      commandId: receipt.commandId,
      runId: receipt.runId,
      componentId: input.componentId,
      deviceId: input.deviceId,
      valveId: input.valveId,
      action: 'START',
      durationSeconds: input.durationSeconds,
      confirmedAt: undefined,
      stoppedEarly: false,
    });
  }, []);

  const requestStop = useCallback(async () => {
    const current = sessionRef.current;
    if (!current) {
      return;
    }
    setBusy(true);
    try {
      const receipt = await sendCommand(current.componentId, 'SAFE_STOP', 60);
      setCommand(undefined);
      setSession({
        ...current,
        commandId: receipt.commandId,
        runId: receipt.runId,
        action: 'SAFE_STOP',
        stoppedEarly: current.action === 'START',
      });
    } finally {
      setBusy(false);
    }
  }, []);

  const reset = useCallback(() => {
    setSession(undefined);
    setCommand(undefined);
    setComponents([]);
    setBlocked(undefined);
    setBusy(false);
  }, []);

  const value = useMemo<ControlValue>(
    () => ({
      phase,
      session,
      command,
      pump,
      valve,
      components,
      blocked,
      lastResult,
      busy,
      secondsRemaining,
      start,
      adopt,
      safeStop: requestStop,
      retryStop: requestStop,
      reset,
    }),
    [
      phase,
      session,
      command,
      pump,
      valve,
      components,
      blocked,
      lastResult,
      busy,
      secondsRemaining,
      start,
      adopt,
      requestStop,
      reset,
    ],
  );

  return <ControlContext.Provider value={value}>{children}</ControlContext.Provider>;
}

export function useControl() {
  const value = useContext(ControlContext);
  if (!value) {
    throw new Error('useControl must be used inside ControlProvider');
  }
  return value;
}
