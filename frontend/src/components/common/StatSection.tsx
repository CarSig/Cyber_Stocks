import type { CSSProperties, ReactNode } from 'react';

type StatSectionProps = {
  label?: ReactNode;
  value?: ReactNode;
  /** Dynamic color (e.g. derived from sentiment/correlation strength). Stays inline. */
  valueColor?: string;
  subtitle?: ReactNode;
  children?: ReactNode;
  minWidth?: number;
};

export default function StatSection({
  label,
  value,
  valueColor,
  subtitle,
  children,
  minWidth = 170,
}: StatSectionProps) {
  const valueStyle: CSSProperties | undefined = valueColor ? { color: valueColor } : undefined;
  return (
    <div className="stat-section" style={{ minWidth }}>
      <div className="stat-section-label">{label}</div>
      <div className="stat-section-value" style={valueStyle}>
        {value}
      </div>
      {subtitle && <div className="stat-section-subtitle">{subtitle}</div>}
      {children}
    </div>
  );
}
