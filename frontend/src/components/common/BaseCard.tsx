import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';
import './BaseCard.css';

type BaseCardOwnProps<E extends ElementType> = {
  variant?: 'stats' | 'article' | 'interactive';
  disabled?: boolean;
  as?: E;
  className?: string;
  children?: ReactNode;
};

type BaseCardProps<E extends ElementType> = BaseCardOwnProps<E> &
  Omit<ComponentPropsWithoutRef<E>, keyof BaseCardOwnProps<E>>;

export default function BaseCard<E extends ElementType = 'div'>({
  variant,
  disabled,
  as,
  className = '',
  children,
  ...props
}: BaseCardProps<E>) {
  const Tag = (as ?? 'div') as ElementType;
  const classes = [
    'base-card',
    variant ? `base-card--${variant}` : null,
    disabled ? 'base-card--disabled' : null,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Tag className={classes} {...props}>
      {children}
    </Tag>
  );
}
