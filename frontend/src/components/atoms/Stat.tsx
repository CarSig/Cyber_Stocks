import React from 'react';

type StatProps = {
  label?: React.ReactNode;
  value?: React.ReactNode;
  color?: string;
};

export default function Stat({ label, value, color }: StatProps) {
  return (
    <div className="ti-stat">
      <div className="ti-stat-value" style={color ? { color } : {}}>
        {value ?? '—'}
      </div>
      <div className="ti-stat-label">{label}</div>
    </div>
  );
}
