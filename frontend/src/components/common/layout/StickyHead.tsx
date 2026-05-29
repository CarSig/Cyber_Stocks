import React from 'react';
import './StickyHead.css';

type StickyHeadProps = {
  children?: React.ReactNode;
  className?: string;
};

/**
 * Sticky header strip that pins below the navbar. Used to keep tab/period
 * controls (e.g. chart time-range buttons) visible while the page scrolls.
 */
export default function StickyHead({ children, className }: StickyHeadProps) {
  return <div className={`sticky-head${className ? ` ${className}` : ''}`}>{children}</div>;
}
