import React from 'react';
import './BaseCard.css';

type BaseCardProps = {
  variant?: string;
  disabled?: boolean;
  as?: React.ElementType;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
  [key: string]: unknown;
};

export default function BaseCard({
  variant,
  disabled,
  as: Tag = 'div',
  className = '',
  style,
  children,
  ...props
}: BaseCardProps) {
  const classes = [
    'base-card',
    variant ? `base-card--${variant}` : null,
    disabled ? 'base-card--disabled' : null,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Tag className={classes} style={style} {...props}>
      {children}
    </Tag>
  );
}
