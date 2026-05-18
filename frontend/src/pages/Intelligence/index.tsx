import { useIntelligencePage } from '@/hooks/useIntelligencePage';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { CorrelationSelector, ViewToggle } from '@/components/shared/CorrelationControls';
import { URGENCY_CONFIG } from '@/utils/urgencyUtils';
import CountBadge from '@/components/atoms/CountBadge';
import EntityDetailPanel from '@/components/organisms/intelligence/EntityDetailPanel';
import EntityCard from '@/components/organisms/cards/entity/EntityCard';
import EntityListRow from '@/components/molecules/intelligence/EntityListRow';
import SignalSidebar from '@/components/molecules/intelligence/SignalSidebar';
import ExpandableFilterSection from '@/components/molecules/shared/ExpandableFilterSection';
import './Intelligence.css';
import Page from '@/components/atoms/Page';
import type { UrgencyKey, CorrelationResult } from '@/types';

export default function Intelligence() {
  const {
    selected,
    setSelected,
    selectedSignal,
    setSelectedSignal,
    selectedUrgency,
    setSelectedUrgency,
    urgencyCounts,
    setUrgencyCounts,
    lagDays,
    setLagDays,
    viewMode,
    setViewMode,
    signalsExpanded,
    setSignalsExpanded,
    urgencyExpanded,
    setUrgencyExpanded,
    uniqueEntities,
    isPending,
    correlationByEntityId,
    filteredSignals,
    signalsLoading,
  } = useIntelligencePage();

  return (
    <div className="intelligence-sidebar">
      <div className="intelligence-left-sidebar">
        <h2 className="intelligence-left-sidebar-title">Filters</h2>

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

        <ExpandableFilterSection
          title="Urgency"
          icon="⏱"
          isExpanded={urgencyExpanded}
          onToggle={() => setUrgencyExpanded((e) => !e)}
        >
          <div className="sidebar-urgency-list">
            {(['now', 'today', 'recent', 'future_short', 'future_long', 'past'] as UrgencyKey[]).map((key) => {
              const cfg = URGENCY_CONFIG[key];
              const isActive = selectedUrgency === key;
              const count = urgencyCounts[key] || 0;
              return (
                <button
                  key={key}
                  onClick={() => setSelectedUrgency(isActive ? null : key)}
                  className="sidebar-urgency-button"
                  style={{
                    borderColor: cfg.color,
                    background: isActive ? cfg.bg : 'transparent',
                    color: cfg.color,
                    fontWeight: isActive ? 600 : 400,
                  }}
                >
                  <span>{cfg.label}</span>
                  {selected && <CountBadge count={count} className="ml-1 shrink-0" />}
                </button>
              );
            })}
          </div>
        </ExpandableFilterSection>
      </div>

      <div className="intelligence-main-content" style={{ paddingRight: selectedSignal ? 300 : 0 }}>
        <Page title="News Intelligence">
          <p className="intelligence-description">
            AI-extracted entities, per-entity sentiment, and macro signals from Yahoo news. Click a company to see all
            articles.
          </p>

          {selectedSignal && (
            <div className="signal-filter-badge">
              <span className="signal-filter-badge-label">Filtered by signal:</span>
              <span className="signal-filter-badge-value">{selectedSignal}</span>
              <button onClick={() => setSelectedSignal(null)} className="signal-filter-badge-close">
                Clear filter
              </button>
            </div>
          )}

          <CorrelationSelector lagDays={lagDays} setLagDays={setLagDays} />

          <div className="entity-list-header header-flex-between">
            <h2 className="entity-list-header-title">Entity Intelligence</h2>
            <ViewToggle viewMode={viewMode} setViewMode={setViewMode} />
          </div>

          {isPending ? (
            <LoadingSpinner />
          ) : viewMode === 'grid' ? (
            <div className="ti-grid mb-32px">
              {uniqueEntities.map((e) => (
                <EntityCard
                  key={e.entityId}
                  entity={e}
                  onClick={() => setSelected(e.entityId)}
                  signal={selectedSignal ?? undefined}
                  correlation={
                    correlationByEntityId[e.entityId] as { result?: CorrelationResult | { error: string } } | undefined
                  }
                />
              ))}
            </div>
          ) : (
            <div className="mb-32px">
              {uniqueEntities.map((e) => (
                <EntityListRow
                  key={e.entityId}
                  entity={e}
                  onClick={() => setSelected(e.entityId)}
                  signal={selectedSignal ?? undefined}
                  correlation={
                    correlationByEntityId[e.entityId] as { result?: CorrelationResult | { error: string } } | undefined
                  }
                />
              ))}
            </div>
          )}

          {selected && (
            <EntityDetailPanel
              entityId={selected}
              onClose={() => setSelected(null)}
              signal={selectedSignal ?? undefined}
              urgencyFilter={selectedUrgency ?? undefined}
              onUrgencyChange={(u: string | null) => setSelectedUrgency(u as UrgencyKey | null)}
              onUrgencyCounts={setUrgencyCounts}
            />
          )}
        </Page>
      </div>

      <SignalSidebar selectedSignal={selectedSignal ?? undefined} data={filteredSignals} />
    </div>
  );
}
