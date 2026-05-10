import { correlate, lagImpact } from "./correlationCore";
import type { Quote } from "../../../types/index";
import { TrumpStrategy } from "./TrumpStrategy";

const strategy = new TrumpStrategy();

export const correlateTrump    = (posts: unknown[], quotes: Quote[], opts?: object) => correlate(posts, quotes, opts ?? {}, strategy);
export const trumpLagImpact    = (posts: unknown[], quotes: Quote[], opts?: object) => lagImpact(posts, quotes, opts ?? {}, strategy);
