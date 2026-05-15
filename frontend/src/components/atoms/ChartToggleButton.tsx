import React from 'react';

type ChartToggleButtonProps = {
  active?: boolean;
  onClick?: () => void;
  className?: string;
  visible?: boolean;
  children?: React.ReactNode;
};

export default function ChartToggleButton({ active, onClick, className = '', visible = true, children }: ChartToggleButtonProps) {
  if (!visible) return null;
  return (
    <button onClick={onClick} className={`btn btn-ghost${active ? ' active' : ''}${className ? ` ${className}` : ''}`}>
      {children}
    </button>
  );
}
