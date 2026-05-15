import React from 'react';

type CardHeaderProps = {
  icon?: React.ReactNode;
  title?: React.ReactNode;
  titleClassName?: string;
  children?: React.ReactNode;
};

export default function CardHeader({ icon, title, titleClassName, children }: CardHeaderProps) {
  return (
    <div className="ti-card-head">
      {icon && <span className="ti-card-icon">{icon}</span>}
      <span className={['ti-card-title', titleClassName].filter(Boolean).join(' ')}>{title}</span>
      {children}
    </div>
  );
}
