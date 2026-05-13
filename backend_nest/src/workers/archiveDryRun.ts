#!/usr/bin/env node
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import fs from 'fs';
import { logger } from '@/shared/logger';
import companies from '@/data/companies';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { RSSParser, RSSAdapterFactory } = require('./security_news/rs_parser_node') as {
  RSSParser: new (adapter: unknown) => { parse(xml: string): { items: RssItem[] } };
  RSSAdapterFactory: { createAdapter(xml: string): unknown };
};

const EPOCH_CUTOFF = 1735689600000; // Jan 1 2025
const ARCHIVE_ROOT = path.resolve(__dirname, '../../../archive/xml');
const DRY_RUN_OUTPUT = path.resolve(ARCHIVE_ROOT, '../dry-run');

type RssItem = {
  title: string;
  link: string;
  pubDate: string;
  epochDate: number | null;
  author: string;
  categories: string[];
  guid: string;
  description: string;
};

type CompanyMatch = { company: string; ticker: string };

const COMPANY_ALIASES: Record<string, string[]> = {
  'CrowdStrike': ['CRWD', 'Falcon platform', 'Falcon sensor'],
  'Palo Alto Networks': ['PANW', 'Cortex', 'Prisma'],
  'Fortinet': ['FTNT', 'FortiGate', 'FortiOS'],
  'Zscaler': ['ZS', 'Zero trust network'],
  'SentinelOne': ['Singularity platform'],
  'Cloudflare': ['Cloudflare Workers'],
  'Microsoft': ['MSFT', 'Azure', 'Windows Defender', 'Entra'],
  'NVIDIA': ['NVDA', 'CUDA'],
  'Cisco': ['CSCO', 'Talos', 'Webex'],
  'Palantir': ['PLTR', 'AIP platform'],
  'Apple': ['AAPL'],
  'Qualys': ['QLYS'],
  'Tenable Holdings': ['TENB', 'Nessus'],
  'Varonis Systems': ['VRNS'],
};

const companyPatterns: { company: string; ticker: string; regex: RegExp }[] = [];
for (const [company, ticker] of Object.entries(companies)) {
  companyPatterns.push({
    company,
    ticker,
    regex: new RegExp(`\\b${company.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i'),
  });
  const aliases = COMPANY_ALIASES[company] ?? [];
  for (const alias of aliases) {
    if (alias.length <= 2) continue;
    companyPatterns.push({
      company,
      ticker,
      regex: new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i'),
    });
  }
}

function discoverFiles(root: string): { source: string; filePath: string }[] {
  if (!fs.existsSync(root)) {
    logger.error({ root }, 'archive root not found');
    return [];
  }
  const results: { source: string; filePath: string }[] = [];
  for (const entry of fs.readdirSync(root)) {
    const dir = path.join(root, entry);
    if (!fs.statSync(dir).isDirectory()) continue;
    const files = fs.readdirSync(dir)
      .filter(f => f.endsWith('.xml'))
      .sort();
    for (const file of files) {
      results.push({ source: entry, filePath: path.join(dir, file) });
    }
  }
  return results;
}

function parseXmlFile(filePath: string): RssItem[] {
  const xml = fs.readFileSync(filePath, 'utf-8');
  const adapter = RSSAdapterFactory.createAdapter(xml);
  const parser = new RSSParser(adapter);
  return parser.parse(xml).items ?? [];
}

function matchCompanies(title: string, desc: string): CompanyMatch[] {
  const haystack = title + ' ' + desc;
  const matches: CompanyMatch[] = [];
  for (const { company, ticker, regex } of companyPatterns) {
    if (regex.test(haystack)) {
      matches.push({ company, ticker });
    }
  }
  return matches;
}

async function main(): Promise<void> {
  // Clean up output dir
  if (fs.existsSync(DRY_RUN_OUTPUT)) {
    fs.rmSync(DRY_RUN_OUTPUT, { recursive: true });
  }
  fs.mkdirSync(DRY_RUN_OUTPUT, { recursive: true });

  const allFiles = discoverFiles(ARCHIVE_ROOT);
  logger.info({ total: allFiles.length, archiveRoot: ARCHIVE_ROOT }, 'files discovered');

  let filesProcessed = 0;
  let itemsParsed = 0;
  let itemsFiltered = 0;
  let totalMatched = 0;
  const matchedByCompany = new Map<string, number>();

  for (const { source, filePath } of allFiles) {
    filesProcessed++;
    let items: RssItem[];
    try {
      items = parseXmlFile(filePath);
    } catch (err) {
      logger.warn({ filePath, err: (err as Error).message }, 'xml parse failed, skipping');
      continue;
    }

    itemsParsed += items.length;

    // Filter to 2025+
    const recent = items.filter(
      i => i.link && i.epochDate != null && i.epochDate >= EPOCH_CUTOFF,
    );
    itemsFiltered += recent.length;

    for (const item of recent) {
      const matches = matchCompanies(item.title, item.description);
      if (matches.length === 0) continue;

      totalMatched++;

      if (totalMatched % 100 === 0) {
        logger.info({ totalMatched, filesProcessed }, 'progress: 100 articles matched');
      }

      // Create JSON file per company match
      for (const match of matches) {
        const companyDir = path.join(DRY_RUN_OUTPUT, match.company.replace(/\s+/g, '_'));
        if (!fs.existsSync(companyDir)) {
          fs.mkdirSync(companyDir, { recursive: true });
        }

        const fileName = `${item.link.slice(-20).replace(/[/:?#[\]@!$&'()*+,;=]/g, '_')}.json`;
        const filePath = path.join(companyDir, fileName);

        fs.writeFileSync(
          filePath,
          JSON.stringify(
            {
              title: item.title,
              link: item.link,
              publishedAt: item.epochDate ? new Date(item.epochDate).toISOString() : null,
              source,
              author: item.author,
              description: item.description,
              allMatches: matches,
            },
            null,
            2,
          ),
        );

        matchedByCompany.set(match.company, (matchedByCompany.get(match.company) ?? 0) + 1);
      }
    }
  }

  logger.info(
    {
      filesProcessed,
      itemsParsed,
      itemsFiltered,
      totalMatched,
    },
    'dry-run complete',
  );

  logger.info({ outputDir: DRY_RUN_OUTPUT }, 'matched articles written to');
  logger.info({}, '\nPer-company breakdown:');
  for (const [company, count] of [...matchedByCompany.entries()].sort((a, b) => b[1] - a[1])) {
    logger.info({ company, count }, `  ${company}: ${count}`);
  }
}

main().catch(err => {
  logger.error({ err }, 'dry-run failed');
  process.exit(1);
});
