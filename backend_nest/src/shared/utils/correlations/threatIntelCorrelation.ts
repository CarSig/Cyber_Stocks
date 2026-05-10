import { correlate, lagImpact } from "./correlationCore";
import type { Quote } from "../../../types/index";
import { ThreatIntelStrategy } from "./ThreatIntelStrategy";

const strategy = new ThreatIntelStrategy();

export const correlateThreatIntel = (dates: string[], quotes: Quote[], opts?: object) => correlate(dates, quotes, opts ?? {}, strategy);
export const threatIntelLagImpact = (dates: string[], quotes: Quote[], opts?: object) => lagImpact(dates, quotes, opts ?? {}, strategy);
