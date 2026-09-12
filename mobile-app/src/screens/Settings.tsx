import React from 'react';
import {getMe} from '../api/endpoints';
import {titleCase} from '../format';
import {useNavigation} from '../navigation/Navigator';
import {useResource} from '../state/useResource';
import {useSession} from '../state/SessionContext';
import {useControl} from '../state/ControlContext';
import {Screen} from '../ui/Screen';
import {ActionButton} from '../ui/ActionButton';
import {Hero, Note, Row, SectionLabel} from '../ui/blocks';

export function SettingsScreen() {
  const navigation = useNavigation();
  const session = useSession();
  const control = useControl();
  const me = useResource(getMe, [session.me?.id]);

  const runActive = control.phase !== 'idle' && control.phase !== 'complete';

  return (
    <Screen
      title="Settings"
      subtitle="Connection, identity and access"
      onRefresh={me.reload}
      refreshing={me.refreshing}>
      <Hero
        icon="user"
        label="SIGNED IN AS"
        value={session.me?.display_name ?? 'Unknown'}
        sub={`${titleCase(session.me?.role ?? '')} · account ${session.me?.account_status.toLowerCase() ?? '—'}`}
      />

      <SectionLabel>Connection</SectionLabel>
      <Row icon="wifi" label="Service address" sub={session.baseUrl} />
      <Row
        icon="check"
        label={me.error ? 'Not reachable' : 'Reachable'}
        sub={me.error ? me.error.message : 'The last identity check succeeded.'}
        tone={me.error ? 'amber' : 'green'}
      />

      <SectionLabel>Workspace</SectionLabel>
      {session.workspaces.map(workspace => (
        <Row
          key={workspace.id}
          icon="home"
          label={workspace.name}
          sub={`${workspace.workspace_code} · ${workspace.default_timezone} · ${workspace.status.toLowerCase()}`}
          badge={workspace.id === session.me?.activeCorporationId ? 'Active' : undefined}
        />
      ))}

      <SectionLabel>What your role may do</SectionLabel>
      <Row
        icon={session.canControl ? 'play' : 'lock'}
        label={session.canControl ? 'Can start and stop equipment' : 'Cannot control equipment'}
        sub="Enforced by the service, not by this app"
        tone={session.canControl ? 'green' : 'amber'}
      />
      <Row
        icon={session.canManage ? 'edit' : 'lock'}
        label={session.canManage ? 'Can change configuration' : 'Cannot change configuration'}
        sub="Publishing paths and pausing schedules"
        tone={session.canManage ? 'green' : 'amber'}
      />

      <SectionLabel>Sites you can open</SectionLabel>
      {session.sites.map(site => (
        <Row
          key={site.id}
          icon="pin"
          label={site.name}
          sub={site.permission_profile ? titleCase(site.permission_profile) : 'Workspace-wide access'}
          badge={site.id === session.activeSiteId ? 'Working here' : undefined}
          onPress={() => {
            session.selectSite(site.id);
            navigation.reset('home');
          }}
        />
      ))}

      {runActive ? (
        <Note
          icon="alert"
          label="A run is in progress"
          sub="Finish or safely stop the run before signing out."
          tone="red"
        />
      ) : null}

      <ActionButton
        label="Sign out"
        icon="close"
        tone="outline"
        disabled={runActive}
        onPress={() => {
          control.reset();
          session.signOut();
          navigation.reset('welcome');
        }}
      />
    </Screen>
  );
}
