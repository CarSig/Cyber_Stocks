'use no memo';
import '@xyflow/react/dist/style.css';
import { useCallback } from 'react';
import { ReactFlow, Background, Controls, MiniMap, type NodeMouseHandler } from '@xyflow/react';
import type { Node, Edge } from '@xyflow/react';
import { GraphNodeComponent } from './GraphNodeComponent';
import type { GraphNode } from '../types';
import { CATEGORY_COLOR } from '../constants';

const nodeTypes = { graphPage: GraphNodeComponent };

type Props = {
  nodes: Node[];
  edges: Edge[];
  onNodeSelect: (node: GraphNode | null) => void;
};

export function GraphCanvas({ nodes, edges, onNodeSelect }: Props) {
  const handleNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      onNodeSelect(node.data as unknown as GraphNode);
    },
    [onNodeSelect],
  );

  const handlePaneClick = useCallback(() => {
    onNodeSelect(null);
  }, [onNodeSelect]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodeClick={handleNodeClick}
      onPaneClick={handlePaneClick}
      fitView
      fitViewOptions={{ padding: 0.15 }}
      minZoom={0.2}
      maxZoom={2}
      proOptions={{ hideAttribution: true }}
    >
      <Background color="var(--border, #3f3f46)" gap={24} size={1} />
      <Controls className="graph-controls" />
      <MiniMap
        className="graph-minimap"
        nodeColor={(n) => {
          const gn = n.data as unknown as GraphNode;
          return CATEGORY_COLOR[gn?.category] ?? '#888';
        }}
        maskColor="rgba(0,0,0,0.4)"
      />
    </ReactFlow>
  );
}
