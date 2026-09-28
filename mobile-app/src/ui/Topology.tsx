import React, {useMemo} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {Icon, IconName} from '../icons';
import {colors, radius, spacing, type as typography} from '../theme';
import type {DeviceComponent, Topology as TopologyData, Zone} from '../api/types';
import {componentIcon, componentStateLabel} from '../format';

/**
 * Draws the site's physical topology exactly as the service reports it
 * (GET /v1/sites/{id}/topology): equipment boxes with one-way arrows showing
 * which way the water travels. Nodes are laid out in dependency order, so a
 * branch renders as two boxes side by side instead of a guessed position.
 */

export type TopologyNode = {
  id: string;
  label: string;
  sub: string;
  icon: IconName;
  /** Highlighted when the component is open or running right now. */
  live: boolean;
};

function levelsOf(data: TopologyData): string[][] {
  const incoming = new Map<string, number>();
  const outgoing = new Map<string, string[]>();
  data.nodes.forEach(node => {
    incoming.set(node.id, 0);
    outgoing.set(node.id, []);
  });
  data.connections.forEach(connection => {
    if (!incoming.has(connection.to)) {
      incoming.set(connection.to, 0);
    }
    if (!outgoing.has(connection.from)) {
      outgoing.set(connection.from, []);
    }
    incoming.set(connection.to, (incoming.get(connection.to) ?? 0) + 1);
    outgoing.get(connection.from)!.push(connection.to);
  });

  const remaining = new Map(incoming);
  const levels: string[][] = [];
  let frontier = [...remaining.entries()].filter(([, count]) => count === 0).map(([id]) => id);
  const seen = new Set<string>();

  while (frontier.length > 0) {
    levels.push(frontier);
    frontier.forEach(id => seen.add(id));
    const next: string[] = [];
    frontier.forEach(id => {
      (outgoing.get(id) ?? []).forEach(target => {
        const count = (remaining.get(target) ?? 1) - 1;
        remaining.set(target, count);
        if (count === 0 && !seen.has(target) && !next.includes(target)) {
          next.push(target);
        }
      });
    });
    frontier = next;
  }

  // Anything left is part of a cycle the service reported; show it rather than drop it.
  const placed = new Set(levels.flat());
  const orphans = data.nodes.map(node => node.id).filter(id => !placed.has(id));
  if (orphans.length > 0) {
    levels.push(orphans);
  }
  return levels;
}

export function describeNode(
  id: string,
  components: DeviceComponent[],
  zones: Zone[],
): TopologyNode {
  const component = components.find(item => item.id === id);
  if (component) {
    return {
      id,
      label: component.name,
      sub: componentStateLabel(component),
      icon: componentIcon(component.kind),
      live: component.reported_state === 'OPEN' || component.reported_state === 'RUNNING',
    };
  }
  const zone = zones.find(item => item.id === id || item.id === `zone-${id}`);
  if (zone) {
    const isSource = /reservoir|tank|source/i.test(zone.name);
    return {
      id,
      label: zone.name,
      sub: isSource ? 'Water source' : 'Watered area',
      icon: isSource ? 'tank' : 'drop',
      live: false,
    };
  }
  const isSource = /reservoir|tank|source/i.test(id);
  return {
    id,
    label: id.replace(/-/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase()),
    sub: isSource ? 'Water source' : 'Part of the path',
    icon: isSource ? 'tank' : 'flow',
    live: false,
  };
}

export function TopologyView({
  data,
  components,
  zones,
  caption,
}: {
  data: TopologyData;
  components: DeviceComponent[];
  zones: Zone[];
  caption?: string;
}) {
  const levels = useMemo(() => levelsOf(data), [data]);

  return (
    <View style={styles.canvas}>
      {levels.map((level, index) => (
        <View key={`level-${index}`} style={styles.level}>
          {index > 0 ? (
            <View style={styles.arrowRow}>
              <View style={styles.pipe} />
              <Icon name="arrow" color={colors.green} size={20} />
              <View style={styles.pipe} />
            </View>
          ) : null}
          <View style={styles.nodeRow}>
            {level.map(id => {
              const node = describeNode(id, components, zones);
              return (
                <View
                  key={id}
                  style={[styles.node, node.live ? styles.nodeLive : null]}
                  accessibilityLabel={`${node.label}. ${node.sub}`}>
                  <Icon name={node.icon} color={node.live ? colors.blue : colors.green} size={26} />
                  <Text style={styles.nodeLabel} numberOfLines={1}>
                    {node.label}
                  </Text>
                  <Text style={styles.nodeSub} numberOfLines={1}>
                    {node.sub}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      ))}
      {caption ? <Text style={styles.caption}>{caption}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.hero,
    padding: spacing.inner,
    gap: 4,
  },
  level: {gap: 4},
  arrowRow: {alignItems: 'center', gap: 2, paddingVertical: 2},
  pipe: {width: 2, height: 12, backgroundColor: colors.line},
  nodeRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center'},
  node: {
    flexGrow: 1,
    flexBasis: '44%',
    minHeight: 88,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.green,
    borderRadius: radius.card,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  nodeLive: {borderColor: colors.blue, backgroundColor: colors.blueBg},
  nodeLabel: {fontSize: 14, fontWeight: '700', color: colors.ink},
  nodeSub: {fontSize: 12, color: colors.muted},
  caption: {...typography.small, color: colors.muted, marginTop: 8},
});
