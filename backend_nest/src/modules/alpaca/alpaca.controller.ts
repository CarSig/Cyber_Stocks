import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AlpacaService } from './alpaca.service';
import { GetBarsDoc } from './alpaca.docs';
import { AlpacaBarsQueryDto } from '@/shared/dto';

export type IntradayEvent = {
  rank: number;
  event: string;
  severity: number;
  ticker: string;
  peers: string[];
  trade_idea: string;
  source: string;
  source_date: string;
  source_time: string;
  source_link: string;
  first_time: string;
  first_date: string;
  first_link: string;
  notes: string;
  /** Chart day — next weekday if after-hours event, else first_date */
  chart_date: string;
  /** Marker time on chart (HH:MM ET) — '09:30' for after-hours events */
  chart_time: string;
  after_hours: boolean;
};

function nextWeekday(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00Z');
  do { d.setUTCDate(d.getUTCDate() + 1); } while (d.getUTCDay() === 0 || d.getUTCDay() === 6);
  return d.toISOString().slice(0, 10);
}

function parseMarkerTime(firstTime: string): string {
  const m = firstTime.match(/(\d{1,2}):(\d{2})/);
  if (!m) return '09:30';
  return `${String(m[1]).padStart(2, '0')}:${m[2]}`;
}

function extractHour(timeStr: string): number | null {
  const m = timeStr.match(/(\d{1,2}):\d{2}/);
  return m ? parseInt(m[1], 10) : null;
}

function isAfterHours(sourceTime: string, firstTime: string): boolean {
  if (
    /after market close/i.test(sourceTime) ||
    /after market close/i.test(firstTime) ||
    /after.hours/i.test(sourceTime)
  ) return true;
  // Treat any first_time at or after 16:00 as after-hours
  const h = extractHour(firstTime);
  return h !== null && h >= 16;
}

const RAW_EVENTS = [
  {
    rank: 1,
    event: 'Global CrowdStrike Falcon update outage — Windows BSOD',
    severity: 10,
    ticker: 'CRWD',
    peers: ['S', 'PANW', 'MSFT'],
    trade_idea: 'CRWD short / S or PANW long',
    source: 'Reuters',
    source_date: '2024-07-19',
    source_time: '11:30 EDT (CISA initial alert)',
    source_link: 'https://www.cisa.gov/news-events/alerts/2024/07/19/widespread-it-outage-due-crowdstrike-update',
    first_time: '04:09 UTC',
    first_date: '2024-07-19',
    first_link: 'https://www.crowdstrike.com/en-us/blog/falcon-content-update-preliminary-post-incident-report/',
    notes: 'Faulty content update deployed at 04:09 UTC; first public CISA alert at 11:30 EDT. CRWD -11%, S +8%, PANW +2% on close.',
  },
  {
    rank: 2,
    event: 'SentinelOne disappointing forecast — stock plunged ~29%',
    severity: 10,
    ticker: 'S',
    peers: ['CRWD', 'PANW'],
    trade_idea: 'S short / CRWD long',
    source: 'Reuters',
    source_date: '2024-06-02',
    source_time: 'After market close (US)',
    source_link: 'https://www.reuters.com',
    first_time: 'After market close',
    first_date: '2024-06-02',
    first_link: 'https://investors.sentinelone.com/financial-info/quarterly-results/default.aspx',
    notes: 'SentinelOne Q1 FY2025 earnings + guidance cut released after close; stock plunged ~29-33% in extended hours. Exact after-hours timestamp not publicly confirmed to the minute.',
  },
  {
    rank: 3,
    event: 'Okta support system breach disclosed — stock -12%',
    severity: 9,
    ticker: 'OKTA',
    peers: ['CYBR', 'MSFT'],
    trade_idea: 'OKTA short / CYBR long',
    source: 'Okta Security Blog / Reuters',
    source_date: '2023-10-20',
    source_time: '09:00 EDT (Okta blog published morning of Oct 20)',
    source_link: 'https://sec.okta.com/articles/2023/11/unauthorized-access-oktas-support-case-management-system-root-cause/',
    first_time: 'Breach occurred 2023-09-28; BeyondTrust first detected & reported to Okta on 2023-10-02',
    first_date: '2023-10-20',
    first_link: 'https://www.beyondtrust.com/blog/entry/okta-support-unit-breach-update',
    notes: 'Breach window: Sep 28 – Oct 17. BeyondTrust first flagged it on Oct 2. Okta publicly disclosed Oct 19-20. Stock fell ~12% on disclosure.',
  },
  {
    rank: 4,
    event: 'Okta Lapsus$ breach disclosed — worst single-day loss since 2018, -10.74%',
    severity: 9,
    ticker: 'OKTA',
    peers: ['CYBR', 'MSFT'],
    trade_idea: 'OKTA short / CYBR watch',
    source: 'Reuters / Lapsus$ Telegram',
    source_date: '2022-03-22',
    source_time: '03:30 UTC (Lapsus$ posted screenshots to Telegram)',
    source_link: 'https://www.sec.gov/Archives/edgar/data/0001660134/000119312522085134/d314542d8k.htm',
    first_time: '03:30 UTC',
    first_date: '2022-03-22',
    first_link: 'https://www.avertium.com/blog/okta-breached-by-lapsus',
    notes: 'Actual compromise was Jan 16-21, 2022. Lapsus$ posted screenshots on Telegram at ~03:30 UTC on Mar 22; independent researcher Bill Demirkapi also tweeted Mar 21. Okta confirmed at 05:00 UTC Mar 22. Stock -10.74%.',
  },
  {
    rank: 5,
    event: 'Palo Alto Networks billings forecast cut — sector-wide selloff, PANW -19% after-hours',
    severity: 9,
    ticker: 'PANW',
    peers: ['ZS', 'FTNT', 'CRWD', 'CHKP'],
    trade_idea: 'PANW short / sector filter active',
    source: 'CNBC / Reuters',
    source_date: '2024-02-20',
    source_time: 'After market close (earnings released evening of Feb 20)',
    source_link: 'https://www.cnbc.com/2024/02/20/palo-alto-networks-shares-plunge-after-company-cuts-billings-revenue-guidance.html',
    first_time: 'After market close',
    first_date: '2024-02-20',
    first_link: 'https://www.sec.gov/Archives/edgar/data/0001327567/000132756724000003/ex991q224earningsrelease.htm',
    notes: 'PANW Q2 FY2024 earnings: beat on top/bottom line but cut full-year billings guidance from $10.7-10.9B to $10.1-10.2B. Stock -19% extended. Selloff spread to ZS, FTNT, CRWD, CHKP next day.',
  },
  {
    rank: 6,
    event: 'Fortinet annual revenue forecast cut — FTNT -17% after-hours',
    severity: 9,
    ticker: 'FTNT',
    peers: ['PANW', 'CHKP'],
    trade_idea: 'FTNT short / PANW relative long',
    source: 'Reuters',
    source_date: '2023-08-03',
    source_time: 'After market close (Q2 2023 earnings release)',
    source_link: 'https://www.nasdaq.com/articles/fortinet-ftnt-q2-earnings-beat-expectations-sales-miss',
    first_time: 'After market close',
    first_date: '2023-08-03',
    first_link: 'https://investor.fortinet.com/quarterly-earnings',
    notes: 'Fortinet Q2 2023 earnings: EPS beat but revenue missed; company lowered full-year billings and revenue outlook. Stock fell >17% in extended trading, cited as signal of broader firewall/IT-spending weakness.',
  },
  {
    rank: 7,
    event: 'Datadog Q1 2026 forecast raised — stock +30-36%',
    severity: 9,
    ticker: 'DDOG',
    peers: ['DT', 'NET', 'SNOW'],
    trade_idea: 'DDOG long / software basket',
    source: 'Reuters / Seeking Alpha',
    source_date: '2026-05-07',
    source_time: 'After market close (May 7 2026)',
    source_link: 'https://seekingalpha.com/news/4588256-datadog-surges-20-after-q1-beat-raises-2026-outlook',
    first_time: '16:05 EDT',
    first_date: '2026-05-07',
    first_link: 'https://investors.datadoghq.com/news-releases/news-release-details/datadog-announces-first-quarter-2026-financial-results/',
    notes: 'DDOG Q1 2026: revenue $1.006B (+32% YoY), first $1B quarter; raised FY2026 guidance to $4.30-4.34B. Stock surged ~30% next session (May 8). SNOW +9%, MDB +11% in sympathy.',
  },
  {
    rank: 8,
    event: 'Delta Air Lines seeks CRWD compensation — CRWD -4% pre-market',
    severity: 8,
    ticker: 'CRWD',
    peers: ['S', 'PANW', 'MSFT'],
    trade_idea: 'CRWD short / Put',
    source: 'Reuters (citing CNBC report from Jul 29)',
    source_date: '2024-07-30',
    source_time: '06:53 EDT (Reuters article timestamp)',
    source_link: 'https://963jackfm.com/2024/07/30/crowdstrike-down-after-report-delta-air-to-seek-compensation-over-it-outage/',
    first_time: '22:00 EDT',
    first_date: '2024-07-29',
    first_link: 'https://www.cnbc.com/2024/10/25/delta-suit-against-crowdstrike-after-it-outage-caused-cancellations.html',
    notes: 'CNBC first reported Delta hired law firm Boies Schiller on evening of Jul 29. Reuters picked it up the morning of Jul 30 at 06:53 EDT. CRWD fell >4% pre-market on Jul 30.',
  },
  {
    rank: 9,
    event: 'CrowdStrike FY2024 earnings beat + strong guidance — CRWD +25%, sector rally',
    severity: 8,
    ticker: 'CRWD',
    peers: ['S', 'PANW', 'FTNT', 'ZS'],
    trade_idea: 'CRWD long / Cyber basket long',
    source: 'CNBC / Reuters',
    source_date: '2024-03-05',
    source_time: '17:00 ET (earnings call start; press release after close Mar 5)',
    source_link: 'https://ir.crowdstrike.com/news-releases/news-release-details/crowdstrike-reports-fourth-quarter-and-fiscal-year-2024',
    first_time: '17:00 ET',
    first_date: '2024-03-05',
    first_link: 'https://www.cnbc.com/2024/03/05/crowdstrike-shares-pop-on-earnings-beat-strong-full-year-guidance.html',
    notes: 'CRWD Q4 FY2024: EPS $0.95 vs $0.82 est; revenue $845M vs $839M est. Stock surged ~21% after-hours, closed +25% next day. S +6.9%, PANW/FTNT/ZS all >2% in sympathy.',
  },
  {
    rank: 10,
    event: 'PANW–CyberArk acquisition talks leaked — CYBR +13%, PANW -8%',
    severity: 8,
    ticker: 'CYBR / PANW',
    peers: ['OKTA', 'ZS'],
    trade_idea: 'CYBR long / PANW short (arb)',
    source: 'Reuters / CNBC (citing WSJ scoop)',
    source_date: '2025-07-29',
    source_time: '12:48 EDT (CNBC published, citing WSJ)',
    source_link: 'https://www.cnbc.com/2025/07/29/cyberark-shares-jump-on-report-of-palo-alto-networks-takeover-talks.html',
    first_time: '12:34 EDT',
    first_date: '2025-07-29',
    first_link: 'https://seekingalpha.com/news/4473578-cyberark-jumps-on-report-palo-alto-in-talks-to-acquire',
    notes: 'WSJ broke the story intraday Jul 29; deal confirmed Jul 30 at ~$25B. CYBR +13% on Jul 29, then -2.2% on Jul 30 after deal confirmed. PANW -8% on deal announcement Jul 30.',
  },
] as const;

const INTRADAY_EVENTS: IntradayEvent[] = RAW_EVENTS.map((e) => {
  const ah = isAfterHours(e.source_time, e.first_time);
  return {
    ...e,
    peers: [...e.peers],
    after_hours: ah,
    chart_date: ah ? nextWeekday(e.first_date) : e.first_date,
    chart_time: ah ? '09:30' : parseMarkerTime(e.first_time),
  };
});

@ApiTags('Alpaca')
@ApiBearerAuth('bearer')
@Controller('alpaca')
export class AlpacaController {
  constructor(private readonly alpacaService: AlpacaService) {}

  @Get('bars/:ticker')
  @GetBarsDoc()
  async getBars(
    @Param('ticker') ticker: string,
    @Query() { date, timeframe = '1Min' }: AlpacaBarsQueryDto,
  ) {
    return this.alpacaService.getBars(ticker.toUpperCase(), date, timeframe);
  }

  @Get('events')
  @ApiOperation({ summary: 'List market events for intraday simulation' })
  getEvents(): IntradayEvent[] {
    return INTRADAY_EVENTS;
  }
}
