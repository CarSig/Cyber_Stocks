import "./BaseCard.css";

export default function BaseCard({ variant, className = "", style, children, ...props }) {
  const classes = ["base-card", variant ? `base-card--${variant}` : null, className].filter(Boolean).join(" ");

  return (
    <div className={classes} style={style} {...props}>
      {children}
    </div>
  );
}
