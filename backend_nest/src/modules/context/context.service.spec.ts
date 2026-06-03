import { readFile } from "node:fs/promises";
import { ContextService } from "./context.service";

jest.mock("node:fs/promises", () => ({ readFile: jest.fn() }));
const mockedReadFile = readFile as jest.MockedFunction<typeof readFile>;

const MARKET = { layer: "market", key: "MARKET", current: "Risk-on", events: [] };
const SECTOR = { layer: "industry", key: "cybersecurity", current: "Sector strong", events: [] };
const COMPANY = { layer: "company", key: "CRWD", current: "Recovering", events: [] };
const PREDICTION = { key: "CRWD", current: "Upside", events: [] };

function mockFiles(opts: { seeded: boolean }) {
  mockedReadFile.mockImplementation(((p: unknown) => {
    const path = String(p);
    if (path.includes("market.json")) return Promise.resolve(JSON.stringify(MARKET));
    if (path.includes("sectors.json"))
      return Promise.resolve(JSON.stringify(opts.seeded ? { cybersecurity: SECTOR } : {}));
    if (path.includes("companies.json"))
      return Promise.resolve(
        JSON.stringify(opts.seeded ? { CRWD: { company: COMPANY, prediction: PREDICTION } } : {}),
      );
    if (path.includes("ticker-sector.json"))
      return Promise.resolve(JSON.stringify(opts.seeded ? { CRWD: "cybersecurity" } : {}));
    return Promise.reject(new Error("not found"));
  }) as typeof readFile);
}

describe("ContextService.getContext", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns all three layers + prediction for a seeded ticker", async () => {
    mockFiles({ seeded: true });
    const ctx = await new ContextService().getContext("crwd");
    expect(ctx.ticker).toBe("CRWD");
    expect(ctx.market.current).toBe("Risk-on");
    expect(ctx.industry.key).toBe("cybersecurity");
    expect(ctx.company.current).toBe("Recovering");
    expect(ctx.prediction.current).toBe("Upside");
  });

  it("returns valid empty industry/company/prediction for an unseeded ticker (no throw), keeping market", async () => {
    mockFiles({ seeded: false });
    const ctx = await new ContextService().getContext("ZZZZ");
    expect(ctx.market.current).toBe("Risk-on"); // market always present
    expect(ctx.industry.events).toEqual([]);
    expect(ctx.company.current).toBe("No data");
    expect(ctx.prediction.events).toEqual([]);
  });

  it("degrades to empty data when files are unreadable", async () => {
    mockedReadFile.mockRejectedValue(new Error("ENOENT"));
    const ctx = await new ContextService().getContext("CRWD");
    expect(ctx.market).toEqual({ layer: "market", key: "MARKET", current: "No data", events: [] });
    expect(ctx.company.current).toBe("No data");
  });
});
