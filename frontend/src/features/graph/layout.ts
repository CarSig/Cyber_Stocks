import dagre from '@dagrejs/dagre';
import type { Node, Edge } from '@xyflow/react';
import type { GraphNode, GraphEdge } from './types';
import { NODE_WIDTH, NODE_HEIGHT } from './constants';

export function applyDagreLayout(
  rawNodes: GraphNode[],
  rawEdges: GraphEdge[],
  hiddenIds: Set<string>,
): { nodes: Node[]; edges: Edge[] } {
  const visibleNodes = rawNodes.filter((n) => !hiddenIds.has(n.id));
  const visibleIds = new Set(visibleNodes.map((n) => n.id));

  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'TB', nodesep: 24, ranksep: 120, marginx: 40, marginy: 40 });

  for (const n of visibleNodes) {
    g.setNode(n.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }

  for (const e of rawEdges) {
    if (e.type === 'parent-child' && visibleIds.has(e.source) && visibleIds.has(e.target)) {
      g.setEdge(e.source, e.target);
    }
  }

  dagre.layout(g);

  const nodes: Node[] = visibleNodes.map((raw) => {
    const pos = g.node(raw.id);
    return {
      id: raw.id,
      type: 'graphPage',
      position: { x: pos.x - NODE_WIDTH / 2, y: pos.y - NODE_HEIGHT / 2 },
      data: raw,
    };
  });

  const edges: Edge[] = rawEdges
    .filter((e) => visibleIds.has(e.source) && visibleIds.has(e.target))
    .map((raw) => ({
      id: raw.id,
      source: raw.source,
      target: raw.target,
      type: 'smoothstep',
      animated: raw.type === 'data-flow',
      style:
        raw.type === 'data-flow'
          ? { stroke: 'var(--color-amber, #f59e0b)', strokeDasharray: '6 3', strokeWidth: 1.5 }
          : { stroke: 'var(--border, #3f3f46)', strokeWidth: 1.5 },
    }));

  return { nodes, edges };
}
