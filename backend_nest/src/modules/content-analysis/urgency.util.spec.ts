import { classifyUrgency } from "./urgency.util";

function hoursAgo(h: number): string {
  return new Date(Date.now() - h * 60 * 60 * 1000).toISOString();
}

function daysAgo(d: number): string {
  return new Date(Date.now() - d * 24 * 60 * 60 * 1000).toISOString();
}

describe("classifyUrgency", () => {
  describe("NOW keywords override time", () => {
    it.each(["breaking", "alert", "emergency", "just", "now", "today", "tonight", "live"])(
      'returns "now" when signal contains "%s"',
      (kw) => {
        expect(classifyUrgency(daysAgo(30), [kw])).toBe("now");
      },
    );

    it("matches keyword in companySignals too", () => {
      expect(classifyUrgency(daysAgo(30), [], ["breaking news"])).toBe("now");
    });
  });

  describe("PAST keywords", () => {
    it.each(["reported", "announced", "disclosed", "released", "posted", "filed", "completed", "finished", "ended", "breach", "compromised"])(
      'returns "past" when signal contains "%s"',
      (kw) => {
        expect(classifyUrgency(daysAgo(30), [kw])).toBe("past");
      },
    );

    it("NOW keywords take priority over PAST keywords", () => {
      expect(classifyUrgency(daysAgo(30), ["breaking", "reported"])).toBe("now");
    });
  });

  describe("FUTURE keywords", () => {
    it.each(["outlook", "forecast", "guidance", "upcoming", "scheduled", "projected", "expected", "planned", "will", "q1", "q2", "q3", "q4"])(
      'returns "future_short" for "%s" without long-term signals',
      (kw) => {
        expect(classifyUrgency(daysAgo(30), [kw])).toBe("future_short");
      },
    );

    it.each(["annual", "yearly", "year", "multi-year", "long-term", "5-year", "decade", "2025", "2026"])(
      'returns "future_long" when future + long-term keyword "%s" present',
      (kw) => {
        expect(classifyUrgency(daysAgo(30), ["outlook", kw])).toBe("future_long");
      },
    );
  });

  describe("time-based classification (no keyword signals)", () => {
    it('returns "now" when article is within the last 2 hours', () => {
      expect(classifyUrgency(hoursAgo(1))).toBe("now");
    });

    it('returns "today" when article is between 2 and 24 hours old', () => {
      expect(classifyUrgency(hoursAgo(3))).toBe("today");
      expect(classifyUrgency(hoursAgo(23))).toBe("today");
    });

    it('returns "recent" when article is between 1 and 7 days old', () => {
      expect(classifyUrgency(daysAgo(2))).toBe("recent");
      expect(classifyUrgency(daysAgo(6))).toBe("recent");
    });

    it('returns "recent" for articles older than 7 days (no keyword signals)', () => {
      expect(classifyUrgency(daysAgo(30))).toBe("recent");
    });
  });

  describe("signal case-insensitivity", () => {
    it("matches keywords regardless of case", () => {
      expect(classifyUrgency(daysAgo(30), ["BREAKING"])).toBe("now");
      expect(classifyUrgency(daysAgo(30), ["Reported"])).toBe("past");
    });
  });

  describe("edge cases", () => {
    it("handles empty signals gracefully", () => {
      expect(() => classifyUrgency(hoursAgo(1), [], [])).not.toThrow();
    });

    it("handles undefined-like missing signals (default params)", () => {
      expect(() => classifyUrgency(hoursAgo(1))).not.toThrow();
    });
  });
});
