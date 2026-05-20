export type NodeCategory = 'root' | 'hub' | 'leaf' | 'auth' | 'admin';

export type AuthRequirement = 'public' | 'protected' | 'admin';

export type DataFlowRef =
  | 'stock-price-sync'
  | 'news-analysis-pipeline'
  | 'stock-to-stock-correlation'
  | 'trump-correlation'
  | 'threat-intel-correlation'
  | 'market-research-stream'
  | 'chat'
  | 'news-intelligence';

export type GraphNode = {
  id: string;
  label: string;
  route: string;
  category: NodeCategory;
  auth: AuthRequirement;
  description: string;
  apis: string[];
  features: string[];
  dataFlows: DataFlowRef[];
};

export type EdgeType = 'parent-child' | 'data-flow';

export type GraphEdge = {
  id: string;
  source: string;
  target: string;
  type: EdgeType;
};
