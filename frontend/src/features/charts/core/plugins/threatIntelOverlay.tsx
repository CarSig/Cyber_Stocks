import type { ReactNode } from 'react';
import { buildCountMarkers, buildNvdMarkers, NVD_SEVERITY_COLORS } from '../../utils/markers';
import ModalItem from '@/components/common/ModalItem';
import type { ChartPlugin } from '../types';
import type { ThreatIntelItem } from '@/types';

type Variant = 'nvd' | 'otx' | 'kev';

type ThreatIntelOverlayOpts = {
  variant: Variant;
  items: ThreatIntelItem[] | null | undefined;
  /** Override the default plugin id. Useful if you need two of the same variant. */
  id?: string;
  label?: string;
  defaultEnabled?: boolean;
};

const VARIANT_DEFAULTS: Record<Variant, { id: string; label: string }> = {
  nvd: { id: 'nvd', label: 'NVD' },
  otx: { id: 'otx', label: 'OTX' },
  kev: { id: 'kev', label: 'KEV' },
};

/**
 * Marker overlay for NVD / OTX / KEV threat intel items.
 * Ports the per-variant marker building from
 * frontend/src/features/charts/utils/markers.ts so the visuals are identical
 * to the existing StockChart overlays.
 */
export function threatIntelOverlay({
  variant,
  items,
  id,
  label,
  defaultEnabled = false,
}: ThreatIntelOverlayOpts): ChartPlugin {
  const { id: defaultId, label: defaultLabel } = VARIANT_DEFAULTS[variant];
  const pluginId = id ?? defaultId;
  const pluginLabel = label ?? defaultLabel;

  return {
    id: pluginId,
    label: pluginLabel,
    defaultEnabled,
    mount: (ctrl) => {
      const markers = buildMarkersForVariant(variant, items);
      ctrl.setMarkers(pluginId, markers);
      return {
        unmount: () => ctrl.setMarkers(pluginId, []),
      };
    },
    onMarkerClick: ({ date }) => {
      const matches = filterForDate(variant, items, date);
      if (!matches.length) return null;
      return {
        title: `${pluginLabel} — ${date}`,
        body: renderItems(variant, matches),
      };
    },
  };
}

function buildMarkersForVariant(variant: Variant, items: ThreatIntelItem[] | null | undefined) {
  if (!items?.length) return [];
  if (variant === 'nvd') return buildNvdMarkers(items);
  if (variant === 'otx') {
    return buildCountMarkers(items as unknown as Array<Record<string, unknown>>, {
      dateField: 'created',
      position: 'belowBar',
      color: '#3b82f6',
      shape: 'circle',
      label: 'OTX',
    });
  }
  return buildCountMarkers(items as unknown as Array<Record<string, unknown>>, {
    dateField: 'dateAdded',
    position: 'belowBar',
    color: '#f97316',
    shape: 'arrowDown',
    label: 'KEV',
  });
}

function filterForDate(variant: Variant, items: ThreatIntelItem[] | null | undefined, date: string): ThreatIntelItem[] {
  if (!items?.length) return [];
  if (variant === 'nvd') {
    return items.filter((v) => {
      const p = (v as ThreatIntelItem & { published?: string }).published;
      return p?.slice(0, 10) === date;
    });
  }
  if (variant === 'otx') {
    return items.filter((p) => {
      const c = (p as ThreatIntelItem & { created?: string }).created;
      return c?.slice(0, 10) === date;
    });
  }
  return items.filter((v) => (v as ThreatIntelItem & { dateAdded?: string }).dateAdded === date);
}

function renderItems(variant: Variant, items: ThreatIntelItem[]): ReactNode {
  if (variant === 'nvd') {
    return items.map((v, i) => (
      <ModalItem
        key={i}
        href={`https://nvd.nist.gov/vuln/detail/${v.cveId ?? v.cveID}`}
        icon="●"
        iconColor={NVD_SEVERITY_COLORS[v.severity ?? 'UNKNOWN']}
        title={`${v.cveId ?? v.cveID} — ${v.description}`}
        subtitle={v.severity ?? 'UNKNOWN'}
      />
    ));
  }
  if (variant === 'otx') {
    return items.map((p, i) => (
      <ModalItem key={i} icon="●" iconColor="#3b82f6" title={p.name ?? ''} subtitle={p.created?.slice(0, 10)} />
    ));
  }
  return items.map((v, i) => (
    <ModalItem
      key={i}
      href={`https://nvd.nist.gov/vuln/detail/${v.cveID}`}
      icon="▼"
      iconColor="#f97316"
      title={`${v.cveID} — ${v.vulnerabilityName ?? ''}`}
      subtitle={`${v.vendorProject ?? ''} / ${v.product ?? ''}`}
    />
  ));
}
