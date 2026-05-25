import { useState, type ReactNode } from 'react';
import { CorrelationSelector, ViewToggle } from '@/features/correlations/ui';
import { LoadingSpinner } from '@/components/common/feedback/LoadingSpinner';
import FilterBanner from '@/components/common/filters/FilterBanner';
import LeftSidebar from '@/components/common/layout/LeftSidebar';
import PageWithSidebar from '@/components/common/layout/PageWithSidebar';
import Page from '@/components/common/layout/Page';
import './item-list-page.css';

export type ItemListPageProps<T> = {
  // Header
  pageTitle: string;
  description: string;

  // Sidebar — opaque content lets each page render its own filter shape
  // (expandable section for signals, flat list for topics, etc.)
  sidebarTitle: string;
  sidebarContent: ReactNode;

  // Optional filter banner above the list
  filterBannerLabel?: string;
  filterBannerValue?: string | null;
  onClearFilter?: () => void;

  // Correlation + view toggle
  lagDays: number;
  setLagDays: (n: number) => void;
  viewMode: string;
  setViewMode: (v: string) => void;
  listHeaderTitle: string;

  // Items
  items: T[];
  itemsLoading: boolean;
  getItemKey: (item: T) => string;
  renderCard: (item: T) => ReactNode;
  renderRow: (item: T) => ReactNode;

  // Optional right panel (e.g. Intelligence's SignalSidebar)
  rightPanel?: ReactNode;
  rightPanelOpen?: boolean;
  rightPanelWidth?: number;

  // Detail panel — caller owns its state, this just slots it in
  detailPanel?: ReactNode;
};

export default function ItemListPage<T>({
  pageTitle,
  description,
  sidebarTitle,
  sidebarContent,
  filterBannerLabel,
  filterBannerValue,
  onClearFilter,
  lagDays,
  setLagDays,
  viewMode,
  setViewMode,
  listHeaderTitle,
  items,
  itemsLoading,
  getItemKey,
  renderCard,
  renderRow,
  rightPanel,
  rightPanelOpen,
  rightPanelWidth = 280,
  detailPanel,
}: ItemListPageProps<T>) {
  const [showSidebar, setShowSidebar] = useState(true);

  return (
    <PageWithSidebar
      sidebar={
        <LeftSidebar title={sidebarTitle} show={showSidebar} onToggle={() => setShowSidebar((v) => !v)}>
          {sidebarContent}
        </LeftSidebar>
      }
      rightPanelOpen={rightPanelOpen}
      rightPanelWidth={rightPanelWidth}
    >
      <Page title={pageTitle}>
        <p className="item-list-page-description">{description}</p>

        {filterBannerValue && onClearFilter && (
          <FilterBanner label={filterBannerLabel ?? 'Filtered by:'} value={filterBannerValue} onClear={onClearFilter} />
        )}

        <CorrelationSelector lagDays={lagDays} setLagDays={setLagDays} />

        <div className="item-list-page-header header-flex-between">
          <h2 className="item-list-page-header-title">{listHeaderTitle}</h2>
          <ViewToggle viewMode={viewMode} setViewMode={setViewMode} />
        </div>

        {itemsLoading ? (
          <LoadingSpinner />
        ) : viewMode === 'grid' ? (
          <div className="ti-grid item-list-page-list">{items.map((item) => <div key={getItemKey(item)}>{renderCard(item)}</div>)}</div>
        ) : (
          <div className="item-list-page-list">{items.map((item) => <div key={getItemKey(item)}>{renderRow(item)}</div>)}</div>
        )}

        {detailPanel}
      </Page>

      {rightPanel}
    </PageWithSidebar>
  );
}
