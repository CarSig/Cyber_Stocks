import React from 'react';

type StatSectionProps = {
  label?: React.ReactNode;
  value?: React.ReactNode;
  valueColor?: string;
  subtitle?: React.ReactNode;
  children?: React.ReactNode;
};

export default function StatSection({ label, value, valueColor, subtitle, children }: StatSectionProps) {
  return (
    <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: 32 }}>
      <div style={{ fontSize: 11, color: 'var(--muted-foreground)', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 600, color: valueColor, marginBottom: 4 }}>{value}</div>
      {subtitle && <div style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>{subtitle}</div>}
      {children}
    </div>
  );
}
