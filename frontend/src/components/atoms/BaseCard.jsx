import "./BaseCard.css";

export default function BaseCard({ variant, disabled, as: Tag = "div", className = "", style, children, ...props }) {
  const classes = ["base-card", variant ? `base-card--${variant}` : null, disabled ? "base-card--disabled" : null, className]
    .filter(Boolean)
    .join(" ");

  return (
    <Tag className={classes} style={style} {...props}>
      {children}
    </Tag>
  );
}
