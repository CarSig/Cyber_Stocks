/**
 * Type helpers for the generated OpenAPI schema.
 *
 * Usage after running `npm run codegen`:
 *
 *   import type { ApiResponse } from './schema-client';
 *   type StockData = ApiResponse<'/stocks/{ticker}', 'get'>;
 *
 * This file itself has no runtime code — it only re-exports schema utilities.
 * The generated schema lives in ./schema.d.ts (gitignored, rebuilt via codegen).
 */

// Once schema.d.ts is generated, import path components like this:
// import type { paths, components } from './schema';
//
// Convenience extractor — pull the 200 response body type for any path+method:
// export type ApiResponse<
//   P extends keyof paths,
//   M extends keyof paths[P],
// > = paths[P][M] extends { responses: { 200: { content: { 'application/json': infer T } } } } ? T : never;
//
// Until the first codegen run, @algo/shared types serve as the source of truth.
// After codegen, you can gradually migrate API functions to use schema-derived types.
export {};
