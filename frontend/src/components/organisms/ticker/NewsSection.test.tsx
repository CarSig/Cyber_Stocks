import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import NewsSection from './NewsSection';
import * as useNewsAnalysisModule from '@/hooks/useNewsAnalysis';

vi.mock('@/hooks/useNewsAnalysis');

const ARTICLES = [
  {
    link: 'https://example.com/article-1',
    title: 'CrowdStrike reports record revenue',
    publisher: 'Reuters',
    providerPublishTime: '2026-04-20T10:00:00.000Z',
  },
  {
    link: 'https://example.com/article-2',
    title: 'Cybersecurity stocks fall amid market downturn',
    publisher: 'Bloomberg',
    providerPublishTime: '2026-04-19T08:00:00.000Z',
  },
];

const ANALYSIS_DATA = {
  'https://example.com/article-1': {
    sentiment: 0.75,
    importance: 8,
    relevance: 9,
    timeframe: 'short',
    catalyst: true,
    summary: 'Strong earnings beat expectations.',
    topics: ['earnings', 'revenue'],
    entities: ['CrowdStrike'],
  },
  'https://example.com/article-2': {
    sentiment: -0.4,
    importance: 5,
    relevance: 6,
    timeframe: 'long',
    catalyst: false,
    summary: 'Broader market selloff affects sector.',
    topics: ['market'],
    entities: [],
  },
};

function makeHook(overrides: Record<string, unknown> = {}) {
  return {
    analysis: { data: null, isPending: false },
    correlation: { data: null, isPending: false, error: null },
    analyze: { mutate: vi.fn(), isPending: false, data: null },
    showCorrelation: false,
    setShowCorrelation: vi.fn(),
    polling: false,
    ...overrides,
  };
}

beforeEach(() => {
  vi.spyOn(useNewsAnalysisModule, 'useNewsAnalysis').mockReturnValue(makeHook() as unknown as ReturnType<typeof useNewsAnalysisModule.useNewsAnalysis>);
});

describe('NewsSection', () => {
  it('renders article count in heading', () => {
    render(<NewsSection ticker="CRWD" news={ARTICLES} />);
    expect(screen.getByText(/2 articles/i)).toBeInTheDocument();
  });

  it('renders all article titles', () => {
    render(<NewsSection ticker="CRWD" news={ARTICLES} />);
    expect(screen.getByText('CrowdStrike reports record revenue')).toBeInTheDocument();
    expect(screen.getByText('Cybersecurity stocks fall amid market downturn')).toBeInTheDocument();
  });

  it('shows Analyze Sentiment button in idle state', () => {
    render(<NewsSection ticker="CRWD" news={ARTICLES} />);
    expect(screen.getByRole('button', { name: 'Analyze Sentiment' })).toBeEnabled();
  });

  it('shows Queuing… while mutation is pending', () => {
    vi.spyOn(useNewsAnalysisModule, 'useNewsAnalysis').mockReturnValue(
      makeHook({ analyze: { mutate: vi.fn(), isPending: true, data: null } }) as unknown as ReturnType<typeof useNewsAnalysisModule.useNewsAnalysis>,
    );
    render(<NewsSection ticker="CRWD" news={ARTICLES} />);
    expect(screen.getByRole('button', { name: 'Queuing…' })).toBeDisabled();
  });

  it('shows Processing… and disables button while polling', () => {
    vi.spyOn(useNewsAnalysisModule, 'useNewsAnalysis').mockReturnValue(
      makeHook({ polling: true, analyze: { mutate: vi.fn(), isPending: false, data: null } }) as unknown as ReturnType<typeof useNewsAnalysisModule.useNewsAnalysis>,
    );
    render(<NewsSection ticker="CRWD" news={ARTICLES} />);
    expect(screen.getByRole('button', { name: 'Processing…' })).toBeDisabled();
  });

  it('shows "All articles already analyzed" when queued is 0', () => {
    vi.spyOn(useNewsAnalysisModule, 'useNewsAnalysis').mockReturnValue(
      makeHook({ analyze: { mutate: vi.fn(), isPending: false, data: { queued: 0, total: 5 } } }) as unknown as ReturnType<typeof useNewsAnalysisModule.useNewsAnalysis>,
    );
    render(<NewsSection ticker="CRWD" news={ARTICLES} />);
    expect(screen.getByText('All articles already analyzed')).toBeInTheDocument();
  });

  it('shows queued count when articles were enqueued', () => {
    vi.spyOn(useNewsAnalysisModule, 'useNewsAnalysis').mockReturnValue(
      makeHook({ analyze: { mutate: vi.fn(), isPending: false, data: { queued: 12, total: 20 } } }) as unknown as ReturnType<typeof useNewsAnalysisModule.useNewsAnalysis>,
    );
    render(<NewsSection ticker="CRWD" news={ARTICLES} />);
    expect(screen.getByText('Queued 12 articles')).toBeInTheDocument();
  });

  it('calls analyze.mutate when button is clicked', () => {
    const mutate = vi.fn();
    vi.spyOn(useNewsAnalysisModule, 'useNewsAnalysis').mockReturnValue(
      makeHook({ analyze: { mutate, isPending: false, data: null } }) as unknown as ReturnType<typeof useNewsAnalysisModule.useNewsAnalysis>,
    );
    render(<NewsSection ticker="CRWD" news={ARTICLES} />);
    fireEvent.click(screen.getByRole('button', { name: 'Analyze Sentiment' }));
    expect(mutate).toHaveBeenCalledOnce();
  });

  it('calls setShowCorrelation when Correlation button is clicked', () => {
    const setShowCorrelation = vi.fn();
    vi.spyOn(useNewsAnalysisModule, 'useNewsAnalysis').mockReturnValue(makeHook({ setShowCorrelation }) as unknown as ReturnType<typeof useNewsAnalysisModule.useNewsAnalysis>);
    render(<NewsSection ticker="CRWD" news={ARTICLES} />);
    fireEvent.click(screen.getByRole('button', { name: 'Correlation' }));
    expect(setShowCorrelation).toHaveBeenCalledOnce();
  });

  it('does not render correlation box when showCorrelation is false', () => {
    render(<NewsSection ticker="CRWD" news={ARTICLES} />);
    expect(screen.queryByText(/loading correlation/i)).not.toBeInTheDocument();
  });

  it('renders correlation loading state', () => {
    vi.spyOn(useNewsAnalysisModule, 'useNewsAnalysis').mockReturnValue(
      makeHook({ showCorrelation: true, correlation: { isPending: true, data: null, error: null } }) as unknown as ReturnType<typeof useNewsAnalysisModule.useNewsAnalysis>,
    );
    render(<NewsSection ticker="CRWD" news={ARTICLES} />);
    expect(screen.getByText('Loading correlation…')).toBeInTheDocument();
  });

  it('renders correlation error message', () => {
    vi.spyOn(useNewsAnalysisModule, 'useNewsAnalysis').mockReturnValue(
      makeHook({
        showCorrelation: true,
        correlation: { isPending: false, data: null, error: new Error('Not enough data points') },
      }) as unknown as ReturnType<typeof useNewsAnalysisModule.useNewsAnalysis>,
    );
    render(<NewsSection ticker="CRWD" news={ARTICLES} />);
    expect(screen.getByText('Not enough data points')).toBeInTheDocument();
  });

  it('renders sentiment badges when analysis data is present', () => {
    vi.spyOn(useNewsAnalysisModule, 'useNewsAnalysis').mockReturnValue(makeHook({ analysis: { data: ANALYSIS_DATA } }) as unknown as ReturnType<typeof useNewsAnalysisModule.useNewsAnalysis>);
    render(<NewsSection ticker="CRWD" news={ARTICLES} />);
    expect(screen.getByText(/▲▲/)).toBeInTheDocument();
    expect(screen.getByText(/imp 8\/10/)).toBeInTheDocument();
    expect(screen.getByText(/rel 9\/10/)).toBeInTheDocument();
    expect(screen.getByText('catalyst')).toBeInTheDocument();
    expect(screen.getByText('Strong earnings beat expectations.')).toBeInTheDocument();
  });

  it('renders topics and entities for analyzed articles', () => {
    vi.spyOn(useNewsAnalysisModule, 'useNewsAnalysis').mockReturnValue(makeHook({ analysis: { data: ANALYSIS_DATA } }) as unknown as ReturnType<typeof useNewsAnalysisModule.useNewsAnalysis>);
    render(<NewsSection ticker="CRWD" news={ARTICLES} />);
    expect(screen.getByText('earnings')).toBeInTheDocument();
    expect(screen.getByText('CrowdStrike')).toBeInTheDocument();
  });

  it('renders negative sentiment arrow for negative score', () => {
    vi.spyOn(useNewsAnalysisModule, 'useNewsAnalysis').mockReturnValue(makeHook({ analysis: { data: ANALYSIS_DATA } }) as unknown as ReturnType<typeof useNewsAnalysisModule.useNewsAnalysis>);
    render(<NewsSection ticker="CRWD" news={ARTICLES} />);
    expect(screen.getByText(/▼/)).toBeInTheDocument();
  });

  it('renders 0 articles gracefully when news is empty', () => {
    render(<NewsSection ticker="CRWD" news={[]} />);
    expect(screen.getByText(/0 articles/i)).toBeInTheDocument();
  });

  it('renders 0 articles gracefully when news is undefined', () => {
    render(<NewsSection ticker="CRWD" />);
    expect(screen.getByText(/0 articles/i)).toBeInTheDocument();
  });

  it('shows analyzed count when analysis data is present', () => {
    vi.spyOn(useNewsAnalysisModule, 'useNewsAnalysis').mockReturnValue(
      makeHook({ analysis: { data: ANALYSIS_DATA }, analyzedCount: 2 }) as unknown as ReturnType<typeof useNewsAnalysisModule.useNewsAnalysis>,
    );
    render(<NewsSection ticker="CRWD" news={ARTICLES} />);
    expect(screen.getByText(/2\s*\/\s*2\s*analyzed/)).toBeInTheDocument();
  });

  it('shows 0 analyzed when no analysis data', () => {
    vi.spyOn(useNewsAnalysisModule, 'useNewsAnalysis').mockReturnValue(makeHook({ analyzedCount: 0 }) as unknown as ReturnType<typeof useNewsAnalysisModule.useNewsAnalysis>);
    render(<NewsSection ticker="CRWD" news={ARTICLES} />);
    expect(screen.getByText(/0\s*\/\s*2\s*analyzed/)).toBeInTheDocument();
  });
});
