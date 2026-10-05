import React from 'react';
import { Alert, Text } from 'react-native';
import Renderer, { act } from 'react-test-renderer';
import {
  OperationsDeviceScreen,
  OperationsHomeScreen,
  OperationsZoneScreen,
} from '../src/screens/Operations';
import { useResource } from '../src/state/useResource';
import { useSession } from '../src/state/SessionContext';
import { useNavigation, useParams } from '../src/navigation/Navigator';
import { operateFlow } from '../src/api/endpoints';
import { ActionButton } from '../src/ui/ActionButton';
import type { OperationalFlowDetail } from '../src/api/types';
import { ApiError } from '../src/api/client';

jest.mock('../src/state/useResource');
jest.mock('../src/state/SessionContext');
jest.mock('../src/navigation/Navigator');
jest.mock('../src/api/endpoints');
jest.mock('../src/ui/Screen', () => ({
  Screen: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const flow: OperationalFlowDetail = {
  id: 'flow-1',
  site_id: 'site-1',
  corporation_id: 'corp-1',
  name: 'Water field',
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
      component_name: 'Pump',
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
const dashboard = {
  device: {
    id: 'device-1',
    name: 'Field device',
    site_name: 'Farm',
    zone_name: 'North',
    status: 'ONLINE',
    model: 'AT',
    serial: '123',
    components: [
      {
        id: 'pump-1',
        name: 'Pump',
        kind: 'PUMP',
        hardware_channel: 'relay-1',
        reported_state: 'STOPPED',
        feedback_quality: 'CONFIRMED',
      },
    ],
  },
  flows: [flow],
  readings: [],
};
const navigate = jest.fn();
const reload = jest.fn().mockResolvedValue(undefined);
let tree: Renderer.ReactTestRenderer;
const resource = (data: unknown, error?: ApiError) => ({
  data,
  error,
  loading: false,
  refreshing: false,
  reload,
});
const texts = () =>
  tree.root
    .findAllByType(Text)
    .map(node => node.props.children)
    .flat()
    .join(' ');

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useSession).mockReturnValue({
    canControl: true,
    canManage: true,
    connecting: false,
    me: { activeCorporationId: 'corp-1' },
    workspaces: [{ id: 'corp-1', name: 'Corporation' }],
    sites: [{ id: 'site-1', name: 'Farm' }],
  } as ReturnType<typeof useSession>);
  jest
    .mocked(useNavigation)
    .mockReturnValue({ navigate, reset: jest.fn() } as unknown as ReturnType<
      typeof useNavigation
    >);
  jest
    .mocked(useParams)
    .mockReturnValue({ deviceId: 'device-1', zoneId: 'zone-1' });
  jest.mocked(useResource).mockReturnValue(resource(dashboard));
});
afterEach(async () => {
  if (tree) await act(() => tree.unmount());
});
async function render(element: React.ReactElement) {
  await act(() => {
    tree = Renderer.create(element);
  });
}

test('home preserves site grouping and zone navigation', async () => {
  jest.mocked(useResource).mockReturnValue(
    resource([
      {
        id: 'zone-1',
        site_id: 'site-1',
        name: 'North',
        device_count: 1,
        online_count: 0,
      },
      {
        id: 'zone-2',
        site_id: 'site-1',
        name: 'South',
        device_count: 1,
        online_count: 1,
      },
      { id: 'zone-3', site_id: 'site-1', name: 'East', device_count: 0 },
    ]),
  );
  await render(<OperationsHomeScreen />);
  expect(texts()).toContain('Farm');
  const cards = tree.root.findAll(
    node =>
      node.props.accessibilityLabel?.startsWith('Open ') && node.props.onPress,
    { deep: false },
  );
  expect(cards).toHaveLength(3);
  expect(cards[0].parent).toBe(cards[1].parent);
  expect(cards[2].parent).not.toBe(cards[0].parent);
  await act(() => cards[0].props.onPress());
  expect(navigate).toHaveBeenCalledWith('zone', { zoneId: 'zone-1' });
});

test('zone opens the selected device', async () => {
  jest.mocked(useResource).mockReturnValue(
    resource({
      name: 'North',
      site_name: 'Farm',
      devices: [dashboard.device],
    }),
  );
  await render(<OperationsZoneScreen />);
  await act(() =>
    tree.root
      .findAll(node => Boolean(node.props.onPress), { deep: false })
      .find(node =>
        node.props.accessibilityLabel?.startsWith('Open Field device'),
      )!
      .props.onPress(),
  );
  expect(navigate).toHaveBeenCalledWith('device', { deviceId: 'device-1' });
});

test('advanced configuration is hidden until requested', async () => {
  await render(<OperationsDeviceScreen />);
  expect(texts()).not.toContain('Hardware channel');
  expect(texts()).not.toContain('Channel relay-1');
  await act(() =>
    tree.root
      .findAll(node => Boolean(node.props.onPress), { deep: false })
      .find(node => node.props.accessibilityLabel === 'Device settings')!
      .props.onPress(),
  );
  expect(texts()).toMatch(/Channel\s+relay-1/);
  expect(texts()).toContain('Operation order');
});

test('offline equipment cannot be started or stopped', async () => {
  jest.mocked(useResource).mockReturnValue(
    resource({
      ...dashboard,
      device: { ...dashboard.device, status: 'OFFLINE' },
      flows: [{ ...flow, online: false }],
    }),
  );
  await render(<OperationsDeviceScreen />);
  for (const button of tree.root
    .findAllByType(ActionButton)
    .filter(node => ['Start', 'Stop'].includes(node.props.label)))
    expect(button.props.disabled).toBe(true);
  expect(texts()).toContain('Check its power');
  expect(operateFlow).not.toHaveBeenCalled();
});

test('failed refresh blocks actions on the last good snapshot', async () => {
  jest
    .mocked(useResource)
    .mockReturnValue(
      resource(
        dashboard,
        new ApiError(0, 'NETWORK_UNREACHABLE', 'Network lost'),
      ),
    );
  await render(<OperationsDeviceScreen />);
  expect(
    tree.root
      .findAllByType(ActionButton)
      .find(node => node.props.label === 'Start')!.props.disabled,
  ).toBe(true);
  expect(texts()).toContain('out of date');
});

test('unconfirmed feedback is never displayed as a confirmed running state', async () => {
  jest
    .mocked(useResource)
    .mockReturnValue(
      resource({
        ...dashboard,
        flows: [
          {
            ...flow,
            currentState: 'ON',
            steps: [{ ...flow.steps[0], feedback_quality: 'STALE' }],
          },
        ],
      }),
    );
  await render(<OperationsDeviceScreen />);
  expect(texts()).toContain('Status not confirmed');
  expect(texts()).not.toContain('Running');
});

test('operators cannot see configuration editing controls', async () => {
  jest
    .mocked(useSession)
    .mockReturnValue({ ...jest.mocked(useSession)(), canManage: false });
  await render(<OperationsDeviceScreen />);
  await act(() =>
    tree.root
      .findAll(node => Boolean(node.props.onPress), { deep: false })
      .find(node => node.props.accessibilityLabel === 'Device settings')!
      .props.onPress(),
  );
  expect(texts()).toContain('Ask your manager');
  expect(texts()).not.toContain('Move up');
});

test('starting requires confirmation and shows a request as pending, not running', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  jest
    .mocked(operateFlow)
    .mockResolvedValue({ state: 'WAITING_FEEDBACK' } as Awaited<
      ReturnType<typeof operateFlow>
    >);
  await render(<OperationsDeviceScreen />);
  await act(() =>
    tree.root
      .findAllByType(ActionButton)
      .find(node => node.props.label === 'Start')!
      .props.onPress(),
  );
  expect(operateFlow).not.toHaveBeenCalled();
  expect(alert.mock.calls[0][1]).toContain('Field device');
  await act(async () => {
    await alert.mock.calls[0][2]![1].onPress!();
  });
  expect(operateFlow).toHaveBeenCalledWith('flow-1', 'ON');
  expect(texts()).toContain('Wait for confirmation');
  expect(texts()).not.toContain('Running');
  alert.mockRestore();
});
