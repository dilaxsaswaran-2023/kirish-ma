import React, {useCallback, useState} from 'react';
import {ApiError} from '../api/client';
import {
  getCommand,
  getFlows,
  getSite,
  getTopology,
  publishFlow,
  runFlow,
  validateFlow,
} from '../api/endpoints';
import type {Flow, FlowValidation, SiteDetail, Topology} from '../api/types';
import {titleCase} from '../format';
import {useNavigation, useParams} from '../navigation/Navigator';
import {useResource} from '../state/useResource';
import {useSession} from '../state/SessionContext';
import {useControl} from '../state/ControlContext';
import {gatingValve, loadSiteEquipment, valvesOf} from '../state/equipment';
import type {SiteEquipment} from '../state/equipment';
import {Screen} from '../ui/Screen';
import {ActionButton} from '../ui/ActionButton';
import {Hero, Note, Row, SectionLabel, Steps} from '../ui/blocks';
import {EmptyState, ErrorState, Loading} from '../ui/StateViews';
import {TopologyView} from '../ui/Topology';

const CHECK_LABELS: Record<string, string> = {
  OWNERSHIP: 'Every component belongs to this workspace',
  PORT_COMPATIBILITY: 'Each connection matches the hardware ports',
  BOUNDED_EXECUTION: 'The run has a time limit it cannot exceed',
  SAFE_STOP: 'A safe stop is part of the order',
  FRESH_FEEDBACK: 'Recent device feedback is required before starting',
};

export function PathsScreen() {
  const navigation = useNavigation();
  const session = useSession();
  const flows = useResource<Flow[]>(getFlows, [session.me?.activeCorporationId]);

  return (
    <Screen
      title="Water paths"
      subtitle="How water travels, and the order it is opened in."
      hideBack
      onRefresh={flows.reload}
      refreshing={flows.refreshing}>
      {flows.loading ? <Loading label="Reading water paths…" /> : null}
      {flows.error && !flows.data ? <ErrorState error={flows.error} onRetry={flows.reload} /> : null}
      {flows.data?.length === 0 ? (
        <EmptyState icon="flow" title="No water paths" sub="No path has been created for your sites." />
      ) : null}
      {flows.data?.map(flow => {
        const published = flow.status === 'PUBLISHED';
        return (
          <Row
            key={flow.id}
            icon="flow"
            label={flow.name}
            sub={
              published
                ? `Published version ${flow.published_version} · ${flow.site_id}`
                : `Draft · not yet runnable · ${flow.site_id}`
            }
            tone={published ? 'green' : 'amber'}
            badge={published ? `v${flow.published_version}` : 'Draft'}
            onPress={() => navigation.navigate('path', {flowId: flow.id})}
          />
        );
      })}
      <Note
        icon="shield"
        label="Only a published path can run"
        sub="Publishing freezes the order so a schedule always runs the version it was set up with."
      />
    </Screen>
  );
}

export function PathScreen() {
  const {flowId} = useParams<'path'>();
  const navigation = useNavigation();
  const session = useSession();
  const control = useControl();

  const load = useCallback(async () => {
    const flows = await getFlows();
    const flow = flows.find(item => item.id === flowId);
    if (!flow) {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'This water path is not in your workspace.');
    }
    const [site, topology, equipment] = await Promise.all([
      getSite(flow.site_id),
      getTopology(flow.site_id),
      loadSiteEquipment(flow.site_id),
    ]);
    return {flow, site, topology, equipment};
  }, [flowId]);

  const resource = useResource<{
    flow: Flow;
    site: SiteDetail;
    topology: Topology;
    equipment: SiteEquipment;
  }>(load, [flowId]);

  const [validation, setValidation] = useState<FlowValidation | undefined>(undefined);
  const [actionError, setActionError] = useState<ApiError | undefined>(undefined);
  const [busy, setBusy] = useState<'validate' | 'publish' | 'run' | undefined>(undefined);

  if (resource.loading) {
    return (
      <Screen title="Water path" subtitle="Reading the path…">
        <Loading />
      </Screen>
    );
  }
  if (!resource.data) {
    return (
      <Screen title="Water path" subtitle="Unavailable">
        {resource.error ? <ErrorState error={resource.error} onRetry={resource.reload} /> : null}
      </Screen>
    );
  }

  const {flow, site, topology, equipment} = resource.data;
  const components = equipment.controllers.flatMap(controller => controller.components);
  const published = flow.status === 'PUBLISHED';

  const runNow = async () => {
    setBusy('run');
    setActionError(undefined);
    try {
      const receipt = await runFlow(flow.id);
      // The receipt names the command; the command names the component the
      // service actually chose, so the live screen tracks the real equipment.
      const command = await getCommand(receipt.commandId);
      const controller = equipment.controllers.find(device =>
        device.components.some(component => component.id === command.component_id),
      );
      if (!controller) {
        throw new ApiError(
          0,
          'RESOURCE_NOT_FOUND',
          'The run started, but its component is not on a controller you can read.',
        );
      }
      control.adopt(receipt, {
        componentId: command.component_id,
        deviceId: controller.id,
        valveId: gatingValve(controller)?.id,
        durationSeconds: 900,
      });
      navigation.navigate('live');
    } catch (cause) {
      setActionError(cause as ApiError);
    } finally {
      setBusy(undefined);
    }
  };

  const validate = async () => {
    setBusy('validate');
    setActionError(undefined);
    try {
      setValidation(await validateFlow(flow.id));
    } catch (cause) {
      setActionError(cause as ApiError);
    } finally {
      setBusy(undefined);
    }
  };

  const publish = async () => {
    setBusy('publish');
    setActionError(undefined);
    try {
      await publishFlow(flow.id);
      await resource.reload();
    } catch (cause) {
      setActionError(cause as ApiError);
    } finally {
      setBusy(undefined);
    }
  };

  return (
    <Screen
      title={flow.name}
      subtitle={`${site.name} · ${published ? `published v${flow.published_version}` : 'draft'}`}
      badge={{icon: 'flow', tone: published ? 'green' : 'amber'}}
      onRefresh={resource.reload}
      refreshing={resource.refreshing}>
      <Hero
        icon="flow"
        label={published ? 'PUBLISHED PATH' : 'DRAFT PATH'}
        value={published ? `Version ${flow.published_version}` : 'Not published'}
        sub={
          published
            ? `Configuration ${flow.config_hash ?? 'unversioned'} · topology ${topology.status.toLowerCase()}`
            : 'A draft cannot be run or scheduled until it is published.'
        }
        tone={published ? 'forest' : 'amber'}
      />

      <SectionLabel>Water direction</SectionLabel>
      <TopologyView
        data={topology}
        components={components}
        zones={site.zones}
        caption={`${topology.connections.length} one-way connections reported by the service.`}
      />

      <Row
        icon="reorder"
        label="Run order"
        sub="Valve first, motor second, safe stop last"
        onPress={() => navigation.navigate('sequence', {flowId: flow.id})}
      />

      {validation ? (
        <>
          <SectionLabel>Safety checks</SectionLabel>
          <Steps
            items={validation.checks.map(check => ({
              icon: 'check' as const,
              label: CHECK_LABELS[check] ?? titleCase(check),
              sub: check,
            }))}
          />
        </>
      ) : null}

      {actionError ? <ErrorState error={actionError} /> : null}

      <ActionButton
        label="Check this path"
        icon="shield"
        tone="outline"
        onPress={validate}
        busy={busy === 'validate'}
      />
      {session.canManage ? (
        <ActionButton
          label={published ? 'Publish a new version' : 'Publish this path'}
          icon="check"
          tone="outline"
          onPress={publish}
          busy={busy === 'publish'}
        />
      ) : null}
      {published && session.canControl ? (
        <ActionButton label="Run this path now" icon="play" onPress={runNow} busy={busy === 'run'} />
      ) : null}
      {!published ? (
        <Note
          icon="lock"
          label="Draft paths cannot run"
          sub="Publish the path to give schedules and manual runs a frozen version to use."
          tone="amber"
        />
      ) : null}
    </Screen>
  );
}

export function TopologyScreen() {
  const {siteId} = useParams<'topology'>();
  const load = useCallback(async () => {
    const [site, topology, equipment] = await Promise.all([
      getSite(siteId),
      getTopology(siteId),
      loadSiteEquipment(siteId),
    ]);
    return {site, topology, equipment};
  }, [siteId]);
  const resource = useResource(load, [siteId], {pollMs: 8000});

  return (
    <Screen
      title="Water path"
      subtitle="Connected equipment and the direction water travels."
      onRefresh={resource.reload}
      refreshing={resource.refreshing}>
      {resource.loading ? <Loading /> : null}
      {resource.error && !resource.data ? (
        <ErrorState error={resource.error} onRetry={resource.reload} />
      ) : null}
      {resource.data ? (
        <>
          <TopologyView
            data={resource.data.topology}
            components={resource.data.equipment.controllers.flatMap(device => device.components)}
            zones={resource.data.site.zones}
            caption={`Topology status: ${resource.data.topology.status.toLowerCase()}.`}
          />
          <Note
            icon="arrow"
            label="Arrows show one-way water flow"
            sub="Highlighted equipment is open or running right now."
          />
          {resource.data.equipment.controllers.flatMap(device =>
            valvesOf(device.components).map(valve => (
              <Row
                key={valve.id}
                icon="valve"
                label={valve.name}
                sub={`${device.name} · ${valve.hardware_channel}`}
              />
            )),
          )}
        </>
      ) : null}
    </Screen>
  );
}
