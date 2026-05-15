export default function ChartToggleButton({ active, onClick, className = '', visible = true, children }) {
  if (!visible) return null;
  return (
    <button onClick={onClick} className={`btn btn-ghost${active ? ' active' : ''}${className ? ` ${className}` : ''}`}>
      {children}
    </button>
  );
}
