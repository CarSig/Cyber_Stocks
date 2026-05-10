import { correlate, lagImpact } from "./correlationCore";
import type { Quote } from "../../../types/index";
import { NewsStrategy } from "./NewsStrategy";

const strategy = new NewsStrategy();

export const correlateNewsScores = (events: unknown[], quotes: Quote[], opts?: object) => correlate(events, quotes, opts ?? {}, strategy);
export const newsLagImpact       = (events: unknown[], quotes: Quote[], opts?: object) => lagImpact(events, quotes, opts ?? {}, strategy);
