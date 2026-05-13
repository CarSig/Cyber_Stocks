export default function DetailPanelOverlay({ title, subtitle, onClose, children, className = "" }) {
  return (
    <div className="overlay-panel-backdrop" onClick={onClose}>
      <div className={`panel-slide-right ${className}`} onClick={(e) => e.stopPropagation()}>
        <div className="header-flex-between" style={{ marginBottom: 16 }}>
          <div>
            <h2 style={{ margin: 0 }}>{title}</h2>
            {subtitle && <span style={{ fontSize: 13, color: "var(--muted-foreground)" }}>{subtitle}</span>}
          </div>
          <button className="btn-close-icon" onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
