import React from 'react';

type ExpandableFilterSectionProps = {
  title?: React.ReactNode;
  icon?: React.ReactNode;
  isExpanded?: boolean;
  onToggle?: () => void;
  loading?: boolean;
  children?: React.ReactNode;
};

export default function ExpandableFilterSection({ title, icon, isExpanded, onToggle, loading, children }: ExpandableFilterSectionProps) {
  return (
    <div className="sidebar-section">
      <button onClick={onToggle} className="sidebar-section-button">
        {icon} {title}
        <span className="sidebar-section-icon">{isExpanded ? '▼' : '▶'}</span>
      </button>
      {isExpanded && (
        <>
          {loading && <p className="ti-loading">Loading…</p>}
          {children}
        </>
      )}
    </div>
  );
}
