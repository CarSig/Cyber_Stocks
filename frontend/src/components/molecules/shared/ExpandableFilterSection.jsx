export default function ExpandableFilterSection({ title, icon, isExpanded, onToggle, loading, children }) {
  return (
    <div className="sidebar-section">
      <button onClick={onToggle} className="sidebar-section-button">
        {icon} {title}
        <span className="sidebar-section-icon">{isExpanded ? "▼" : "▶"}</span>
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
