import { describe, it, expect } from 'vitest';
import { formatArticleTitle } from './articleUtils';

describe('formatArticleTitle', () => {
  it('returns title when present', () => {
    expect(formatArticleTitle({ title: 'My Article' })).toBe('My Article');
  });

  it('prefers title over id', () => {
    expect(formatArticleTitle({ title: 'Title', id: 'some-2024-01-01-slug' })).toBe('Title');
  });

  it('strips timestamp prefix from id when no title', () => {
    expect(formatArticleTitle({ id: 'abc-2024-01-15-my-article-slug' })).toBe('my article slug');
  });

  it('replaces dashes with spaces in id-derived title', () => {
    expect(formatArticleTitle({ id: 'xyz-2024-06-30-hello-world' })).toBe('hello world');
  });

  it('returns empty string for empty id and no title', () => {
    expect(formatArticleTitle({ id: '' })).toBe('');
  });

  it('returns empty string when both title and id are absent', () => {
    expect(formatArticleTitle({})).toBe('');
  });

  it('handles id with no timestamp prefix (no match, dashes replaced)', () => {
    // regex does not match → replace only dashes with spaces
    expect(formatArticleTitle({ id: 'no-timestamp-here' })).toBe('no timestamp here');
  });
});
