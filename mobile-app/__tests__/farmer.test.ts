import type { OperationalFlowDetail, SensorReading } from '../src/api/types';
import { controlBlocker, latestReadings } from '../src/state/farmer';

export const readyFlow: OperationalFlowDetail = {
  id: 'flow-1',
  site_id: 'site-1',
  corporation_id: 'corp-1',
  name: 'Water the field',
  status: 'PUBLISHED',
  published_version: 1,
  step_count: 1,
  online: true,
  currentState: 'OFF',
  latestRun: null,
  steps: [
    {
      id: 'step-1',
      step_index: 1,
      component_id: 'pump-1',
      component_name: 'Water pump',
      kind: 'PUMP',
      on_action: 'START',
      off_action: 'STOP',
      reported_state: 'STOPPED',
      feedback_quality: 'CONFIRMED',
      device_id: 'device-1',
      device_name: 'Field device',
      device_status: 'ONLINE',
    },
  ],
};

test('only confirmed, online, published equipment is ready to control', () => {
  expect(controlBlocker(readyFlow, true, false)).toBeUndefined();
  expect(controlBlocker(readyFlow, false, false)).toMatch(/manager/);
  expect(controlBlocker(readyFlow, true, true)).toMatch(/Connection lost/);
  expect(controlBlocker({ ...readyFlow, online: false }, true, false)).toMatch(
    /offline/,
  );
  expect(
    controlBlocker({ ...readyFlow, status: 'DRAFT' }, true, false),
  ).toMatch(/setting up/);
  expect(controlBlocker({ ...readyFlow, steps: [] }, true, false)).toMatch(
    /setting up/,
  );
  expect(
    controlBlocker(
      {
        ...readyFlow,
        steps: [{ ...readyFlow.steps[0], feedback_quality: 'STALE' }],
      },
      true,
      false,
    ),
  ).toMatch(/not confirmed/);
});

test.each(['ACCEPTED', 'WAITING_FEEDBACK'])(
  'blocks another command while %s',
  state => {
    const latestRun = {
      id: 'run-1',
      site_id: 'site-1',
      flow_id: 'flow-1',
      flow_name: 'Water the field',
      requested_action: 'ON' as const,
      state,
      started_at: '2026-10-06T00:00:00Z',
      ended_at: null,
    };
    expect(controlBlocker({ ...readyFlow, latestRun }, true, false)).toMatch(
      /last request/,
    );
  },
);

test('latest readings select the newest measurement per sensor without changing history', () => {
  const reading: SensorReading = {
    id: 'r1',
    component_id: 'temperature',
    component_name: 'Temperature',
    value: '25',
    unit: 'C',
    quality: 'VALID',
    measured_at: '2026-10-06T01:00:00Z',
  };
  const readings = [
    { ...reading, id: 'r2', value: '28', measured_at: '2026-10-06T02:00:00Z' },
    reading,
    { ...reading, id: 'r3', component_id: 'humidity', value: '70', unit: '%' },
  ];
  expect(latestReadings(readings).map(item => item.id)).toEqual(['r2', 'r3']);
  expect(readings).toHaveLength(3);
  expect(latestReadings([])).toEqual([]);
});
