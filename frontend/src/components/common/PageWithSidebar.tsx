import type { ReactNode } from 'react';

type PageWithSidebarProps = {
  sidebar: ReactNode;
  rightPanelOpen?: boolean;
  rightPanelWidth?: number;
  children: ReactNode;
};

export default function PageWithSidebar({
  sidebar,
  rightPanelOpen = false,
  rightPanelWidth = 280,
  children,
}: PageWithSidebarProps) {
  return (
    <div className="page-with-sidebar">
      {sidebar}
      <div
        className="page-with-sidebar-main"
        style={{ paddingRight: rightPanelOpen ? rightPanelWidth : 0 }}
      >
        {children}
      </div>
    </div>
  );
}
