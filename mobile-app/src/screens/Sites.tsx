import React, {useCallback} from 'react';
import {getSite, getSites} from '../api/endpoints';
import type {Site, SiteDetail} from '../api/types';
import {siteIcon, siteTone, titleCase} from '../format';
import {useNavigation, useParams} from '../navigation/Navigator';
import {useResource} from '../state/useResource';
import {useSession} from '../state/SessionContext';
import {Screen} from '../ui/Screen';
import {Hero, Metrics, Note, Row} from '../ui/blocks';
import {EmptyState, ErrorState, Loading} from '../ui/StateViews';

export function SitesScreen() {
  const navigation = useNavigation();
  const session = useSession();
  const sites = useResource<Site[]>(getSites, [session.me?.activeCorporationId]);

  return (
    <Screen
      title="My sites"
      subtitle="Choose where to work."
      hideBack
      onRefresh={sites.reload}
      refreshing={sites.refreshing}>
      {sites.loading ? <Loading label="Reading your sites…" /> : null}
      {sites.error && !sites.data ? <ErrorState error={sites.error} onRetry={sites.reload} /> : null}
      {sites.data?.length === 0 ? (
        <EmptyState icon="pin" title="No sites yet" sub="No site in this workspace is shared with you." />
      ) : null}
      {sites.data?.map(site => (
        <Row
          key={site.id}
          icon={siteIcon(site.type)}
          label={site.name}
          sub={`${titleCase(site.type)} · ${site.location ?? site.timezone}${
            site.permission_profile ? ` · ${titleCase(site.permission_profile)}` : ''
          }`}
          tone={siteTone(site.health)}
          badge={titleCase(site.health)}
          onPress={() => {
            session.selectSite(site.id);
            navigation.navigate('site', {siteId: site.id});
          }}
        />
      ))}
      <Note
        icon="shield"
        label="Sites you can open"
        sub="The service only lists sites your workspace role has been granted."
      />
    </Screen>
  );
}

export function SiteScreen() {
  const {siteId} = useParams<'site'>();
  const navigation = useNavigation();
  const session = useSession();
  const load = useCallback(() => getSite(siteId), [siteId]);
  const site = useResource<SiteDetail>(load, [siteId], {pollMs: 20000});

  if (site.loading) {
    return (
      <Screen title="Site" subtitle="Reading site…">
        <Loading />
      </Screen>
    );
  }
  if (!site.data) {
    return (
      <Screen title="Site" subtitle="Unavailable">
        {site.error ? <ErrorState error={site.error} onRetry={site.reload} /> : null}
      </Screen>
    );
  }

  const detail = site.data;
  const online = Number(detail.deviceCounts.online ?? 0);
  const tone = siteTone(detail.health);

  return (
    <Screen
      title={detail.name}
      subtitle={`${titleCase(detail.type)} · ${detail.location ?? ''}`}
      badge={{icon: siteIcon(detail.type), tone}}
      onRefresh={site.reload}
      refreshing={site.refreshing}>
      <Hero
        icon="leaf"
        label="FIELD STATUS"
        value={titleCase(detail.health)}
        sub={`${online} of ${detail.deviceCounts.total} controllers online · ${detail.timezone}`}
        tone={detail.health === 'HEALTHY' ? 'forest' : detail.health === 'OFFLINE' ? 'red' : 'amber'}
      />
      <Metrics
        items={[
          {
            icon: 'drop',
            value: detail.moisture === null ? '—' : `${Math.round(Number(detail.moisture))}%`,
            label: 'Soil moisture',
          },
          {
            icon: 'power',
            value: detail.pressure === null ? '—' : `${Number(detail.pressure).toFixed(1)} bar`,
            label: 'Water pressure',
          },
        ]}
      />
      <Row
        icon="cpu"
        label="Controllers"
        sub="Motors, valves and sensors"
        onPress={() => navigation.navigate('devices', {siteId: detail.id})}
      />
      <Row
        icon="flow"
        label="Water paths"
        sub="How the water travels through this site"
        onPress={() => navigation.navigate('topology', {siteId: detail.id})}
      />
      <Row
        icon="calendar"
        label="Schedules"
        sub="Water at the right time"
        onPress={() => navigation.navigate('schedules')}
      />
      {detail.zones.length > 0 ? (
        <>
          {detail.zones.map(zone => (
            <Row key={zone.id} icon="pin" label={zone.name} sub="Zone in this site" />
          ))}
        </>
      ) : null}
      {session.activeSiteId !== detail.id ? (
        <Note
          icon="pin"
          label="Not your working site"
          sub="Open it from My sites to make it the site the dashboard shows."
        />
      ) : null}
    </Screen>
  );
}
