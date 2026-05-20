import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { GraphNode } from '../types';
import { DATA_FLOW_LABELS, CATEGORY_COLOR } from '../constants';

type Props = {
  node: GraphNode;
  onClose: () => void;
};

const AUTH_LABEL: Record<string, string> = {
  public: 'Public',
  protected: 'Protected',
  admin: 'Admin only',
};

export function NodeDetailPanel({ node, onClose }: Props) {
  return (
    <div className="graph-detail-panel">
      <div className="graph-detail-header">
        <div className="graph-detail-title-row">
          <span className="graph-detail-accent" style={{ background: CATEGORY_COLOR[node.category] }} />
          <h2 className="graph-detail-title">{node.label}</h2>
          <button className="graph-detail-close" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <div className="graph-detail-badges">
          <Badge variant="outline" className="graph-badge-route">
            {node.route}
          </Badge>
          <Badge variant="secondary">{AUTH_LABEL[node.auth]}</Badge>
        </div>
      </div>

      <p className="graph-detail-desc">{node.description}</p>

      {node.apis.length > 0 && (
        <>
          <Separator className="graph-detail-sep" />
          <section className="graph-detail-section">
            <h3 className="graph-detail-section-title">API Endpoints</h3>
            <ul className="graph-detail-list">
              {node.apis.map((api) => (
                <li key={api} className="graph-detail-api">
                  {api}
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

      {node.features.length > 0 && (
        <>
          <Separator className="graph-detail-sep" />
          <section className="graph-detail-section">
            <h3 className="graph-detail-section-title">Features</h3>
            <div className="graph-detail-tags">
              {node.features.map((f) => (
                <Badge key={f} variant="outline">
                  {f}
                </Badge>
              ))}
            </div>
          </section>
        </>
      )}

      {node.dataFlows.length > 0 && (
        <>
          <Separator className="graph-detail-sep" />
          <section className="graph-detail-section">
            <h3 className="graph-detail-section-title">Data Flows</h3>
            <ul className="graph-detail-list">
              {node.dataFlows.map((df) => (
                <li key={df} className="graph-detail-flow">
                  {DATA_FLOW_LABELS[df] ?? df}
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
