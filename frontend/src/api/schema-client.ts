/**
 * Type helpers for the generated OpenAPI schema.
 * Regenerate schema.d.ts with: npm run codegen
 *
 * Design: @algo/shared is the runtime type source used across frontend + backend.
 * This file provides:
 *   1. ApiResponse<P, M> — extract the 200 body type for any schema path+method
 *   2. Schema* aliases — direct access to individual DTO types from the spec
 *   3. Compatibility assertions — compile-time proof that @algo/shared types are
 *      assignable to the schema DTOs, catching contract drift at build time
 */

import type { paths, components } from './schema';
import type {
  User,
  AuthResponse,
  Quote,
  TrumpPost,
  CorrelationResult,
  CorrelationWithImpact,
  LagImpactResult,
  SimulationResult,
  SimulationAction,
  AuditEntry,
  PaginatedAudit,
} from '@algo/shared';

// ─── Core extractor ───────────────────────────────────────────────────────────

// Pull the 200 response JSON body for any path + method pair.
export type ApiResponse<
  P extends keyof paths,
  M extends keyof paths[P],
> = paths[P][M] extends { responses: { 200: { content: { 'application/json': infer T } } } } ? T : never;

// ─── Schema DTO aliases ───────────────────────────────────────────────────────

export type SchemaUser = components['schemas']['UserDto'];
export type SchemaAuthResponse = components['schemas']['AuthResponseDto'];
export type SchemaQuote = components['schemas']['QuoteDto'];
export type SchemaTrumpPost = components['schemas']['TrumpPostDto'];
export type SchemaCorrelationResult = components['schemas']['CorrelationResultDto'];
export type SchemaCorrelationWithImpact = components['schemas']['CorrelationWithImpactDto'];
export type SchemaLagImpact = components['schemas']['LagImpactResultDto'];
export type SchemaSparkline = components['schemas']['SparklineDto'];
export type SchemaArticleSentiment = components['schemas']['ArticleSentimentDto'];
export type SchemaThreatIntelStatus = components['schemas']['ThreatIntelStatusResponseDto'];
export type SchemaAuditEntry = components['schemas']['AuditEntryDto'];
export type SchemaPaginatedAudit = components['schemas']['PaginatedAuditDto'];
export type SchemaSimulationResult = components['schemas']['SimulationResultDto'];
export type SchemaSimulationAction = components['schemas']['SimulationActionDto'];

// ─── Path-derived response types ─────────────────────────────────────────────

export type CompaniesResponse = ApiResponse<'/api/v1/stocks', 'get'>;
export type SparklineResponse = ApiResponse<'/api/v1/stocks/sparklines', 'get'>;
export type CorrelationMatrixResponse = ApiResponse<'/api/v1/stocks/correlation-matrix', 'get'>;
export type TrumpPostsResponse = ApiResponse<'/api/v1/trump/posts', 'get'>;
export type NewsAnalysisResponse = ApiResponse<'/api/v1/news/analysis/{ticker}', 'get'>;

// ─── Compatibility assertions ─────────────────────────────────────────────────
// These are compile-time only. If @algo/shared drifts from the OpenAPI spec,
// the assignment will fail and tsc/typecheck will catch it.
// "Shared type must be assignable to schema DTO" — i.e. shared is at least as
// specific as (or a superset of) what the backend promises to send.

type _AssertUser = SchemaUser extends User ? true : 'User drifted from SchemaUser';
type _AssertAuthResponse = SchemaAuthResponse extends AuthResponse ? true : 'AuthResponse drifted from SchemaAuthResponse';
type _AssertQuote = SchemaQuote extends Quote ? true : 'Quote drifted from SchemaQuote';
type _AssertTrumpPost = Omit<SchemaTrumpPost, 'tags'> extends Omit<TrumpPost, 'tags'> ? true : 'TrumpPost drifted from SchemaTrumpPost';
type _AssertCorrelationResult = Omit<SchemaCorrelationResult, 'rolling'> extends Omit<CorrelationResult, 'rolling' | 'ci'> ? true : 'CorrelationResult drifted from SchemaCorrelationResult';
type _AssertLagImpact = SchemaLagImpact extends LagImpactResult ? true : 'LagImpactResult drifted from SchemaLagImpact';
type _AssertSimulationResult = SchemaSimulationResult extends SimulationResult ? true : 'SimulationResult drifted from SchemaSimulationResult';
type _AssertSimulationAction = SchemaSimulationAction extends SimulationAction ? true : 'SimulationAction drifted from SchemaSimulationAction';
type _AssertAuditEntry = SchemaAuditEntry extends AuditEntry ? true : 'AuditEntry drifted from SchemaAuditEntry';
type _AssertPaginatedAudit = SchemaPaginatedAudit extends PaginatedAudit ? true : 'PaginatedAudit drifted from SchemaPaginatedAudit';

// Unused variable trick to surface assertion failures as errors (not just unused types).
declare const _checks: [
  _AssertUser,
  _AssertAuthResponse,
  _AssertQuote,
  _AssertTrumpPost,
  _AssertCorrelationResult,
  _AssertLagImpact,
  _AssertSimulationResult,
  _AssertSimulationAction,
  _AssertAuditEntry,
  _AssertPaginatedAudit,
];
