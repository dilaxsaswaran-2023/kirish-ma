import React, {useCallback, useState} from 'react';
import {ApiError} from '../api/client';
import {getFlows, getSchedules, previewSchedule, setScheduleEnabled} from '../api/endpoints';
import type {Flow, Schedule, SchedulePreview} from '../api/types';
import {formatDateTime} from '../format';
import {useNavigation, useParams} from '../navigation/Navigator';
import {useResource} from '../state/useResource';
import {useSession} from '../state/SessionContext';
import {Screen} from '../ui/Screen';
import {ActionButton} from '../ui/ActionButton';
import {Hero, Note, Row, SectionLabel, Steps} from '../ui/blocks';
import {EmptyState, ErrorState, Loading} from '../ui/StateViews';

/** A recurrence can be a clock rule or a sensor condition; both are shown as written. */
function recurrenceLabel(schedule: Schedule) {
  return schedule.next_due_at
    ? `${schedule.recurrence} · next ${formatDateTime(schedule.next_due_at)}`
    : `${schedule.recurrence} · runs when the condition is met`;
}

export function SchedulesScreen() {
  const navigation = useNavigation();
  const session = useSession();
  const schedules = useResource<Schedule[]>(getSchedules, [session.me?.activeCorporationId]);

  const active = schedules.data?.filter(schedule => schedule.enabled) ?? [];
  const paused = schedules.data?.filter(schedule => !schedule.enabled) ?? [];

  return (
    <Screen
      title="Schedules"
      subtitle="Water at the right time."
      onRefresh={schedules.reload}
      refreshing={schedules.refreshing}>
      {schedules.loading ? <Loading label="Reading schedules…" /> : null}
      {schedules.error && !schedules.data ? (
        <ErrorState error={schedules.error} onRetry={schedules.reload} />
      ) : null}
      {schedules.data?.length === 0 ? (
        <EmptyState
          icon="calendar"
          title="No schedules yet"
          sub="No schedule is set up for the sites you can open."
        />
      ) : null}

      {active.length > 0 ? <SectionLabel>Active</SectionLabel> : null}
      {active.map(schedule => (
        <Row
          key={schedule.id}
          icon="calendar"
          label={schedule.name}
          sub={recurrenceLabel(schedule)}
          badge="On"
          onPress={() => navigation.navigate('schedule', {scheduleId: schedule.id})}
        />
      ))}

      {paused.length > 0 ? <SectionLabel>Paused</SectionLabel> : null}
      {paused.map(schedule => (
        <Row
          key={schedule.id}
          icon="pause"
          label={schedule.name}
          sub={`${schedule.recurrence} · no automatic runs`}
          tone="amber"
          badge="Off"
          onPress={() => navigation.navigate('schedule', {scheduleId: schedule.id})}
        />
      ))}

      <Row
        icon="clock"
        label="Past activity"
        sub="Runs and changes recorded by the service"
        onPress={() => navigation.navigate('history')}
      />
      <Note
        icon="shield"
        label="A missed run is skipped, not stacked"
        sub="If a controller is offline at the due time, the occurrence is skipped rather than queued to run later."
      />
    </Screen>
  );
}

export function ScheduleScreen() {
  const {scheduleId} = useParams<'schedule'>();
  const navigation = useNavigation();
  const session = useSession();

  const load = useCallback(async () => {
    const [schedules, flows] = await Promise.all([getSchedules(), getFlows()]);
    const schedule = schedules.find(item => item.id === scheduleId);
    if (!schedule) {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'This schedule is not in your workspace.');
    }
    return {schedule, flow: flows.find(item => item.id === schedule.target_flow_id)};
  }, [scheduleId]);

  const resource = useResource<{schedule: Schedule; flow: Flow | undefined}>(load, [scheduleId]);
  const [preview, setPreview] = useState<SchedulePreview | undefined>(undefined);
  const [actionError, setActionError] = useState<ApiError | undefined>(undefined);
  const [busy, setBusy] = useState<'toggle' | 'preview' | undefined>(undefined);

  if (resource.loading) {
    return (
      <Screen title="Schedule" subtitle="Reading schedule…">
        <Loading />
      </Screen>
    );
  }
  if (!resource.data) {
    return (
      <Screen title="Schedule" subtitle="Unavailable">
        {resource.error ? <ErrorState error={resource.error} onRetry={resource.reload} /> : null}
      </Screen>
    );
  }

  const {schedule, flow} = resource.data;

  const toggle = async () => {
    setBusy('toggle');
    setActionError(undefined);
    try {
      await setScheduleEnabled(schedule.id, !schedule.enabled);
      await resource.reload();
    } catch (cause) {
      setActionError(cause as ApiError);
    } finally {
      setBusy(undefined);
    }
  };

  const loadPreview = async () => {
    setBusy('preview');
    setActionError(undefined);
    try {
      setPreview(await previewSchedule(schedule.id));
    } catch (cause) {
      setActionError(cause as ApiError);
    } finally {
      setBusy(undefined);
    }
  };

  return (
    <Screen
      title={schedule.name}
      subtitle={
        schedule.next_due_at ? `Next · ${formatDateTime(schedule.next_due_at)}` : 'Condition monitored'
      }
      badge={{icon: schedule.enabled ? 'calendar' : 'pause', tone: schedule.enabled ? 'green' : 'amber'}}
      onRefresh={resource.reload}
      refreshing={resource.refreshing}>
      <Hero
        icon={schedule.enabled ? 'calendar' : 'pause'}
        label={schedule.enabled ? 'SCHEDULE ON' : 'NO AUTOMATIC RUNS'}
        value={schedule.enabled ? 'Active' : 'Paused'}
        sub={`${schedule.recurrence} · ${schedule.timezone}`}
        tone={schedule.enabled ? 'forest' : 'amber'}
      />

      <Steps
        items={[
          {
            icon: 'flow',
            label: flow ? flow.name : schedule.target_flow_id,
            sub: `Runs version ${schedule.flow_version} of this water path`,
            onPress: flow ? () => navigation.navigate('path', {flowId: flow.id}) : undefined,
          },
          {icon: 'calendar', label: schedule.recurrence, sub: schedule.timezone},
          {
            icon: 'shield',
            label: `Missed runs: ${schedule.missed_policy.toLowerCase()}`,
            sub: 'What happens when the due time passes without a run',
          },
        ]}
      />

      {preview ? (
        <>
          <SectionLabel>Next occurrences</SectionLabel>
          <Steps
            items={preview.occurrences.map(occurrence => ({
              icon: 'clock' as const,
              label: formatDateTime(occurrence),
              sub: preview.timezone,
            }))}
          />
          <Note
            icon="clock"
            label="Clock-change policy"
            sub={preview.dstPolicy.replace(/_/g, ' ').toLowerCase()}
          />
        </>
      ) : null}

      {actionError ? <ErrorState error={actionError} /> : null}

      <ActionButton
        label="Show next occurrences"
        icon="calendar"
        tone="outline"
        onPress={loadPreview}
        busy={busy === 'preview'}
      />
      {session.canManage ? (
        <ActionButton
          label={schedule.enabled ? 'Pause schedule' : 'Resume schedule'}
          icon={schedule.enabled ? 'pause' : 'play'}
          tone={schedule.enabled ? 'outline' : 'green'}
          onPress={toggle}
          busy={busy === 'toggle'}
        />
      ) : (
        <Note
          icon="lock"
          label="Your role cannot change schedules"
          sub="Pausing and resuming needs a site manager or administrator role."
          tone="amber"
        />
      )}
      <Note
        icon="shield"
        label="Pausing only affects future runs"
        sub="A run that is already under way is not stopped by pausing its schedule."
      />
    </Screen>
  );
}
