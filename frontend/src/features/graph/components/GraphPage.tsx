import { useMemo, useState, useCallback } from 'react';
import { RAW_NODES, RAW_EDGES } from '../graphData';
import { applyDagreLayout } from '../layout';
import { GraphCanvas } from './GraphCanvas';
import { NodeDetailPanel } from './NodeDetailPanel';
import type { GraphNode } from '../types';
import '../graph.css';

// Build a map: nodeId → direct child IDs (parent-child edges only)
const CHILDREN_MAP = new Map<string, string[]>();
for (const edge of RAW_EDGES) {
  if (edge.type === 'parent-child') {
    const kids = CHILDREN_MAP.get(edge.source) ?? [];
    kids.push(edge.target);
    CHILDREN_MAP.set(edge.source, kids);
  }
}

// Nodes that have children — these can be collapsed
const PARENT_IDS = new Set(CHILDREN_MAP.keys());

// Initially collapse all parents
const INITIAL_COLLAPSED = new Set(PARENT_IDS);

function getHiddenIds(collapsedIds: Set<string>): Set<string> {
  const hidden = new Set<string>();
  // BFS: for each collapsed parent, hide all descendants
  for (const parentId of collapsedIds) {
    const queue = [...(CHILDREN_MAP.get(parentId) ?? [])];
    while (queue.length > 0) {
      const id = queue.shift()!;
      hidden.add(id);
      // If a child is also a parent, hide its subtree too (collapsed or not — it's already hidden)
      const grandchildren = CHILDREN_MAP.get(id);
      if (grandchildren) queue.push(...grandchildren);
    }
  }
  return hidden;
}

export function GraphPage() {
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(INITIAL_COLLAPSED);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

  const hiddenIds = useMemo(() => getHiddenIds(collapsedIds), [collapsedIds]);

  const { nodes, edges } = useMemo(() => applyDagreLayout(RAW_NODES, RAW_EDGES, hiddenIds), [hiddenIds]);

  const handleToggleCollapse = useCallback((nodeId: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  const handleNodeSelect = useCallback((node: GraphNode | null) => {
    setSelectedNode(node);
  }, []);

  // Augment node data with collapse metadata so GraphNodeComponent can render the indicator
  const augmentedNodes = useMemo(
    () =>
      nodes.map((n) => ({
        ...n,
        data: {
          ...(n.data as object),
          _isParent: PARENT_IDS.has(n.id),
          _collapsed: collapsedIds.has(n.id),
          _onToggle: PARENT_IDS.has(n.id) ? () => handleToggleCollapse(n.id) : undefined,
        },
      })),
    [nodes, collapsedIds, handleToggleCollapse],
  );

  return (
    <div className="graph-page">
      <div className="graph-legend">
        <span className="graph-legend-item graph-legend-root">Home</span>
        <span className="graph-legend-item graph-legend-hub">Hub</span>
        <span className="graph-legend-item graph-legend-leaf">Page</span>
        <span className="graph-legend-item graph-legend-auth">Auth</span>
        <span className="graph-legend-item graph-legend-admin">Admin</span>
        <span className="graph-legend-item graph-legend-dataflow">Data flow</span>
        <span className="graph-legend-hint">Click a hub node to expand/collapse children</span>
      </div>
      <div className="graph-canvas-wrapper">
        <GraphCanvas nodes={augmentedNodes} edges={edges} onNodeSelect={handleNodeSelect} />
        {selectedNode && <NodeDetailPanel node={selectedNode} onClose={() => setSelectedNode(null)} />}
      </div>
    </div>
  );
}
