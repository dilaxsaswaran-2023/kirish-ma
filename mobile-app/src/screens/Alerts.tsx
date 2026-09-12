import React, {useCallback, useState} from 'react';
import {ApiError} from '../api/client';
import {acknowledgeAlert, getAlerts, getAuditEvents} from '../api/endpoints';
import type {Alert, AuditEvent} from '../api/types';
import {alertTone, formatDateTime, relativeTime, titleCase} from '../format';
import {useNavigation, useParams} from '../navigation/Navigator';
import {useResource} from '../state/useResource';
import {Screen} from '../ui/Screen';
import {ActionButton} from '../ui/ActionButton';
import {Hero, Note, Row, SectionLabel, Steps} from '../ui/blocks';
import {EmptyState, ErrorState, Loading} from '../ui/StateViews';

function alertStatus(alert: Alert) {
  if (alert.resolved_at) {
    return 'Resolved';
  }
  return alert.acknowledged_at ? 'Seen' : 'New';
}

export function AlertsScreen() {
  const navigation = useNavigation();
  const alerts = useResource<Alert[]>(getAlerts, [], {pollMs: 20000});

  const open = alerts.data?.filter(alert => !alert.resolved_at) ?? [];
  const resolved = alerts.data?.filter(alert => alert.resolved_at) ?? [];
  const needingAttention = open.filter(alert => !alert.acknowledged_at).length;

  return (
    <Screen
      title="Field alerts"
      subtitle={
        alerts.data
          ? needingAttention > 0
            ? `${needingAttention} need${needingAttention === 1 ? 's' : ''} your attention`
            : 'Nothing new to look at'
          : 'Reading alerts…'
      }
      hideBack
      onRefresh={alerts.reload}
      refreshing={alerts.refreshing}>
      {alerts.loading ? <Loading label="Reading alerts…" /> : null}
      {alerts.error && !alerts.data ? <ErrorState error={alerts.error} onRetry={alerts.reload} /> : null}
      {alerts.data?.length === 0 ? (
        <EmptyState icon="check" title="No alerts" sub="Nothing has been raised for your sites." />
      ) : null}

      {open.map(alert => (
        <Row
          key={alert.id}
          icon={alert.severity === 'CRITICAL' ? 'alert' : 'bell'}
          label={alert.title}
          sub={`${alert.site_id} · ${relativeTime(alert.raised_at)}${
            alert.acknowledged_at ? ' · seen, still unresolved' : ''
          }`}
          tone={alertTone(alert.severity)}
          badge={alertStatus(alert)}
          onPress={() => navigation.navigate('alert', {alertId: alert.id})}
        />
      ))}

      {resolved.length > 0 ? <SectionLabel>Resolved</SectionLabel> : null}
      {resolved.map(alert => (
        <Row
          key={alert.id}
          icon="check"
          label={alert.title}
          sub={`Resolved ${relativeTime(alert.resolved_at)}`}
          onPress={() => navigation.navigate('alert', {alertId: alert.id})}
        />
      ))}

      <ActionButton
        label="Past activity"
        icon="clock"
        tone="outline"
        onPress={() => navigation.navigate('history')}
      />
      <Note
        icon="shield"
        label="Marking an alert as seen does not fix it"
        sub="Acknowledgement records that someone looked. The fault stays open until the equipment is resolved."
      />
    </Screen>
  );
}

export function AlertScreen() {
  const {alertId} = useParams<'alert'>();
  const navigation = useNavigation();
  const load = useCallback(async () => {
    const alerts = await getAlerts();
    const alert = alerts.find(item => item.id === alertId);
    if (!alert) {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'This alert is not in your workspace.');
    }
    return alert;
  }, [alertId]);

  const resource = useResource<Alert>(load, [alertId]);
  const [actionError, setActionError] = useState<ApiError | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  if (resource.loading) {
    return (
      <Screen title="Alert" subtitle="Reading alert…">
        <Loading />
      </Screen>
    );
  }
  if (!resource.data) {
    return (
      <Screen title="Alert" subtitle="Unavailable">
        {resource.error ? <ErrorState error={resource.error} onRetry={resource.reload} /> : null}
      </Screen>
    );
  }

  const alert = resource.data;
  const tone = alertTone(alert.severity);

  const acknowledge = async () => {
    setBusy(true);
    setActionError(undefined);
    try {
      await acknowledgeAlert(alert.id);
      await resource.reload();
    } catch (cause) {
      setActionError(cause as ApiError);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen
      title={alert.title}
      subtitle={`${alert.site_id} · ${relativeTime(alert.raised_at)}`}
      badge={{icon: 'alert', tone}}
      onRefresh={resource.reload}
      refreshing={resource.refreshing}>
      <Hero
        icon="alert"
        label={`${titleCase(alert.severity)} · ${alertStatus(alert).toUpperCase()}`}
        value={alert.resolved_at ? 'Resolved' : 'Still open'}
        sub={alert.detail}
        tone={alert.resolved_at ? 'forest' : tone === 'red' ? 'red' : 'amber'}
      />

      <Steps
        items={[
          {icon: 'clock', label: 'Raised', sub: formatDateTime(alert.raised_at)},
          {
            icon: alert.acknowledged_at ? 'check' : 'bell',
            label: alert.acknowledged_at ? 'Seen' : 'Not seen yet',
            sub: alert.acknowledged_at
              ? `${alert.acknowledged_by ?? 'Someone'} · ${formatDateTime(alert.acknowledged_at)}`
              : 'Nobody has acknowledged this alert',
            tone: alert.acknowledged_at ? 'green' : 'amber',
          },
          {
            icon: alert.resolved_at ? 'check' : 'alert',
            label: alert.resolved_at ? 'Resolved' : 'Not resolved',
            sub: alert.resolved_at
              ? formatDateTime(alert.resolved_at)
              : 'The equipment still needs a check on site',
            tone: alert.resolved_at ? 'green' : 'red',
          },
        ]}
      />

      {actionError ? <ErrorState error={actionError} /> : null}

      {!alert.acknowledged_at ? (
        <ActionButton label="Mark as seen" icon="check" tone="amber" onPress={acknowledge} busy={busy} />
      ) : (
        <Note
          icon="check"
          label="Acknowledged"
          sub="Acknowledging is recorded separately from resolution; the fault is still open until the equipment is fixed."
          tone={alert.resolved_at ? 'green' : 'amber'}
        />
      )}

      <ActionButton
        label="Open the site"
        icon="pin"
        tone="outline"
        onPress={() => navigation.navigate('site', {siteId: alert.site_id})}
      />
      <ActionButton
        label="Past activity"
        icon="clock"
        tone="outline"
        onPress={() => navigation.navigate('history')}
      />
    </Screen>
  );
}

export function HistoryScreen() {
  const events = useResource<AuditEvent[]>(getAuditEvents, [], {pollMs: 15000});

  return (
    <Screen
      title="Past activity"
      subtitle="Everything the service recorded for this workspace."
      onRefresh={events.reload}
      refreshing={events.refreshing}>
      {events.loading ? <Loading label="Reading activity…" /> : null}
      {events.error && !events.data ? <ErrorState error={events.error} onRetry={events.reload} /> : null}
      {events.data?.length === 0 ? (
        <EmptyState
          icon="clock"
          title="Nothing recorded yet"
          sub="Commands, acknowledgements and configuration changes appear here as they happen."
        />
      ) : null}
      {events.data?.map(event => (
        <Row
          key={event.id}
          icon={
            event.operation.startsWith('COMMAND')
              ? 'motor'
              : event.operation.startsWith('ALERT')
              ? 'bell'
              : event.operation.startsWith('SCHEDULE')
              ? 'calendar'
              : 'flow'
          }
          label={titleCase(event.operation)}
          sub={`${event.summary ?? event.target} · ${formatDateTime(event.occurred_at)} · ${event.actor_id}`}
        />
      ))}
    </Screen>
  );
}
