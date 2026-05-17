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
  do {
    d.setUTCDate(d.getUTCDate() + 1);
  } while (d.getUTCDay() === 0 || d.getUTCDay() === 6);
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
  )
    return true;
  // Treat any first_time at or after 16:00 as after-hours
  const h = extractHour(firstTime);
  return h !== null && h >= 16;
}

// const RAW_EVENTS = [
//   {
//     rank: 1,
//     event: 'Global CrowdStrike Falcon update outage — Windows BSOD',
//     severity: 10,
//     ticker: 'CRWD',
//     peers: ['S', 'PANW', 'MSFT'],
//     trade_idea: 'CRWD short / S or PANW long',
//     source: 'Reuters',
//     source_date: '2024-07-19',
//     source_time: '11:30 EDT (CISA initial alert)',
//     source_link: 'https://www.cisa.gov/news-events/alerts/2024/07/19/widespread-it-outage-due-crowdstrike-update',
//     first_time: '04:09 UTC',
//     first_date: '2024-07-19',
//     first_link: 'https://www.crowdstrike.com/en-us/blog/falcon-content-update-preliminary-post-incident-report/',
//     notes: 'Faulty content update deployed at 04:09 UTC; first public CISA alert at 11:30 EDT. CRWD -11%, S +8%, PANW +2% on close.',
//   },
//   {
//     rank: 2,
//     event: 'SentinelOne disappointing forecast — stock plunged ~29%',
//     severity: 10,
//     ticker: 'S',
//     peers: ['CRWD', 'PANW'],
//     trade_idea: 'S short / CRWD long',
//     source: 'Reuters',
//     source_date: '2024-06-02',
//     source_time: 'After market close (US)',
//     source_link: 'https://www.reuters.com',
//     first_time: 'After market close',
//     first_date: '2024-06-02',
//     first_link: 'https://investors.sentinelone.com/financial-info/quarterly-results/default.aspx',
//     notes: 'SentinelOne Q1 FY2025 earnings + guidance cut released after close; stock plunged ~29-33% in extended hours. Exact after-hours timestamp not publicly confirmed to the minute.',
//   },
//   {
//     rank: 3,
//     event: 'Okta support system breach disclosed — stock -12%',
//     severity: 9,
//     ticker: 'OKTA',
//     peers: ['CYBR', 'MSFT'],
//     trade_idea: 'OKTA short / CYBR long',
//     source: 'Okta Security Blog / Reuters',
//     source_date: '2023-10-20',
//     source_time: '09:00 EDT (Okta blog published morning of Oct 20)',
//     source_link: 'https://sec.okta.com/articles/2023/11/unauthorized-access-oktas-support-case-management-system-root-cause/',
//     first_time: 'Breach occurred 2023-09-28; BeyondTrust first detected & reported to Okta on 2023-10-02',
//     first_date: '2023-10-20',
//     first_link: 'https://www.beyondtrust.com/blog/entry/okta-support-unit-breach-update',
//     notes: 'Breach window: Sep 28 – Oct 17. BeyondTrust first flagged it on Oct 2. Okta publicly disclosed Oct 19-20. Stock fell ~12% on disclosure.',
//   },
//   {
//     rank: 4,
//     event: 'Okta Lapsus$ breach disclosed — worst single-day loss since 2018, -10.74%',
//     severity: 9,
//     ticker: 'OKTA',
//     peers: ['CYBR', 'MSFT'],
//     trade_idea: 'OKTA short / CYBR watch',
//     source: 'Reuters / Lapsus$ Telegram',
//     source_date: '2022-03-22',
//     source_time: '03:30 UTC (Lapsus$ posted screenshots to Telegram)',
//     source_link: 'https://www.sec.gov/Archives/edgar/data/0001660134/000119312522085134/d314542d8k.htm',
//     first_time: '03:30 UTC',
//     first_date: '2022-03-22',
//     first_link: 'https://www.avertium.com/blog/okta-breached-by-lapsus',
//     notes: 'Actual compromise was Jan 16-21, 2022. Lapsus$ posted screenshots on Telegram at ~03:30 UTC on Mar 22; independent researcher Bill Demirkapi also tweeted Mar 21. Okta confirmed at 05:00 UTC Mar 22. Stock -10.74%.',
//   },
//   {
//     rank: 5,
//     event: 'Palo Alto Networks billings forecast cut — sector-wide selloff, PANW -19% after-hours',
//     severity: 9,
//     ticker: 'PANW',
//     peers: ['ZS', 'FTNT', 'CRWD', 'CHKP'],
//     trade_idea: 'PANW short / sector filter active',
//     source: 'CNBC / Reuters',
//     source_date: '2024-02-20',
//     source_time: 'After market close (earnings released evening of Feb 20)',
//     source_link: 'https://www.cnbc.com/2024/02/20/palo-alto-networks-shares-plunge-after-company-cuts-billings-revenue-guidance.html',
//     first_time: 'After market close',
//     first_date: '2024-02-20',
//     first_link: 'https://www.sec.gov/Archives/edgar/data/0001327567/000132756724000003/ex991q224earningsrelease.htm',
//     notes: 'PANW Q2 FY2024 earnings: beat on top/bottom line but cut full-year billings guidance from $10.7-10.9B to $10.1-10.2B. Stock -19% extended. Selloff spread to ZS, FTNT, CRWD, CHKP next day.',
//   },
//   {
//     rank: 6,
//     event: 'Fortinet annual revenue forecast cut — FTNT -17% after-hours',
//     severity: 9,
//     ticker: 'FTNT',
//     peers: ['PANW', 'CHKP'],
//     trade_idea: 'FTNT short / PANW relative long',
//     source: 'Reuters',
//     source_date: '2023-08-03',
//     source_time: 'After market close (Q2 2023 earnings release)',
//     source_link: 'https://www.nasdaq.com/articles/fortinet-ftnt-q2-earnings-beat-expectations-sales-miss',
//     first_time: 'After market close',
//     first_date: '2023-08-03',
//     first_link: 'https://investor.fortinet.com/quarterly-earnings',
//     notes: 'Fortinet Q2 2023 earnings: EPS beat but revenue missed; company lowered full-year billings and revenue outlook. Stock fell >17% in extended trading, cited as signal of broader firewall/IT-spending weakness.',
//   },
//   {
//     rank: 7,
//     event: 'Datadog Q1 2026 forecast raised — stock +30-36%',
//     severity: 9,
//     ticker: 'DDOG',
//     peers: ['DT', 'NET', 'SNOW'],
//     trade_idea: 'DDOG long / software basket',
//     source: 'Reuters / Seeking Alpha',
//     source_date: '2026-05-07',
//     source_time: 'After market close (May 7 2026)',
//     source_link: 'https://seekingalpha.com/news/4588256-datadog-surges-20-after-q1-beat-raises-2026-outlook',
//     first_time: '16:05 EDT',
//     first_date: '2026-05-07',
//     first_link: 'https://investors.datadoghq.com/news-releases/news-release-details/datadog-announces-first-quarter-2026-financial-results/',
//     notes: 'DDOG Q1 2026: revenue $1.006B (+32% YoY), first $1B quarter; raised FY2026 guidance to $4.30-4.34B. Stock surged ~30% next session (May 8). SNOW +9%, MDB +11% in sympathy.',
//   },
//   {
//     rank: 8,
//     event: 'Delta Air Lines seeks CRWD compensation — CRWD -4% pre-market',
//     severity: 8,
//     ticker: 'CRWD',
//     peers: ['S', 'PANW', 'MSFT'],
//     trade_idea: 'CRWD short / Put',
//     source: 'Reuters (citing CNBC report from Jul 29)',
//     source_date: '2024-07-30',
//     source_time: '06:53 EDT (Reuters article timestamp)',
//     source_link: 'https://963jackfm.com/2024/07/30/crowdstrike-down-after-report-delta-air-to-seek-compensation-over-it-outage/',
//     first_time: '22:00 EDT',
//     first_date: '2024-07-29',
//     first_link: 'https://www.cnbc.com/2024/10/25/delta-suit-against-crowdstrike-after-it-outage-caused-cancellations.html',
//     notes: 'CNBC first reported Delta hired law firm Boies Schiller on evening of Jul 29. Reuters picked it up the morning of Jul 30 at 06:53 EDT. CRWD fell >4% pre-market on Jul 30.',
//   },
//   {
//     rank: 9,
//     event: 'CrowdStrike FY2024 earnings beat + strong guidance — CRWD +25%, sector rally',
//     severity: 8,
//     ticker: 'CRWD',
//     peers: ['S', 'PANW', 'FTNT', 'ZS'],
//     trade_idea: 'CRWD long / Cyber basket long',
//     source: 'CNBC / Reuters',
//     source_date: '2024-03-05',
//     source_time: '17:00 ET (earnings call start; press release after close Mar 5)',
//     source_link: 'https://ir.crowdstrike.com/news-releases/news-release-details/crowdstrike-reports-fourth-quarter-and-fiscal-year-2024',
//     first_time: '17:00 ET',
//     first_date: '2024-03-05',
//     first_link: 'https://www.cnbc.com/2024/03/05/crowdstrike-shares-pop-on-earnings-beat-strong-full-year-guidance.html',
//     notes: 'CRWD Q4 FY2024: EPS $0.95 vs $0.82 est; revenue $845M vs $839M est. Stock surged ~21% after-hours, closed +25% next day. S +6.9%, PANW/FTNT/ZS all >2% in sympathy.',
//   },
//   {
//     rank: 10,
//     event: 'PANW–CyberArk acquisition talks leaked — CYBR +13%, PANW -8%',
//     severity: 8,
//     ticker: 'CYBR / PANW',
//     peers: ['OKTA', 'ZS'],
//     trade_idea: 'CYBR long / PANW short (arb)',
//     source: 'Reuters / CNBC (citing WSJ scoop)',
//     source_date: '2025-07-29',
//     source_time: '12:48 EDT (CNBC published, citing WSJ)',
//     source_link: 'https://www.cnbc.com/2025/07/29/cyberark-shares-jump-on-report-of-palo-alto-networks-takeover-talks.html',
//     first_time: '12:34 EDT',
//     first_date: '2025-07-29',
//     first_link: 'https://seekingalpha.com/news/4473578-cyberark-jumps-on-report-palo-alto-in-talks-to-acquire',
//     notes: 'WSJ broke the story intraday Jul 29; deal confirmed Jul 30 at ~$25B. CYBR +13% on Jul 29, then -2.2% on Jul 30 after deal confirmed. PANW -8% on deal announcement Jul 30.',
//   },
// ] as const;
const RAW_EVENTS = [
  {
    rank: 1,
    event:
      'Global CrowdStrike Falcon update outage \u2014 8.5M Windows devices BSOD',
    severity: 10,
    ticker: 'CRWD',
    peers: ['S', 'PANW', 'MSFT'],
    trade_idea: 'CRWD short / S or PANW long',
    source: 'CrowdStrike / CISA / Reuters',
    source_link:
      'https://www.reuters.com/technology/global-cyber-outage-grounds-flights-hits-media-financial-telecoms-2024-07-19/?utm_source=chatgpt.com',
    source_date: '2024-07-19',
    source_time:
      '04:09 UTC (update deployed); reverted 05:27 UTC; CEO confirmed fix 09:45 UTC',
    first_date: '2024-07-19',
    first_time: '04:09 UTC',
    first_link:
      'https://www.crowdstrike.com/en-us/blog/falcon-content-update-preliminary-post-incident-report/',
    notes:
      'Channel File 291 deployed 04:09 UTC, reverted 05:27 UTC. 8.5M devices affected. CRWD -11%, S +8%, PANW +2%.',
  },
  {
    rank: 2,
    event: 'SentinelOne peer rotation after CRWD outage \u2014 S +8%',
    severity: 7,
    ticker: 'S',
    peers: ['CRWD', 'PANW'],
    trade_idea: 'S long against CRWD',
    source: 'Reuters',
    source_link:
      'https://www.reuters.com/technology/global-cyber-outage-grounds-flights-hits-media-financial-telecoms-2024-07-19/?utm_source=chatgpt.com',
    source_date: '2024-07-19',
    source_time: 'US session (rotation started at open 09:30 ET)',
    first_date: '2024-07-19',
    first_time: '04:09 UTC',
    first_link:
      'https://www.crowdstrike.com/en-us/blog/falcon-content-update-preliminary-post-incident-report/',
    notes:
      'Same root event as #1. S gained as endpoint customers evaluated alternatives.',
  },
  {
    rank: 3,
    event: 'PANW peer rotation after CRWD outage \u2014 PANW closes positive',
    severity: 6,
    ticker: 'PANW',
    peers: ['CRWD', 'S'],
    trade_idea: 'PANW long',
    source: 'Reuters',
    source_link:
      'https://www.reuters.com/markets/us/futures-fall-amid-tech-rout-traders-grapple-with-global-cyber-outage-2024-07-19/?utm_source=chatgpt.com',
    source_date: '2024-07-19',
    source_time: 'US session',
    first_date: '2024-07-19',
    first_time: '04:09 UTC',
    first_link:
      'https://www.crowdstrike.com/en-us/blog/falcon-content-update-preliminary-post-incident-report/',
    notes: 'Same root event as #1. Platform player seen as safer haven.',
  },
  {
    rank: 4,
    event:
      'Delta hires Boies Schiller to seek CRWD compensation \u2014 CRWD -5% pre-market',
    severity: 8,
    ticker: 'CRWD',
    peers: ['S', 'PANW', 'MSFT'],
    trade_idea: 'CRWD short / Put',
    source: 'Reuters (citing CNBC report from Jul 29)',
    source_link:
      'https://www.reuters.com/technology/crowdstrike-down-after-report-delta-air-seek-compensation-over-it-outage-2024-07-30/?utm_source=chatgpt.com',
    source_date: '2024-07-30',
    source_time: '06:53 ET (Reuters article)',
    first_date: '2024-07-29',
    first_time: 'Evening ET (CNBC first reported Monday Jul 29)',
    first_link:
      'https://finance.yahoo.com/news/delta-air-lines-seek-compensation-211908080.html',
    notes:
      'CNBC broke story Mon Jul 29 evening. Reuters published Tue Jul 30 at 06:53 ET. CRWD -5% pre-market. Delta later filed formal suit Oct 25, 2024.',
  },
  {
    rank: 5,
    event:
      'CRWD Q1 FY2026 earnings \u2014 outage fallout, DOJ/SEC subpoena disclosed',
    severity: 7,
    ticker: 'CRWD',
    peers: ['S', 'PANW'],
    trade_idea: 'CRWD short / gap recovery trade',
    source: 'CrowdStrike IR / Reuters',
    source_link:
      'https://www.reuters.com/business/crowdstrike-forecasts-second-quarter-revenue-below-estimates-2025-06-03/?utm_source=chatgpt.com',
    source_date: '2025-06-03',
    source_time: '17:00 ET (after close; earnings call at 17:00 ET)',
    first_date: '2025-06-03',
    first_time: '17:00 ET',
    first_link:
      'https://ir.crowdstrike.com/news-releases/news-release-details/crowdstrike-reports-first-quarter-fiscal-year-2026-financial/',
    notes:
      'Revenue $1.07B (+22% YoY). DOJ/SEC request for info on revenue recognition disclosed on call. Stock -5.7% after-hours.',
  },
  {
    rank: 6,
    event:
      'CRWD pre-market continuation \u2014 outage costs + DOJ/SEC inquiry overhang',
    severity: 7,
    ticker: 'CRWD',
    peers: ['S', 'PANW'],
    trade_idea: 'CRWD short or no trade after gap',
    source: 'Reuters',
    source_link:
      'https://www.reuters.com/business/crowdstrike-shares-drop-windows-outage-fallout-hits-forecast-2025-06-04/?utm_source=chatgpt.com',
    source_date: '2025-06-04',
    source_time: 'Pre-market',
    first_date: '2025-06-03',
    first_time: '17:00 ET',
    first_link:
      'https://ir.crowdstrike.com/news-releases/news-release-details/crowdstrike-reports-first-quarter-fiscal-year-2026-financial/',
    notes: 'Continuation of #5. CRWD fell 7% in pre-market Jun 4.',
  },
  {
    rank: 7,
    event: 'CRWD Q2 FY2026 \u2014 record ARR reacceleration, mixed GAAP result',
    severity: 6,
    ticker: 'CRWD',
    peers: ['S', 'PANW'],
    trade_idea: 'CRWD reversal check',
    source: 'CrowdStrike IR / Reuters',
    source_link:
      'https://www.reuters.com/business/crowdstrike-shares-slip-forecast-reflects-lingering-effects-tech-outage-2025-08-28/?utm_source=chatgpt.com',
    source_date: '2025-08-27',
    source_time: '16:10 ET (press release after close; earnings call 17:00 ET)',
    first_date: '2025-08-27',
    first_time: '16:10 ET',
    first_link:
      'https://ir.crowdstrike.com/news-releases/news-release-details/crowdstrike-reports-second-quarter-fiscal-year-2026-financial/',
    notes:
      'Revenue $1.17B (+21% YoY), record Q2 net new ARR $221M. GAAP net loss $77.7M (SBC). Stock +7.8% next day but -5% over month.',
  },
  {
    rank: 8,
    event: 'CRWD FY2024 Q4 \u2014 strong outlook rally, CRWD +25%, sector-wide',
    severity: 8,
    ticker: 'CRWD',
    peers: ['S', 'PANW', 'FTNT', 'ZS'],
    trade_idea: 'CRWD long / cyber basket long',
    source: 'CrowdStrike IR / CNBC',
    source_link:
      'https://www.reuters.com/technology/cybersecurity/crowdstrike-forecasts-upbeat-annual-results-resilient-cybersecurity-spend-2024-03-05/?utm_source=chatgpt.com',
    source_date: '2024-03-05',
    source_time: '17:00 ET (press release + earnings call after close)',
    first_date: '2024-03-05',
    first_time: '17:00 ET',
    first_link:
      'https://ir.crowdstrike.com/news-releases/news-release-details/crowdstrike-reports-fourth-quarter-and-fiscal-year-2024',
    notes:
      'EPS $0.95 vs $0.82 est; revenue $845M vs $839M est. Stock +21% AH, +25% on Mar 6. S +6.9%, PANW/FTNT >3%.',
  },
  {
    rank: 9,
    event: 'CRWD FY2024 Q2 \u2014 annual forecast raised, CRWD +7%',
    severity: 7,
    ticker: 'CRWD',
    peers: ['OKTA', 'S', 'PANW'],
    trade_idea: 'CRWD long / peer sympathy',
    source: 'CrowdStrike IR / Reuters',
    source_link:
      'https://www.reuters.com/technology/crowdstrike-lifts-forecast-annual-revenue-profit-resilient-cybersecurity-demand-2023-08-30/?utm_source=chatgpt.com',
    source_date: '2023-08-30',
    source_time: 'After close',
    first_date: '2023-08-30',
    first_time: 'After close',
    first_link:
      'https://ir.crowdstrike.com/financial-information/quarterly-results',
    notes:
      'Raised FY2024 revenue and earnings guidance. Resilient security spending narrative.',
  },
  {
    rank: 10,
    event: 'Okta better-than-expected Q2 FY2024 results \u2014 OKTA jumps',
    severity: 6,
    ticker: 'OKTA',
    peers: ['CYBR', 'MSFT'],
    trade_idea: 'OKTA long / CYBR watch',
    source: 'Okta IR / Reuters',
    source_link:
      'https://www.reuters.com/technology/cybersecurity-firms-crowdstrike-okta-shares-jump-after-better-than-expected-2023-08-31/?utm_source=chatgpt.com',
    source_date: '2023-08-30',
    source_time: 'After close',
    first_date: '2023-08-30',
    first_time: 'After close',
    first_link: 'https://investor.okta.com',
    notes:
      'OKTA and CRWD both reported strong results same evening. IAM demand robust.',
  },
  {
    rank: 11,
    event: 'Okta support system breach disclosed \u2014 OKTA -12%',
    severity: 9,
    ticker: 'OKTA',
    peers: ['CYBR', 'MSFT'],
    trade_idea: 'OKTA short / CYBR long',
    source: 'Okta Security Blog',
    source_link:
      'https://www.reuters.com/technology/software-firm-oktas-shares-slump-cyber-breach-2023-10-20/?utm_source=chatgpt.com',
    source_date: '2023-10-20',
    source_time: 'Morning ET',
    first_date: '2023-10-02',
    first_time: 'Business hours',
    first_link:
      'https://www.beyondtrust.com/blog/entry/okta-support-unit-breach-update',
    notes:
      'Breach window Sep 28 \u2013 Oct 17. BeyondTrust detected anomalous activity Oct 2 and reported to Okta same day. Public disclosure Oct 19-20. Stock -12%.',
  },
  {
    rank: 12,
    event:
      "Okta update: ALL support users' data compromised \u2014 second wave",
    severity: 8,
    ticker: 'OKTA',
    peers: ['CYBR', 'MSFT'],
    trade_idea: 'OKTA short / no trade if already gapped',
    source: 'Okta SEC 8-K filing',
    source_link:
      'https://www.reuters.com/technology/cybersecurity/okta-says-hackers-stole-data-all-customer-support-users-cyber-breach-2023-11-29/?utm_source=chatgpt.com',
    source_date: '2023-11-29',
    source_time: 'Business hours (simultaneous with Q3 FY2024 earnings)',
    first_date: '2023-11-29',
    first_time: 'Business hours',
    first_link:
      'https://www.sec.gov/Archives/edgar/data/0001660134/000166013423000065/okta-10312023_ex992.htm',
    notes:
      'Okta disclosed ALL customer support system users affected (not just 1%). Report contained names + emails of all users. 99.6% only name+email.',
  },
  {
    rank: 13,
    event: 'Okta Lapsus$ breach \u2014 worst day since 2018, OKTA -10.74%',
    severity: 9,
    ticker: 'OKTA',
    peers: ['CYBR', 'MSFT'],
    trade_idea: 'OKTA short / CYBR watch',
    source: 'Reuters / Lapsus$ Telegram',
    source_link:
      'https://www.reuters.com/technology/okta-says-up-366-customers-have-potentially-been-impacted-by-hacker-attack-2022-03-23/?utm_source=chatgpt.com',
    source_date: '2022-03-22',
    source_time: '05:00 UTC (Okta confirmed)',
    first_date: '2022-03-22',
    first_time: '03:30 UTC',
    first_link: 'https://www.avertium.com/blog/okta-breached-by-lapsus',
    notes:
      'Actual compromise Jan 16-21. Lapsus$ posted screenshots Telegram 03:30 UTC Mar 22. Bill Demirkapi tweeted Mar 21. Okta confirmed 05:00 UTC.',
  },
  {
    rank: 14,
    event:
      'PANW billings forecast cut \u2014 cybersecurity-wide selloff, PANW -19%',
    severity: 9,
    ticker: 'PANW',
    peers: ['ZS', 'FTNT', 'CRWD', 'CHKP'],
    trade_idea: 'PANW short / sector filter',
    source: 'PANW IR / CNBC',
    source_link:
      'https://www.reuters.com/technology/cybersecurity/palo-alto-networks-sparks-selloff-cybersecurity-stocks-with-forecast-cut-2024-02-21/?utm_source=chatgpt.com',
    source_date: '2024-02-20',
    source_time: 'After close (Q2 FY2024 earnings)',
    first_date: '2024-02-20',
    first_time: 'After close',
    first_link:
      'https://www.sec.gov/Archives/edgar/data/0001327567/000132756724000003/ex991q224earningsrelease.htm',
    notes:
      'Beat on top/bottom but cut FY billings from $10.7-10.9B to $10.1-10.2B. PANW -19% extended. ZS -6%, FTNT -4%.',
  },
  {
    rank: 15,
    event:
      'PANW Q2 FY2026 \u2014 profit forecast cut on deal costs \u2014 PANW -8%',
    severity: 7,
    ticker: 'PANW',
    peers: ['CYBR', 'ZS'],
    trade_idea: 'PANW short / CYBR read-through',
    source: 'CNBC / Reuters',
    source_link:
      'https://www.reuters.com/business/palo-alto-networks-cuts-annual-profit-forecast-deal-costs-bite-shares-fall-2026-02-17/?utm_source=chatgpt.com',
    source_date: '2026-02-17',
    source_time: 'After close',
    first_date: '2026-02-17',
    first_time: 'After close',
    first_link:
      'https://www.cnbc.com/2026/02/17/palo-alto-networks-panw-q2-2026-earnings.html',
    notes:
      'EPS $1.03 beat but FY26 adj EPS cut to $3.65-3.70 from $3.80-3.90. CyberArk+Chronosphere deal costs. Revenue $2.59B missed $2.63B est.',
  },
  {
    rank: 16,
    event: 'PANW\u2013CyberArk acquisition talks leaked \u2014 CYBR +13%',
    severity: 8,
    ticker: 'CYBR / PANW',
    peers: ['OKTA', 'ZS'],
    trade_idea: 'CYBR long / PANW short (arb)',
    source: 'WSJ (via Seeking Alpha / CNBC)',
    source_link:
      'https://www.reuters.com/business/palo-alto-networks-talks-buy-cyberark-deal-worth-over-20-billion-wsj-reports-2025-07-29/?utm_source=chatgpt.com',
    source_date: '2025-07-29',
    source_time: '12:48 ET (CNBC published)',
    first_date: '2025-07-29',
    first_time: '12:34 ET',
    first_link:
      'https://seekingalpha.com/news/4473578-cyberark-jumps-on-report-palo-alto-in-talks-to-acquire',
    notes:
      'WSJ broke story intraday. Seeking Alpha 12:34 ET, CNBC 12:48 ET. CYBR +13%. Deal confirmed Jul 30 at $25B.',
  },
  {
    rank: 17,
    event:
      'PANW confirms CyberArk acquisition for $25B \u2014 PANW -8%, CYBR -2.2%',
    severity: 8,
    ticker: 'PANW / CYBR',
    peers: ['OKTA', 'ZS'],
    trade_idea: 'PANW short / CYBR arb',
    source: 'PANW press release',
    source_link:
      'https://www.reuters.com/world/middle-east/palo-altos-25-billion-deal-cyberark-targets-rising-ai-driven-threats-2025-07-30/?utm_source=chatgpt.com',
    source_date: '2025-07-30',
    source_time: 'Pre-market',
    first_date: '2025-07-30',
    first_time: 'Pre-market',
    first_link:
      'https://www.paloaltonetworks.com/company/press/2025/palo-alto-networks-announces-agreement-to-acquire-cyberark--the-identity-security-leader',
    notes:
      '$45 cash + 2.2005 PANW shares per CYBR. PANW -8%, CYBR -2.2% (buy-rumor-sell-news after +13%).',
  },
  {
    rank: 18,
    event: 'PANW Q1 FY2026 + Chronosphere $3.35B acquisition \u2014 stock -3%',
    severity: 6,
    ticker: 'PANW',
    peers: ['DDOG', 'DT', 'CYBR'],
    trade_idea: 'No trade / PANW reversal check',
    source: 'PANW IR / PR Newswire',
    source_link:
      'https://www.reuters.com/business/palo-alto-buy-chronosphere-335-billion-2025-11-19/?utm_source=chatgpt.com',
    source_date: '2025-11-19',
    source_time: 'After close (earnings call 16:30 ET / 13:30 PT)',
    first_date: '2025-11-19',
    first_time: 'After close',
    first_link:
      'https://www.prnewswire.com/news-releases/palo-alto-networks-to-acquire-chronosphere-next-gen-observability-leader-for-the-ai-era-302620878.html',
    notes:
      'Q1 FY2026: revenue $2.5B (+16%), NGS ARR +29%. Chronosphere $3.35B deal announced same evening. Stock -3% \u2014 M&A fatigue.',
  },
  {
    rank: 19,
    event: 'Fortinet annual revenue forecast cut \u2014 FTNT -17% after-hours',
    severity: 9,
    ticker: 'FTNT',
    peers: ['PANW', 'CHKP'],
    trade_idea: 'FTNT short / PANW relative long',
    source: 'Fortinet IR / Reuters',
    source_link:
      'https://www.reuters.com/technology/fortinet-slashes-annual-revenue-forecast-shares-plummet-2023-08-03/?utm_source=chatgpt.com',
    source_date: '2023-08-03',
    source_time: 'After close (Q2 2023 earnings)',
    first_date: '2023-08-03',
    first_time: 'After close',
    first_link: 'https://investor.fortinet.com/quarterly-earnings',
    notes:
      'EPS beat but revenue missed + lowered FY billings/revenue outlook. Stock -17% AH. Firewall spending weakness signal.',
  },
  {
    rank: 20,
    event: 'Fortinet Q1 2026 massive beat \u2014 FTNT +22%, billings +31%',
    severity: 8,
    ticker: 'FTNT',
    peers: ['PANW', 'CHKP', 'ZS'],
    trade_idea: 'FTNT long / sector sympathy',
    source: 'Fortinet IR / Globe Newswire',
    source_link:
      'https://www.barrons.com/articles/fortinet-earnings-stock-price-1b2f27f0?utm_source=chatgpt.com',
    source_date: '2026-05-06',
    source_time: 'After close (press release evening May 6, 2026)',
    first_date: '2026-05-06',
    first_time: 'After close',
    first_link:
      'https://www.stocktitan.net/news/FTNT/fortinet-reports-strong-first-quarter-2026-financial-aiqf1lc64cd7.html',
    notes:
      'Non-GAAP EPS $0.82 vs $0.62 est; revenue $1.85B vs $1.73B est. Billings +31%. Stock surged 22% on May 7. Record FCF $1.01B.',
  },
  {
    rank: 21,
    event: 'Zscaler Q2 FY2024 \u2014 billings growth disappoints \u2014 ZS -7%',
    severity: 7,
    ticker: 'ZS',
    peers: ['PANW', 'NET'],
    trade_idea: 'ZS short / PANW relative long',
    source: 'Zscaler IR / SEC 8-K',
    source_link:
      'https://www.reuters.com/technology/zscaler-shares-fall-revenue-growth-pace-slows-2024-03-01/?utm_source=chatgpt.com',
    source_date: '2024-02-29',
    source_time: 'After close',
    first_date: '2024-02-29',
    first_time: 'After close',
    first_link:
      'https://www.sec.gov/Archives/edgar/data/0001713683/000171368324000036/zs-01312024_991.htm',
    notes:
      'Revenue +35% to $525M but billings growth 27% disappointed. Stock -7% on Mar 1.',
  },
  {
    rank: 22,
    event: 'Zscaler Q3 FY2024 \u2014 strong outlook + profit forecast raised',
    severity: 7,
    ticker: 'ZS',
    peers: ['PANW', 'NET'],
    trade_idea: 'ZS long / peer sympathy',
    source: 'Zscaler IR / Reuters',
    source_link:
      'https://www.reuters.com/technology/cybersecurity/zscaler-shares-soar-strong-cybersecurity-demand-powers-upbeat-q4-forecast-2024-05-30/?utm_source=chatgpt.com',
    source_date: '2024-05-30',
    source_time: 'After close',
    first_date: '2024-05-30',
    first_time: 'After close',
    first_link: 'https://ir.zscaler.com',
    notes:
      'Strong demand + higher profit guidance. Zero-trust spending robust.',
  },
  {
    rank: 23,
    event: 'Zscaler gloomy FY2025 forecast \u2014 ZS -18% pre-market',
    severity: 8,
    ticker: 'ZS',
    peers: ['PANW', 'NET'],
    trade_idea: 'ZS short / no trade if sector drag',
    source: 'Zscaler IR / Reuters',
    source_link:
      'https://www.reuters.com/technology/cybersecurity/cybersecurity-firm-zscalers-shares-fall-dour-annual-forecasts-2024-09-04/?utm_source=chatgpt.com',
    source_date: '2024-09-03',
    source_time: 'After close (Q4 FY2024 earnings)',
    first_date: '2024-09-03',
    first_time: 'After close',
    first_link: 'https://ir.zscaler.com',
    notes: 'Weaker billings outlook for FY2025. Stock -18% pre-market Sep 4.',
  },
  {
    rank: 24,
    event: 'SentinelOne Q1 FY2024 guidance cut \u2014 S plunged ~29%',
    severity: 10,
    ticker: 'S',
    peers: ['CRWD', 'PANW'],
    trade_idea: 'S short / CRWD long',
    source: 'SentinelOne IR',
    source_link:
      'https://www.reuters.com/technology/sentinelones-disappointing-forecast-slams-shares-2023-06-02/?utm_source=chatgpt.com',
    source_date: '2023-06-01',
    source_time: 'After close (shareholder letter dated Jun 1, 2023)',
    first_date: '2023-06-01',
    first_time: 'After close',
    first_link:
      'https://s28.q4cdn.com/399982429/files/doc_earnings/2024/q1/generic/Shareholder-Letter-Q1-FY24-FINAL-SentinelOne.pdf',
    notes:
      'Q1 FY2024 earnings + guidance cut. Stock plunged ~29% in June (Motley Fool). Macro + competition hit smaller player.',
  },
  {
    rank: 25,
    event: 'SentinelOne Q3 FY2024 strong forecast \u2014 S +14%',
    severity: 8,
    ticker: 'S',
    peers: ['CRWD', 'MSFT'],
    trade_idea: 'S long / CRWD relative short',
    source: 'SentinelOne IR / Reuters',
    source_link:
      'https://www.reuters.com/technology/cybersecurity/sentinelone-soars-emerging-cybersecurity-challenger-label-wall-st-2023-12-06/?utm_source=chatgpt.com',
    source_date: '2023-12-05',
    source_time: 'After close',
    first_date: '2023-12-05',
    first_time: 'After close',
    first_link:
      'https://investors.sentinelone.com/financial-info/quarterly-results/default.aspx',
    notes: 'Strong forecast. S +14% on Dec 6.',
  },
  {
    rank: 26,
    event: 'SentinelOne Q3 FY2025 revenue forecast disappoints \u2014 S -13%',
    severity: 8,
    ticker: 'S',
    peers: ['CRWD', 'PANW'],
    trade_idea: 'S short / CRWD long',
    source: 'Reuters / Investopedia / IBD',
    source_link:
      'https://www.reuters.com/technology/sentinelone-forecasts-annual-revenue-below-wall-street-estimates-2025-03-12/?utm_source=chatgpt.com',
    source_date: '2025-03-12',
    source_time: 'After close',
    first_date: '2025-03-12',
    first_time: 'After close',
    first_link:
      'https://money.usnews.com/investing/news/articles/2025-03-12/sentinelone-forecasts-annual-revenue-below-wall-street-estimates',
    notes: 'Dour revenue forecast. IBD reported -13.7% early trading Mar 13.',
  },
  {
    rank: 27,
    event: 'SentinelOne Q4 FY2025 revenue forecast cut \u2014 S -14% extended',
    severity: 8,
    ticker: 'S',
    peers: ['CRWD', 'PANW'],
    trade_idea: 'S short / no trade after gap',
    source: 'SentinelOne IR / Nasdaq-Zacks',
    source_link:
      'https://www.reuters.com/technology/sentinelone-cuts-annual-revenue-forecast-2025-05-28/?utm_source=chatgpt.com',
    source_date: '2025-05-28',
    source_time: 'After close',
    first_date: '2025-05-28',
    first_time: 'After close',
    first_link:
      'https://investors.sentinelone.com/financial-info/quarterly-results/default.aspx',
    notes: 'Cut FY revenue forecast. Stock fell ~14% extended trading.',
  },
  {
    rank: 28,
    event: 'SentinelOne Q2 FY2026 \u2014 forecast miss + CFO departure',
    severity: 7,
    ticker: 'S',
    peers: ['CRWD', 'PANW'],
    trade_idea: 'S short / reversal check',
    source: 'SentinelOne IR / Benzinga / TradingView',
    source_link:
      'https://www.reuters.com/business/sentinelone-forecasts-quarterly-revenue-below-estimates-cfo-step-down-2025-12-04/?utm_source=chatgpt.com',
    source_date: '2025-12-04',
    source_time: 'After close',
    first_date: '2025-12-04',
    first_time: 'After close',
    first_link:
      'https://investors.sentinelone.com/financial-info/quarterly-results/default.aspx',
    notes: '$271M guidance vs $273.1M expected. CFO departure announced.',
  },
  {
    rank: 29,
    event:
      'SentinelOne Q4 FY2026 \u2014 profit forecast below expectations \u2014 S -2% AH',
    severity: 6,
    ticker: 'S',
    peers: ['CRWD', 'PANW', 'MSFT'],
    trade_idea: 'S short small / no trade',
    source: 'SentinelOne IR / Reuters',
    source_link:
      'https://www.reuters.com/business/sentinelones-quarterly-profit-forecast-falls-short-estimates-amid-stiff-2026-03-12/?utm_source=chatgpt.com',
    source_date: '2026-03-12',
    source_time: 'After close',
    first_date: '2026-03-12',
    first_time: 'After close',
    first_link:
      'https://investors.sentinelone.com/financial-info/quarterly-results/default.aspx',
    notes: 'EPS guidance 1-2 cents vs 5 cents expected. Stock -2% AH.',
  },
  {
    rank: 30,
    event:
      'Cloudflare Q1 2026 beat + 20% layoffs (1,100 jobs) \u2014 NET -14% AH',
    severity: 8,
    ticker: 'NET',
    peers: ['AKAM', 'ZS'],
    trade_idea: 'NET short / AKAM peer check',
    source: 'Cloudflare 8-K / SEC filing',
    source_link:
      'https://www.reuters.com/business/cloudflares-slowing-growth-disappoints-investors-betting-ai-boost-2026-05-08/?utm_source=chatgpt.com',
    source_date: '2026-05-07',
    source_time: 'After close (8-K filed + earnings call evening May 7)',
    first_date: '2026-05-07',
    first_time: 'After close',
    first_link:
      'https://www.sec.gov/Archives/edgar/data/0001477333/000147733326000033/cloud-20260507.htm',
    notes:
      "Revenue $639.8M (+34%) beat but 20% workforce cut. 'Agentic AI-first' restructuring. $140-150M charges. NET -14% AH.",
  },
  {
    rank: 31,
    event:
      'Datadog Q1 2026 \u2014 first $1B quarter, forecast raised \u2014 DDOG +30%',
    severity: 9,
    ticker: 'DDOG',
    peers: ['DT', 'NET', 'SNOW'],
    trade_idea: 'DDOG long / software basket',
    source: 'Datadog IR / Seeking Alpha',
    source_link:
      'https://www.reuters.com/technology/datadog-raises-annual-forecast-strong-cloud-security-demand-shares-up-29-2026-05-07/?utm_source=chatgpt.com',
    source_date: '2026-05-07',
    source_time: 'After close',
    first_date: '2026-05-07',
    first_time: 'After close',
    first_link:
      'https://investors.datadoghq.com/news-releases/news-release-details/datadog-announces-first-quarter-2026-financial-results/',
    notes:
      'Revenue $1.006B (+32%), first $1B quarter. Raised FY26 to $4.30-4.34B. Stock +30% May 8. SNOW +9%, MDB +11%.',
  },
  {
    rank: 32,
    event:
      'Datadog Q3 FY2025 \u2014 forecast beats \u2014 DDOG +10% pre-market',
    severity: 7,
    ticker: 'DDOG',
    peers: ['DT', 'NET'],
    trade_idea: 'DDOG long',
    source: 'Datadog IR / Reuters',
    source_link:
      'https://www.reuters.com/business/media-telecom/datadog-forecasts-strong-fourth-quarter-earnings-ai-driven-security-demand-2025-11-06/?utm_source=chatgpt.com',
    source_date: '2025-11-06',
    source_time: 'After close',
    first_date: '2025-11-06',
    first_time: 'After close',
    first_link: 'https://investors.datadoghq.com',
    notes:
      'Raised Q4 forecast above expectations. AI/cloud demand. Stock +10% pre-market.',
  },
  {
    rank: 33,
    event:
      'Datadog Q3 FY2024 \u2014 annual forecast raised on AI monitoring demand',
    severity: 7,
    ticker: 'DDOG',
    peers: ['DT', 'NET'],
    trade_idea: 'DDOG long / peer sympathy',
    source: 'Datadog IR / Reuters',
    source_link:
      'https://www.reuters.com/technology/artificial-intelligence/datadog-raises-annual-forecast-betting-ai-driven-cybersecurity-demand-2024-11-07/?utm_source=chatgpt.com',
    source_date: '2024-11-07',
    source_time: 'After close',
    first_date: '2024-11-07',
    first_time: 'After close',
    first_link: 'https://investors.datadoghq.com',
    notes:
      'Raised profit forecast. AI-driven monitoring demand. AI complexity drives observability need.',
  },
  {
    rank: 34,
    event:
      'Datadog Q2 2023 \u2014 cloud spending optimization \u2014 DDOG -16%',
    severity: 8,
    ticker: 'DDOG',
    peers: ['DT', 'NET'],
    trade_idea: 'DDOG short / DT check',
    source: 'Datadog IR / Motley Fool',
    source_link:
      'https://www.theinformation.com/briefings/datadog-shares-drop-20-as-customers-cut-spending?utm_source=chatgpt.com',
    source_date: '2023-08-08',
    source_time: 'After close (Q2 2023 earnings)',
    first_date: '2023-08-08',
    first_time: 'After close',
    first_link:
      'https://www.fool.com/investing/2023/08/11/why-datadog-plunged-over-15-this-week/',
    notes:
      'Customers optimizing cloud spend. Reduced FY outlook. Stock fell 15.6% that week.',
  },
  {
    rank: 35,
    event:
      'Check Point Q1 2026 \u2014 EPS beat but revenue miss + guidance cut \u2014 CHKP -16%',
    severity: 7,
    ticker: 'CHKP',
    peers: ['FTNT', 'PANW'],
    trade_idea: 'CHKP short / FTNT/PANW peer check',
    source: 'Check Point IR / Investing.com',
    source_link:
      'https://www.reuters.com/technology/cybersecurity-firm-check-point-software-first-quarter-profit-beats-estimates-2026-04-30/?utm_source=chatgpt.com',
    source_date: '2026-04-29',
    source_time:
      'After close (press release evening Apr 29; earnings call Apr 30 08:30 ET)',
    first_date: '2026-04-29',
    first_time: 'After close',
    first_link: 'https://www.checkpoint.com/press-releases/',
    notes:
      'Non-GAAP EPS $2.50 beat ($2.40 est) but revenue $668M missed ($672.6M). FY guidance lowered. Go-to-market restructuring hit product revenue. Stock -16% to -18% pre-market Apr 30.',
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
