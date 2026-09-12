import React, {useCallback} from 'react';
import {getAlerts, getSchedules, getSite} from '../api/endpoints';
import type {Alert, Schedule, SiteDetail} from '../api/types';
import {alertTone, componentStateLabel, formatDateTime, relativeTime} from '../format';
import {useNavigation} from '../navigation/Navigator';
import {useResource} from '../state/useResource';
import {useSession} from '../state/SessionContext';
import {loadSiteEquipment, primaryController, primaryPump, valvesOf} from '../state/equipment';
import type {SiteEquipment} from '../state/equipment';
import {Screen} from '../ui/Screen';
import {ActionButton} from '../ui/ActionButton';
import {Hero, Metrics, Note, Row, Tiles} from '../ui/blocks';
import {EmptyState, ErrorState, Loading} from '../ui/StateViews';

type Dashboard = {
  site: SiteDetail;
  equipment: SiteEquipment;
  schedules: Schedule[];
  alerts: Alert[];
};

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) {
    return 'Good morning';
  }
  return hour < 17 ? 'Good afternoon' : 'Good evening';
}

export function HomeScreen() {
  const navigation = useNavigation();
  const session = useSession();
  const siteId = session.activeSiteId;

  const load = useCallback(async (): Promise<Dashboard> => {
    if (!siteId) {
      throw new Error('No site selected');
    }
    const [site, equipment, schedules, alerts] = await Promise.all([
      getSite(siteId),
      loadSiteEquipment(siteId),
      getSchedules(),
      getAlerts(),
    ]);
    return {site, equipment, schedules, alerts};
  }, [siteId]);

  // The dashboard re-reads confirmed state so the farmer is not looking at a
  // stale picture of the field.
  const dashboard = useResource(load, [siteId], {pollMs: 15000, enabled: Boolean(siteId)});

  if (!siteId) {
    return (
      <Screen title={greeting()} subtitle={session.me?.display_name} hideBack>
        <EmptyState
          icon="pin"
          title="No sites yet"
          sub="This workspace has no site you can open."
        />
      </Screen>
    );
  }

  if (dashboard.loading) {
    return (
      <Screen title={greeting()} subtitle="Reading your field…" hideBack>
        <Loading />
      </Screen>
    );
  }

  if (!dashboard.data) {
    return (
      <Screen title={greeting()} subtitle="Field unavailable" hideBack onRefresh={dashboard.reload}>
        {dashboard.error ? <ErrorState error={dashboard.error} onRetry={dashboard.reload} /> : null}
      </Screen>
    );
  }

  const {site, equipment, schedules, alerts} = dashboard.data;
  const controller = primaryController(equipment.controllers);
  const pump = primaryPump(controller);
  const valves = controller ? valvesOf(controller.components) : [];
  const online = controller?.status === 'ONLINE';
  const running = pump?.reported_state === 'RUNNING';

  const siteSchedules = schedules.filter(schedule => schedule.site_id === site.id);
  const nextSchedule = siteSchedules
    .filter(schedule => schedule.enabled && schedule.next_due_at)
    .sort((a, b) => Date.parse(a.next_due_at!) - Date.parse(b.next_due_at!))[0];
  const openAlerts = alerts.filter(alert => !alert.resolved_at);
  const topAlert = openAlerts.find(alert => alert.site_id === site.id) ?? openAlerts[0];

  const heroTone = running ? 'blue' : online ? 'forest' : 'amber';
  const heroLabel = running ? 'WATERING NOW' : online ? 'READY TO WATER' : 'NO LIVE FEEDBACK';
  const heroSub = controller
    ? `${valves.length} valve${valves.length === 1 ? '' : 's'} connected · ${
        online ? 'Online' : 'Offline'
      } · ${relativeTime(controller.last_seen_at)}`
    : 'No controller with a motor or valve on this site.';

  return (
    <Screen
      title={`${greeting()}${session.me ? `, ${session.me.display_name.split(' ')[0]}` : ''}`}
      subtitle={`${site.name} · ${site.location ?? site.timezone}`}
      badge={{icon: 'settings', tone: 'green'}}
      hideBack
      onRefresh={dashboard.reload}
      refreshing={dashboard.refreshing}>
      <Hero
        icon={running ? 'drop' : 'motor'}
        label={heroLabel}
        value={pump ? pump.name : controller?.name ?? 'No controller'}
        sub={pump ? `${componentStateLabel(pump)} · ${heroSub}` : heroSub}
        tone={heroTone}
      />

      {pump && online && session.canControl ? (
        <ActionButton
          label={running ? 'View the live run' : 'Water now'}
          icon="drop"
          onPress={() =>
            running
              ? navigation.navigate('live')
              : navigation.navigate('waterNow', {deviceId: controller!.id, componentId: pump.id})
          }
        />
      ) : null}

      {!controller ? (
        <ActionButton
          label="Choose another site"
          icon="pin"
          tone="outline"
          onPress={() => navigation.navigate('sites')}
        />
      ) : null}

      {!session.canControl ? (
        <Note
          icon="lock"
          label="View only"
          sub="Your role can watch the field but cannot start or stop equipment."
          tone="amber"
        />
      ) : null}

      {!online && controller ? (
        <Note
          icon="offline"
          label="Controller offline"
          sub={`${controller.name} last reported ${relativeTime(controller.last_seen_at)}. Remote control is unavailable.`}
          tone="amber"
        />
      ) : null}

      <Metrics
        items={[
          {
            icon: 'drop',
            value: site.moisture === null ? '—' : `${Math.round(Number(site.moisture))}%`,
            label: 'Soil moisture',
          },
          {
            icon: 'power',
            value: site.pressure === null ? '—' : `${Number(site.pressure).toFixed(1)} bar`,
            label: 'Water pressure',
          },
        ]}
      />

      <Tiles
        items={[
          {icon: 'pin', label: 'My sites', sub: `${session.sites.length} total`, onPress: () => navigation.navigate('sites')},
          {icon: 'flow', label: 'Water paths', onPress: () => navigation.navigate('paths')},
          {
            icon: 'calendar',
            label: 'Schedules',
            sub: `${siteSchedules.filter(s => s.enabled).length} active`,
            onPress: () => navigation.navigate('schedules'),
          },
          {
            icon: 'bell',
            label: 'Alerts',
            sub: openAlerts.length ? `${openAlerts.length} open` : 'All clear',
            tone: openAlerts.length ? 'amber' : 'green',
            onPress: () => navigation.navigate('alerts'),
          },
        ]}
      />

      {nextSchedule ? (
        <Row
          icon="calendar"
          label={nextSchedule.name}
          sub={`Next · ${formatDateTime(nextSchedule.next_due_at)}`}
          onPress={() => navigation.navigate('schedule', {scheduleId: nextSchedule.id})}
        />
      ) : null}

      {topAlert ? (
        <Row
          icon="alert"
          label={topAlert.title}
          sub={`${relativeTime(topAlert.raised_at)} · Tap to see what happened`}
          tone={alertTone(topAlert.severity)}
          onPress={() => navigation.navigate('alert', {alertId: topAlert.id})}
        />
      ) : null}

      {controller ? (
        <Row
          icon="cpu"
          label="Controllers"
          sub={`${equipment.devices.length} on this site · ${
            equipment.devices.filter(device => device.status === 'ONLINE').length
          } online`}
          onPress={() => navigation.navigate('devices', {siteId: site.id})}
        />
      ) : null}

      <Row
        icon="clock"
        label="Past activity"
        sub="Runs, commands and changes recorded by the service"
        onPress={() => navigation.navigate('history')}
      />
      <Row
        icon="settings"
        label="Settings"
        sub={`${session.me?.role.replace('_', ' ').toLowerCase()} · ${session.baseUrl}`}
        onPress={() => navigation.navigate('settings')}
      />
    </Screen>
  );
}
