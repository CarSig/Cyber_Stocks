import { useIntelligencePage } from '@/features/intelligence/hooks/useIntelligencePage';
import CountBadge from '@/components/common/data-display/CountBadge';
import EntityDetailPanel from '@/features/intelligence/components/EntityDetailPanel';
import EntityCard from '@/features/intelligence/components/EntityCard';
import EntityListRow from '@/features/intelligence/components/EntityListRow';
import SignalSidebar from '@/features/intelligence/components/SignalSidebar';
import ExpandableFilterSection from '@/components/common/filters/ExpandableFilterSection';
import ItemListPage from '@/components/common/layout/ItemListPage';
import './Intelligence.css';
import type { CorrelationResult, IntelligenceEntity } from '@/types';

export default function Intelligence() {
  const {
    selected,
    setSelected,
    selectedSignal,
    setSelectedSignal,
    lagDays,
    setLagDays,
    viewMode,
    setViewMode,
    signalsExpanded,
    setSignalsExpanded,
    uniqueEntities,
    isPending,
    correlationByEntityId,
    filteredSignals,
    signalsLoading,
  } = useIntelligencePage();

  const sidebarContent = (
    <ExpandableFilterSection
      title="Signals"
      icon="📡"
      isExpanded={signalsExpanded}
      onToggle={() => setSignalsExpanded((e) => !e)}
      loading={signalsLoading}
    >
      {filteredSignals?.slice(0, 15).map((s) => (
        <div
          key={s.signalType}
          onClick={() => setSelectedSignal(selectedSignal === s.signalType ? null : s.signalType)}
          className={`sidebar-signal-item ${selectedSignal === s.signalType ? 'sidebar-signal-item-active' : ''}`}
        >
          <span className="sidebar-signal-item-name">{s.signalType}</span>
          <CountBadge count={s.count} className="sidebar-signal-item-count" />
        </div>
      ))}
    </ExpandableFilterSection>
  );

  const correlationFor = (entityId: string) =>
    correlationByEntityId[entityId] as { result?: CorrelationResult | { error: string } } | undefined;

  return (
    <ItemListPage<IntelligenceEntity>
      pageTitle="News Intelligence"
      description="AI-extracted entities, per-entity sentiment, and macro signals from Yahoo news. Click a company to see all articles."
      sidebarTitle="Filters"
      sidebarContent={sidebarContent}
      filterBannerLabel="Filtered by signal:"
      filterBannerValue={selectedSignal}
      onClearFilter={() => setSelectedSignal(null)}
      lagDays={lagDays}
      setLagDays={setLagDays}
      viewMode={viewMode}
      setViewMode={setViewMode}
      listHeaderTitle="Entity Intelligence"
      items={uniqueEntities}
      itemsLoading={isPending}
      getItemKey={(e) => e.entityId}
      renderCard={(e) => (
        <EntityCard
          entity={e}
          onClick={() => setSelected(e.entityId)}
          signal={selectedSignal ?? undefined}
          correlation={correlationFor(e.entityId)}
        />
      )}
      renderRow={(e) => (
        <EntityListRow
          entity={e}
          onClick={() => setSelected(e.entityId)}
          signal={selectedSignal ?? undefined}
          correlation={correlationFor(e.entityId)}
        />
      )}
      rightPanel={<SignalSidebar selectedSignal={selectedSignal ?? undefined} data={filteredSignals} />}
      rightPanelOpen={!!selectedSignal}
      rightPanelWidth={280}
      detailPanel={
        selected && (
          <EntityDetailPanel
            entityId={selected}
            onClose={() => setSelected(null)}
            signal={selectedSignal ?? undefined}
          />
        )
      }
    />
  );
}
