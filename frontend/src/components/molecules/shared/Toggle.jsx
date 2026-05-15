export default function Toggle({ on, onChange, disabled }) {
  return (
    <button onClick={onChange} disabled={disabled} className={`toggle-btn${on ? ' on' : ''}`}>
      <span className="toggle-knob" />
    </button>
  );
}
