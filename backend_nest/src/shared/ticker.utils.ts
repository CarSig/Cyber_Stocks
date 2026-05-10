import companies from "@/data/companies";
import { AppError } from "./errors";

export const tickerToName: Record<string, string> = Object.fromEntries(
  Object.entries(companies).map(([name, ticker]) => [ticker, name])
);

export function resolveTicker(ticker: string): { ticker: string; name: string } {
  const upper = ticker.toUpperCase();
  const name = tickerToName[upper];
  if (!name) throw new AppError(`Unknown ticker: ${upper}`, 404);
  return { ticker: upper, name };
}
