import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CorrelationBox from './CorrelationBox';

const CORRELATION = {
  r: 0.65,
  pValue: 0.02,
  significant: true,
  ci: [0.1, 0.9] as [number, number],
  n: 42,
  lagDays: 1,
  source: 'news',
  interpretation: 'Moderate positive correlation (r = 0.650, p = 0.020): news events predict 1-day price movement.',
};

const GROUPED_LAG_IMPACT = {
  windowDays: 7,
  positive: { n: 10, avgChangePct: 3.5 },
  negative: { n: 8, avgChangePct: -2.1 },
  neutral: { n: 5, avgChangePct: 0.4 },
};

const SINGLE_LAG_IMPACT = {
  windowDays: 5,
  n: 12,
  avgChangePct: 2.8,
};

describe('CorrelationBox', () => {
  it('renders loading state when isPending', () => {
    render(<CorrelationBox isPending={true} />);
    expect(screen.getByText('Loading correlation…')).toBeInTheDocument();
  });

  it('renders error message when error is provided', () => {
    render(<CorrelationBox error={new Error('Not enough data points')} />);
    expect(screen.getByText('Not enough data points')).toBeInTheDocument();
  });

  it('does not render stats when correlation is absent', () => {
    render(<CorrelationBox />);
    expect(screen.queryByText(/Correlation \(r\)/)).not.toBeInTheDocument();
  });

  it('renders correlation stats from the correlation object', () => {
    render(<CorrelationBox correlation={CORRELATION} />);
    expect(screen.getByText(/Moderate positive correlation/)).toBeInTheDocument();
    expect(screen.getByText('0.650')).toBeInTheDocument();
    expect(screen.getByText('0.020')).toBeInTheDocument();
    expect(screen.getByTitle(/Number of event days/)).toHaveTextContent('42');
    expect(screen.getByText('1d')).toBeInTheDocument();
  });

  it('shows Significant: Yes for significant correlation', () => {
    render(<CorrelationBox correlation={CORRELATION} />);
    expect(screen.getByText('Yes')).toBeInTheDocument();
  });

  it('shows Significant: No for non-significant correlation', () => {
    render(<CorrelationBox correlation={{ ...CORRELATION, significant: false }} />);
    expect(screen.getByText('No')).toBeInTheDocument();
  });

  it('renders CI range when ci is provided', () => {
    render(<CorrelationBox correlation={CORRELATION} />);
    expect(screen.getByText(/\[0\.100, 0\.900\]/)).toBeInTheDocument();
  });

  it("renders p-value as '< 0.001' when very small", () => {
    render(<CorrelationBox correlation={{ ...CORRELATION, pValue: 0.0005 }} />);
    expect(screen.getByText('< 0.001')).toBeInTheDocument();
  });

  it('renders grouped lag impact with positive/negative/neutral', () => {
    render(<CorrelationBox correlation={CORRELATION} lagImpact={GROUPED_LAG_IMPACT} />);
    expect(screen.getByText('positive')).toBeInTheDocument();
    expect(screen.getByText('negative')).toBeInTheDocument();
    expect(screen.getByText('neutral')).toBeInTheDocument();
    expect(screen.getByText('3.50%')).toBeInTheDocument();
    expect(screen.getByText('-2.10%')).toBeInTheDocument();
  });

  it('renders single lag impact with label and percentage', () => {
    render(<CorrelationBox correlation={CORRELATION} lagImpact={SINGLE_LAG_IMPACT} lagImpactLabel="CVE events" />);
    expect(screen.getByText('CVE events')).toBeInTheDocument();
    expect(screen.getByText('2.80%')).toBeInTheDocument();
  });

  it('renders lag days input when lagDays and onLagDaysChange are provided', () => {
    const onChange = vi.fn();
    render(<CorrelationBox lagDays={3} onLagDaysChange={onChange} />);
    expect(screen.getByRole('spinbutton')).toBeInTheDocument();
    expect(screen.getByDisplayValue('3')).toBeInTheDocument();
  });

  it('calls onLagDaysChange with clamped value on input change', () => {
    const onChange = vi.fn();
    render(<CorrelationBox lagDays={5} onLagDaysChange={onChange} />);
    const input = screen.getByRole('spinbutton');
    fireEvent.change(input, { target: { value: '50' } });
    expect(onChange).toHaveBeenCalledWith(30); // clamped to max 30
  });

  it('clamps lag days to 0 at minimum', () => {
    const onChange = vi.fn();
    render(<CorrelationBox lagDays={5} onLagDaysChange={onChange} />);
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '-5' } });
    expect(onChange).toHaveBeenCalledWith(0);
  });

  it('does not render lag input when lagDays is not provided', () => {
    render(<CorrelationBox correlation={CORRELATION} />);
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
  });

  it('still renders stats while isFetching (dimmed but present)', () => {
    render(<CorrelationBox correlation={CORRELATION} isFetching={true} />);
    expect(screen.getByText(/Moderate positive correlation/)).toBeInTheDocument();
    expect(screen.getByText('0.650')).toBeInTheDocument();
  });

  it('does not render grouped lag impact for single lag impact object', () => {
    render(<CorrelationBox correlation={CORRELATION} lagImpact={SINGLE_LAG_IMPACT} lagImpactLabel="events" />);
    expect(screen.queryByText('positive')).not.toBeInTheDocument();
    expect(screen.queryByText('negative')).not.toBeInTheDocument();
  });

  it('renders stats when r is exactly 0 (no correlation)', () => {
    render(<CorrelationBox correlation={{ ...CORRELATION, r: 0 }} />);
    expect(screen.getByText('0.000')).toBeInTheDocument();
    expect(screen.getByTitle(/Pearson r/)).toBeInTheDocument();
  });

  it('does not render lag input when only lagDays is provided without onLagDaysChange', () => {
    render(<CorrelationBox lagDays={5} />);
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
  });

  it('does not render lag input when only onLagDaysChange is provided without lagDays', () => {
    render(<CorrelationBox onLagDaysChange={vi.fn()} />);
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
  });

  it("renders '—' for null avgChangePct in grouped bucket", () => {
    const lagImpact = {
      windowDays: 7,
      positive: { n: 0, avgChangePct: null },
      negative: { n: 3, avgChangePct: -1.5 },
      neutral: { n: 0, avgChangePct: null },
    };
    render(
      <CorrelationBox
        correlation={CORRELATION}
        lagImpact={lagImpact as Parameters<typeof CorrelationBox>[0]['lagImpact']}
      />,
    );
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(2);
  });
});
