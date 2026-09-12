import React, {useCallback} from 'react';
import {ApiError} from '../api/client';
import {getFlows, getSite, getTopology, validateFlow} from '../api/endpoints';
import {componentStateLabel, titleCase} from '../format';
import {useParams} from '../navigation/Navigator';
import {useResource} from '../state/useResource';
import {loadSiteEquipment, primaryController, primaryPump, gatingValve} from '../state/equipment';
import {Screen} from '../ui/Screen';
import {Hero, Note, SectionLabel, Steps} from '../ui/blocks';
import {ErrorState, Loading} from '../ui/StateViews';
import {describeNode} from '../ui/Topology';

const CHECK_LABELS: Record<string, string> = {
  OWNERSHIP: 'Every component belongs to this workspace',
  PORT_COMPATIBILITY: 'Each connection matches the hardware ports',
  BOUNDED_EXECUTION: 'The run has a time limit it cannot exceed',
  SAFE_STOP: 'A safe stop is part of the order',
  FRESH_FEEDBACK: 'Recent device feedback is required before starting',
};

/**
 * The activation order for a published path, built from the real equipment on
 * the site and the checks the service reports for the flow. The order shown is
 * the order the service enforces, not a picture of one.
 */
export function SequenceScreen() {
  const {flowId} = useParams<'sequence'>();

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
    const validation = flow.status === 'PUBLISHED' ? await validateFlow(flow.id).catch(() => undefined) : undefined;
    return {flow, site, topology, equipment, validation};
  }, [flowId]);

  const resource = useResource(load, [flowId]);

  if (resource.loading) {
    return (
      <Screen title="Run order" subtitle="Reading the order…">
        <Loading />
      </Screen>
    );
  }
  if (!resource.data) {
    return (
      <Screen title="Run order" subtitle="Unavailable">
        {resource.error ? <ErrorState error={resource.error} onRetry={resource.reload} /> : null}
      </Screen>
    );
  }

  const {flow, site, topology, equipment, validation} = resource.data;
  const controller = primaryController(equipment.controllers);
  const pump = primaryPump(controller);
  const valve = gatingValve(controller);
  const components = equipment.controllers.flatMap(device => device.components);
  const destination = topology.connections
    .filter(connection => !topology.connections.some(other => other.from === connection.to))
    .map(connection => describeNode(connection.to, components, site.zones).label);

  return (
    <Screen
      title="Run order"
      subtitle={`${flow.name} · open the valve first, then start the motor.`}
      onRefresh={resource.reload}
      refreshing={resource.refreshing}>
      <Hero
        icon="reorder"
        label="PROTECTED ORDER"
        value={flow.status === 'PUBLISHED' ? `Version ${flow.published_version}` : 'Draft'}
        sub={
          destination.length > 0
            ? `Water reaches ${destination.join(', ')}.`
            : 'The service reports the order below for this path.'
        }
        tone={flow.status === 'PUBLISHED' ? 'forest' : 'amber'}
      />

      <Steps
        items={[
          {
            icon: 'valve',
            label: `1 · Open ${valve?.name ?? 'the valve'}`,
            sub: valve
              ? `Now ${componentStateLabel(valve).toLowerCase()} · the run waits for a confirmed open position`
              : 'The run waits for a confirmed open position',
          },
          {
            icon: 'motor',
            label: `2 · Start ${pump?.name ?? 'the motor'}`,
            sub: pump
              ? `Now ${componentStateLabel(pump).toLowerCase()} · only after the valve confirms`
              : 'Only after the valve confirms',
          },
          {
            icon: 'shield',
            label: '3 · Safe stop',
            sub: 'Motor off is confirmed before the valve is allowed to close',
          },
        ]}
      />

      <Note
        icon="lock"
        label="This order cannot be reversed"
        sub="A motor start before a confirmed open valve is refused by the service, not just hidden in the app."
      />

      {validation ? (
        <>
          <SectionLabel>Checks the service applies</SectionLabel>
          <Steps
            items={validation.checks.map(check => ({
              icon: 'check' as const,
              label: CHECK_LABELS[check] ?? titleCase(check),
              sub: check,
            }))}
          />
          <Note
            icon={validation.valid ? 'check' : 'alert'}
            label={validation.valid ? 'All safety checks passed' : 'This path did not pass its checks'}
            tone={validation.valid ? 'green' : 'amber'}
          />
        </>
      ) : (
        <Note
          icon="alert"
          label="Checks are available once the path is published"
          sub="A draft has no frozen version for the service to validate."
          tone="amber"
        />
      )}
    </Screen>
  );
}
