import { htmlToText, scanCyberKeywords } from './filing-body';

describe('htmlToText', () => {
  it('strips tags and decodes common entities', () => {
    const html = '<p>Item&nbsp;8.01 &#8220;Other Events&#8221; &amp; more</p><script>x()</script>';
    const text = htmlToText(html);
    expect(text).toBe('Item 8.01 "Other Events" & more');
    expect(text).not.toContain('x()');
  });
});

describe('scanCyberKeywords', () => {
  // Golden case: CrowdStrike's actual 2024-07-22 Item 8.01 filing body text.
  const CRWD_8K_BODY =
    'Item 8.01 Other Events. On July 19, 2024, CrowdStrike Holdings, Inc. released a sensor ' +
    'configuration update for our Falcon sensor software that resulted in outages for a number of ' +
    'our customers utilizing certain Windows systems (the "event"). The event was not caused by a ' +
    'cyberattack.';

  it('matches the CrowdStrike outage filing', () => {
    const r = scanCyberKeywords(CRWD_8K_BODY);
    expect(r.matched).toBe(true);
    expect(r.keywords).toEqual(expect.arrayContaining(['outage', 'cyberattack']));
    expect(r.snippet).toBeTruthy();
  });

  it('does not match a routine buyback 8.01', () => {
    const buyback =
      'Item 8.01 Other Events. On May 1, 2024, the Board of Directors authorized a share repurchase ' +
      'program of up to $1.0 billion of the Company\'s common stock. The program has no expiration date.';
    const r = scanCyberKeywords(buyback);
    expect(r.matched).toBe(false);
    expect(r.keywords).toHaveLength(0);
    expect(r.snippet).toBeNull();
  });

  it('is case-insensitive and returns a context snippet', () => {
    const r = scanCyberKeywords('The company experienced a RANSOMWARE attack last week.');
    expect(r.matched).toBe(true);
    expect(r.keywords).toContain('ransomware');
    expect(r.snippet?.toLowerCase()).toContain('ransomware');
  });
});
