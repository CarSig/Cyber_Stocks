import React from 'react';

type DetailPanelOverlayProps = {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  onClose?: () => void;
  children?: React.ReactNode;
  className?: string;
};

export default function DetailPanelOverlay({
  title,
  subtitle,
  onClose,
  children,
  className = '',
}: DetailPanelOverlayProps) {
  return (
    <div className="overlay-panel-backdrop" onClick={onClose}>
      <div className={`panel-slide-right ${className}`} onClick={(e) => e.stopPropagation()}>
        <div className="header-flex-between detail-panel-header">
          <div>
            <h2 className="detail-panel-title">{title}</h2>
            {subtitle && <span className="detail-panel-subtitle">{subtitle}</span>}
          </div>
          <button className="btn-close-icon" onClick={onClose}>
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
