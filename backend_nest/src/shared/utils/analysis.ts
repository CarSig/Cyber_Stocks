import type { Quote, History } from "../../types/index";

type ParsedQuote = { open: number; close: number; date: string }

function percentageDiff(a: number, b: number): string {
  return (((b - a) / a) * 100).toFixed(2) + "%";
}

function biggestDifferenceSameDayOpenClose(quotes: ParsedQuote[]): ParsedQuote & { difference: string } {
  const result = quotes.reduce((biggest, current) => {
    const diff = Math.abs(current.open - current.close);
    return diff > Math.abs(biggest.open - biggest.close) ? current : biggest;
  });
  return { ...result, difference: percentageDiff(result.open, result.close) };
}

function biggestDifferenceNextDayClose(quotes: ParsedQuote[]): [ParsedQuote, ParsedQuote] {
  const result = quotes.reduce(
    (biggest, _current, i) => {
      if (i === quotes.length - 1) return biggest;
      const diff = Math.abs(quotes[i + 1].close - quotes[i].close);
      const biggestDiff = Math.abs(quotes[biggest.index + 1].close - quotes[biggest.index].close);
      return diff > biggestDiff ? { index: i } : biggest;
    },
    { index: 0 },
  );
  return [quotes[result.index], quotes[result.index + 1]];
}

export function compareHistories(history1: History, name1: string, history2: History, name2: string, delayDays = 0) {
  const q1 = history1.quotes;
  const q2 = history2.quotes;
  const result: { name1: string; price1: number; name2: string; price2: number; difference: string }[] = [];
  for (let i = 0; i < q1.length; i++) {
    const j = i + delayDays;
    if (j < 0 || j >= q2.length) continue;
    const price1 = q1[i].close;
    const price2 = q2[j].close;
    result.push({ name1, price1, name2, price2, difference: percentageDiff(price1, price2) });
  }
  return result;
}

export function analyzeHistory(history: { quotes: Quote[] }) {
  const parsed: ParsedQuote[] = history.quotes.map((x) => ({
    open:  x.open,
    close: x.close,
    date:  typeof x.date === "string" ? x.date : (x.date as Date).toISOString(),
  }));
  const biggestSameDayDiff = biggestDifferenceSameDayOpenClose(parsed);
  const biggestNextDayDiff = biggestDifferenceNextDayClose(parsed);
  return { biggestNextDayDiff, biggestSameDayDiff };
}
