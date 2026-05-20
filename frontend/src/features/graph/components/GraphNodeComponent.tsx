import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import type { GraphNode } from '../types';
import { CATEGORY_COLOR, NODE_WIDTH, NODE_HEIGHT } from '../constants';

type AugmentedData = GraphNode & {
  _isParent?: boolean;
  _collapsed?: boolean;
  _onToggle?: () => void;
};

export const GraphNodeComponent = memo(function GraphNodeComponent({ data, selected }: NodeProps) {
  const node = data as unknown as AugmentedData;
  const accentColor = CATEGORY_COLOR[node.category];

  return (
    <div
      className="graph-node"
      style={{
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        boxShadow: selected ? '0 0 0 2px var(--ring, #a855f7)' : undefined,
        borderLeft: `3px solid ${accentColor}`,
      }}
    >
      <Handle type="target" position={Position.Top} className="graph-node-handle" />

      <div className="graph-node-body">
        <div className="graph-node-text">
          <div className="graph-node-label">{node.label}</div>
          <div className="graph-node-route">{node.route}</div>
        </div>
        {node._isParent && (
          <button
            className="graph-node-toggle"
            onClick={(e) => {
              e.stopPropagation();
              node._onToggle?.();
            }}
            aria-label={node._collapsed ? 'Expand children' : 'Collapse children'}
            title={node._collapsed ? 'Expand' : 'Collapse'}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              style={{ transform: node._collapsed ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
            >
              <path
                d="M2 4l4 4 4-4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="graph-node-handle" />
    </div>
  );
});
