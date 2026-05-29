import { DOMParser } from '@xmldom/xmldom';
import type { Form4Transaction, InsiderOwnerProfile } from '@algo/shared';

function getValue(el: Element, tagName: string): string | null {
  const tag = el.getElementsByTagName(tagName)[0];
  if (!tag) return null;
  const val = tag.getElementsByTagName('value')[0];
  // Some fields (e.g. transactionCode) store value as direct text, not wrapped in <value>
  const text = (val ?? tag).textContent?.trim();
  return text || null;
}

function hasFootnote(el: Element, tagName: string): boolean {
  const tag = el.getElementsByTagName(tagName)[0];
  if (!tag) return false;
  return tag.getElementsByTagName('footnoteId').length > 0;
}

function parseNum(s: string | null): number | null {
  if (s === null || s === '') return null;
  const n = parseFloat(s.replace(/,/g, ''));
  return isNaN(n) ? null : n;
}

function parseTransactions(
  els: HTMLCollectionOf<Element>,
  table: 'nonDerivative' | 'derivative',
): Form4Transaction[] {
  const out: Form4Transaction[] = [];
  for (let i = 0; i < els.length; i++) {
    const el = els[i] as Element;
    const securityTitle = getValue(el, 'securityTitle') ?? '';
    const transactionDate = getValue(el, 'transactionDate') ?? undefined;
    const code = getValue(el, 'transactionCode') ?? '';
    const acquiredDisposedRaw = getValue(el, 'transactionAcquiredDisposedCode');
    const acquiredDisposed =
      acquiredDisposedRaw === 'A' || acquiredDisposedRaw === 'D' ? acquiredDisposedRaw : null;

    const priceFromFootnote = hasFootnote(el, 'transactionPricePerShare');
    const priceRaw = getValue(el, 'transactionPricePerShare');
    const pricePerShare = priceFromFootnote ? null : parseNum(priceRaw);

    const sharesRaw = getValue(el, 'transactionShares') ?? getValue(el, 'transactionTotalValue');
    const shares = parseNum(sharesRaw);

    const sharesAfterRaw =
      getValue(el, 'sharesOwnedFollowingTransaction') ??
      getValue(el, 'valueOwnedFollowingTransaction');
    const sharesOwnedAfter = parseNum(sharesAfterRaw);

    const directOrIndirectRaw = getValue(el, 'directOrIndirectOwnership');
    const directOrIndirect =
      directOrIndirectRaw === 'D' || directOrIndirectRaw === 'I' ? directOrIndirectRaw : null;

    out.push({
      table,
      securityTitle,
      transactionDate,
      code,
      acquiredDisposed,
      shares,
      pricePerShare,
      priceFromFootnote,
      sharesOwnedAfter,
      directOrIndirect,
    });
  }
  return out;
}

function isTruthy(val: string | null): boolean {
  return val === '1' || val === 'true';
}

export function parseOwnerProfile(text: string): InsiderOwnerProfile | undefined {
  const start = text.indexOf('<ownershipDocument>');
  const end = text.indexOf('</ownershipDocument>');
  if (start === -1 || end === -1) return undefined;

  const xml = '<?xml version="1.0"?>' + text.slice(start, end + '</ownershipDocument>'.length);
  const doc = new DOMParser().parseFromString(xml, 'text/xml');

  const rel = doc.getElementsByTagName('reportingOwnerRelationship')[0];
  if (!rel) return undefined;

  const isDirector = isTruthy(rel.getElementsByTagName('isDirector')[0]?.textContent?.trim() ?? null);
  const isOfficer = isTruthy(rel.getElementsByTagName('isOfficer')[0]?.textContent?.trim() ?? null);
  const isTenPercentOwner = isTruthy(rel.getElementsByTagName('isTenPercentOwner')[0]?.textContent?.trim() ?? null);
  const officerTitle = rel.getElementsByTagName('officerTitle')[0]?.textContent?.trim() || undefined;

  return { isDirector, isOfficer, isTenPercentOwner, officerTitle };
}

export function parseForm4Xml(text: string): Form4Transaction[] {
  const start = text.indexOf('<ownershipDocument>');
  const end = text.indexOf('</ownershipDocument>');
  if (start === -1 || end === -1) return [];

  const xml = '<?xml version="1.0"?>' + text.slice(start, end + '</ownershipDocument>'.length);
  const doc = new DOMParser().parseFromString(xml, 'text/xml');

  const nonDerivTxns = doc.getElementsByTagName('nonDerivativeTransaction');
  const derivTxns = doc.getElementsByTagName('derivativeTransaction');

  return [
    ...parseTransactions(nonDerivTxns as unknown as HTMLCollectionOf<Element>, 'nonDerivative'),
    ...parseTransactions(derivTxns as unknown as HTMLCollectionOf<Element>, 'derivative'),
  ];
}
