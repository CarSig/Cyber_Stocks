import type { ReactNode } from 'react';

type LeftSidebarProps = {
  title: string;
  show: boolean;
  onToggle: () => void;
  children: ReactNode;
};

export default function LeftSidebar({ title, show, onToggle, children }: LeftSidebarProps) {
  return (
    <aside className={`left-sidebar${show ? '' : ' left-sidebar--collapsed'}`}>
      <button
        className="left-sidebar-toggle"
        onClick={onToggle}
        title={show ? 'Hide sidebar' : 'Show sidebar'}
      >
        {show ? '<' : '›'}
      </button>
      <h2 className="left-sidebar-title">{title}</h2>
      {children}
    </aside>
  );
}
