import { Injectable } from "@nestjs/common";
import { AppError } from "@/shared/errors";

type Bar = {
  t: string;   // ISO timestamp
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
  vw: number;
};

type BarsResponse = {
  bars: Bar[];
  symbol: string;
};

@Injectable()
export class AlpacaService {
  private readonly dataBase = "https://data.alpaca.markets/v2";
  private readonly headers = {
    "APCA-API-KEY-ID": process.env.ALPACA_API_KEY ?? "",
    "APCA-API-SECRET-KEY": process.env.ALPACA_SECRET_KEY ?? "",
  };

  private readonly validTimeframes = new Set(["1Min", "5Min", "15Min", "30Min", "1Hour"]);

  async getBars(ticker: string, date: string, timeframe = "1Min"): Promise<BarsResponse> {
    if (!this.validTimeframes.has(timeframe)) throw new AppError(`Invalid timeframe: ${timeframe}`, 400);

    const start = `${date}T00:00:00Z`;
    const end   = `${date}T23:59:59Z`;

    const url = new URL(`${this.dataBase}/stocks/${encodeURIComponent(ticker)}/bars`);
    url.searchParams.set("timeframe", timeframe);
    url.searchParams.set("start", start);
    url.searchParams.set("end", end);
    url.searchParams.set("limit", "1000");
    url.searchParams.set("feed", "iex");
    url.searchParams.set("adjustment", "raw");

    const bars: Bar[] = [];
    let nextPageToken: string | null = null;

    do {
      if (nextPageToken) url.searchParams.set("page_token", nextPageToken);
      else url.searchParams.delete("page_token");

      const res = await fetch(url.toString(), { headers: this.headers });

      if (res.status === 422) throw new AppError(`No market data for ${ticker} on ${date}`, 404);
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as Record<string, string>;
        throw new AppError(body.message ?? `Alpaca error ${res.status}`, 502);
      }

      const data = await res.json() as { bars: Bar[] | null; next_page_token: string | null };
      if (data.bars) bars.push(...data.bars);
      nextPageToken = data.next_page_token ?? null;
    } while (nextPageToken);

    return { bars, symbol: ticker.toUpperCase() };
  }
}
