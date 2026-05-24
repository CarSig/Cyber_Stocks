import { useState } from 'react';
import { useIntelligencePage } from '@/features/intelligence/hooks/useIntelligencePage';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { CorrelationSelector, ViewToggle } from '@/features/correlations/ui';
import { URGENCY_CONFIG } from '@/utils/urgencyUtils';
import CountBadge from '@/components/common/CountBadge';
import EntityDetailPanel from '@/features/intelligence/components/EntityDetailPanel';
import EntityCard from '@/features/intelligence/components/EntityCard';
import EntityListRow from '@/features/intelligence/components/EntityListRow';
import SignalSidebar from '@/features/intelligence/components/SignalSidebar';
import ExpandableFilterSection from '@/components/common/ExpandableFilterSection';
import FilterBanner from '@/components/common/FilterBanner';
import LeftSidebar from '@/components/common/LeftSidebar';
import PageWithSidebar from '@/components/common/PageWithSidebar';
import './Intelligence.css';
import Page from '@/components/common/Page';
import type { UrgencyKey, CorrelationResult } from '@/types';

export default function Intelligence() {
  const [showSidebar, setShowSidebar] = useState(true);

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
    <PageWithSidebar
      sidebar={
        <LeftSidebar title="Filters" show={showSidebar} onToggle={() => setShowSidebar((v) => !v)}>
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
        </LeftSidebar>
      }
      rightPanelOpen={!!selectedSignal}
      rightPanelWidth={280}
    >
      <Page title="News Intelligence">
        <p className="intelligence-description">
          AI-extracted entities, per-entity sentiment, and macro signals from Yahoo news. Click a company to see all
          articles.
        </p>

        {selectedSignal && (
          <FilterBanner label="Filtered by signal:" value={selectedSignal} onClear={() => setSelectedSignal(null)} />
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

      <SignalSidebar selectedSignal={selectedSignal ?? undefined} data={filteredSignals} />
    </PageWithSidebar>
  );
}
