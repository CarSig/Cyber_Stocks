type ToggleProps = {
  on?: boolean;
  onChange?: () => void;
  disabled?: boolean;
};

export default function Toggle({ on, onChange, disabled }: ToggleProps) {
  return (
    <button onClick={onChange} disabled={disabled} className={`toggle-btn${on ? ' on' : ''}`}>
      <span className="toggle-knob" />
    </button>
  );
}
