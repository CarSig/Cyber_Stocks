import React from 'react';

type ModalItemProps = {
  href?: string;
  icon?: React.ReactNode;
  iconColor?: string;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
};

export default function ModalItem({ href, icon, iconColor, title, subtitle }: ModalItemProps) {
  const inner = (
    <>
      <span className="news-modal-sentiment" style={{ color: iconColor }}>
        {icon}
      </span>
      <div className="news-modal-content">
        <span className="news-modal-title">{title}</span>
        <span className="news-modal-publisher">{subtitle}</span>
      </div>
    </>
  );
  return href ? (
    <a href={href} target="_blank" rel="noreferrer" className="news-modal-item">
      {inner}
    </a>
  ) : (
    <div className="news-modal-item">{inner}</div>
  );
}
