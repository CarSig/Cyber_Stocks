import { useState } from "react";
import { useBackendEntities, useAllSentimentCorrelations, useGlobalSignals } from "@/hooks/useIntelligence.js";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner.jsx";
import { CorrelationSelector, ViewToggle } from "@/components/shared/CorrelationControls.jsx";
import { URGENCY_CONFIG } from "@/utils/urgencyUtils.js";
import indexBy from "@/utils/indexBy.js";
import CountBadge from "@/components/atoms/CountBadge.jsx";
import EntityDetailPanel from "@/components/organisms/intelligence/EntityDetailPanel.jsx";
import EntityCard from "@/components/organisms/cards/entity/EntityCard.jsx";
import EntityListRow from "@/components/molecules/intelligence/EntityListRow.jsx";
import SignalSidebar from "@/components/molecules/intelligence/SignalSidebar.jsx";
import ExpandableFilterSection from "@/components/molecules/shared/ExpandableFilterSection.jsx";
import "./Intelligence.css";
import Page from "@/components/atoms/Page.jsx";

export default function Intelligence() {
  const [selected, setSelected] = useState(null);
  const [selectedSignal, setSelectedSignal] = useState(null);
  const [selectedUrgency, setSelectedUrgency] = useState(null);
  const [urgencyCounts, setUrgencyCounts] = useState({});
  const [lagDays, setLagDays] = useState(1);
  const [viewMode, setViewMode] = useState("list");
  const [signalsExpanded, setSignalsExpanded] = useState(true);
  const [urgencyExpanded, setUrgencyExpanded] = useState(true);
  const { data: entities, isPending } = useBackendEntities();
  const { data: correlations } = useAllSentimentCorrelations(lagDays, selectedSignal);
  const { data: allSignals, isPending: signalsLoading } = useGlobalSignals();

  const uniqueEntities = entities
    ? [...new Map(entities.map((e) => [e.entityId, e])).values()]
    : [];

  const correlationByEntityId = indexBy(correlations, "entityId");
  const filteredSignals = allSignals?.filter((s) => s.count >= 5) ?? [];
  const displayedEntities = uniqueEntities;

  return (
    <div className="intelligence-sidebar">
      {/* Left Sidebar - Filters */}
      <div className="intelligence-left-sidebar">
        <h2 className="intelligence-left-sidebar-title">Filters</h2>

        <ExpandableFilterSection title="Signals" icon="📡" isExpanded={signalsExpanded} onToggle={() => setSignalsExpanded((e) => !e)} loading={signalsLoading}>
          {filteredSignals?.slice(0, 15).map((s) => (
            <div
              key={s.signalType}
              onClick={() => setSelectedSignal(selectedSignal === s.signalType ? null : s.signalType)}
              className={`sidebar-signal-item ${selectedSignal === s.signalType ? "sidebar-signal-item-active" : ""}`}
            >
              <span className="sidebar-signal-item-name">{s.signalType}</span>
              <CountBadge count={s.count} className="sidebar-signal-item-count" />
            </div>
          ))}
        </ExpandableFilterSection>

        <ExpandableFilterSection title="Urgency" icon="⏱" isExpanded={urgencyExpanded} onToggle={() => setUrgencyExpanded((e) => !e)}>
          <div className="sidebar-urgency-list">
            {["now", "today", "recent", "future_short", "future_long", "past"].map((key) => {
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
                    background: isActive ? cfg.bg : "transparent",
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

      {/* Main Content */}
      <div className="intelligence-main-content" style={{ paddingRight: selectedSignal ? 300 : 0 }}>
        <Page title="News Intelligence">
          <p className="intelligence-description">
            AI-extracted entities, per-entity sentiment, and macro signals from Yahoo news. Click a company to see all articles.
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
          ) : viewMode === "grid" ? (
            <div className="ti-grid" style={{ marginBottom: 32 }}>
              {displayedEntities.map((e) => (
                <EntityCard key={e.entityId} entity={e} onClick={() => setSelected(e.entityId)} signal={selectedSignal} correlation={correlationByEntityId[e.entityId]} />
              ))}
            </div>
          ) : (
            <div style={{ marginBottom: 32 }}>
              {displayedEntities.map((e) => (
                <EntityListRow key={e.entityId} entity={e} onClick={() => setSelected(e.entityId)} signal={selectedSignal} correlation={correlationByEntityId[e.entityId]} />
              ))}
            </div>
          )}

          {selected && (
            <EntityDetailPanel
              entityId={selected}
              onClose={() => setSelected(null)}
              signal={selectedSignal}
              urgencyFilter={selectedUrgency}
              onUrgencyChange={setSelectedUrgency}
              onUrgencyCounts={setUrgencyCounts}
            />
          )}
        </Page>
      </div>

      {/* Right Sidebar - Selected Signal Details */}
      <SignalSidebar selectedSignal={selectedSignal} data={filteredSignals} />
    </div>
  );
}
