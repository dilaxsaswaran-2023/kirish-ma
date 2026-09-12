import React, {useCallback, useEffect, useRef, useState} from 'react';
import {getComponents, getDevice} from '../api/endpoints';
import type {DeviceComponent} from '../api/types';
import {relativeTime} from '../format';
import {useParams} from '../navigation/Navigator';
import {useResource} from '../state/useResource';
import {sensorsOf} from '../state/equipment';
import {Screen} from '../ui/Screen';
import {Bars, Card, Note, Row, SectionLabel} from '../ui/blocks';
import {EmptyState, ErrorState, Loading} from '../ui/StateViews';
import {StyleSheet, Text} from 'react-native';
import {colors, type as typography} from '../theme';

const SAMPLE_LIMIT = 12;

/** Pulls the leading number out of values like "42%" or "0.0 L/min". */
function numericValue(raw: string | null): number | undefined {
  if (!raw) {
    return undefined;
  }
  const match = raw.match(/-?\d+(\.\d+)?/);
  return match ? Number(match[0]) : undefined;
}

/**
 * Sensor readings. The service exposes the latest confirmed value per sensor,
 * so the chart is built from the samples this screen has actually observed
 * while open — it is labelled as such rather than presented as stored history.
 */
export function ReadingsScreen() {
  const {deviceId} = useParams<'readings'>();
  const load = useCallback(() => getDevice(deviceId), [deviceId]);
  const device = useResource(load, [deviceId]);
  const [samples, setSamples] = useState<Record<string, number[]>>({});
  const [live, setLive] = useState<DeviceComponent[]>([]);
  const lastVersions = useRef<Record<string, number>>({});

  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const components = await getComponents(deviceId);
        if (cancelled) {
          return;
        }
        setLive(components);
        setSamples(current => {
          const next = {...current};
          sensorsOf(components).forEach(sensor => {
            const value = numericValue(sensor.latest_value);
            if (value === undefined) {
              return;
            }
            // Only record a new bar when the controller reported a new reading.
            if (lastVersions.current[sensor.id] === sensor.state_version && next[sensor.id]?.length) {
              return;
            }
            lastVersions.current[sensor.id] = sensor.state_version;
            next[sensor.id] = [...(next[sensor.id] ?? []), value].slice(-SAMPLE_LIMIT);
          });
          return next;
        });
      } catch {
        // Keep the last readings on screen; a dropped poll is not a new value.
      }
    };
    poll();
    const timer = setInterval(poll, 5000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [deviceId]);

  const components = live.length > 0 ? live : device.data?.components ?? [];
  const sensors = sensorsOf(components);

  return (
    <Screen
      title="Readings"
      subtitle={device.data ? `${device.data.name} · live values` : 'Reading sensors…'}
      onRefresh={device.reload}
      refreshing={device.refreshing}>
      {device.loading ? <Loading /> : null}
      {device.error && !device.data ? <ErrorState error={device.error} onRetry={device.reload} /> : null}
      {device.data && sensors.length === 0 ? (
        <EmptyState icon="sensor" title="No sensors" sub="This controller has no sensor inputs connected." />
      ) : null}

      {sensors.map(sensor => {
        const history = samples[sensor.id] ?? [];
        return (
          <React.Fragment key={sensor.id}>
            <Row
              icon="sensor"
              label={sensor.name}
              sub={`${sensor.hardware_channel} · ${relativeTime(sensor.measured_at)}`}
              badge={sensor.latest_value ?? '—'}
              tone={sensor.feedback_quality === 'CONFIRMED' ? 'green' : 'amber'}
            />
            {history.length > 1 ? (
              <Bars values={history} />
            ) : (
              <Card>
                <Text style={styles.pending}>
                  Waiting for a second reading before drawing a trend.
                </Text>
              </Card>
            )}
          </React.Fragment>
        );
      })}

      {sensors.length > 0 ? (
        <>
          <SectionLabel>About these values</SectionLabel>
          <Note
            icon="chart"
            label="Readings observed while this screen is open"
            sub="The service reports the latest confirmed value per sensor; the bars are the samples this phone has seen since you opened the screen."
          />
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  pending: {...typography.small, color: colors.muted},
});
