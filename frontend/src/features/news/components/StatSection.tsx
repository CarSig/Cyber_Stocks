import React from 'react';

type StatSectionProps = {
  label?: React.ReactNode;
  value?: React.ReactNode;
  valueColor?: string;
  subtitle?: React.ReactNode;
  children?: React.ReactNode;
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
  return (
    <div className="stat-section" style={{ minWidth }}>
      <div className="stat-section-label">{label}</div>
      <div className="stat-section-value" style={{ color: valueColor }}>
        {value}
      </div>
      {subtitle && <div className="stat-section-subtitle">{subtitle}</div>}
      {children}
    </div>
  );
}
