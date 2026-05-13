export type EntityType = "company" | "region" | "sector";
export type EntityRole = "primary_subject" | "secondary_subject" | "competitor" | "mentioned";
export type NewsType = "company_specific" | "multi_entity" | "macro_global";

export type EntityMention = {
  entityId: string;
  name: string;
  type: EntityType;
  role: EntityRole;
  score: number;
  sentiment: number;
};

export type ArticleResponse = {
  id: string;
  entities: EntityMention[];
  newsType: NewsType;
  globalSignals: string[];
  companySignals: string[];
  embeddingId: string | null;
};

export type BackendArticleResponse = ArticleResponse & {
  link: string;
  publisher: string | null;
  ticker: string;
  timestamp: string;
  urgency?: string;
};

export type ProcessArticleInput = {
  id: string;
  title: string;
  content: string;
  timestamp: string;
};

export type BackendArticleInput = {
  id: string;
  uuid?: string;
  title: string;
  link: string;
  publisher?: string;
  ticker: string;
  timestamp: string;
};

export type EntitySummary = {
  entityId: string;
  articleCount: number;
  avgSentiment: number;
  positiveCount: number;
  negativeCount: number;
  neutralCount: number;
  dominantRole: string;
};

export type SignalCount = { signalType: string; count: number };
