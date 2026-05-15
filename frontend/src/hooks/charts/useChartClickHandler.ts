import { useEffect, type RefObject } from 'react';
import type { IChartApi } from 'lightweight-charts';
import { useSyncRef } from './useOverlayRefs';
import type { OverlayRefs } from './useOverlayRefs';
import type { ThreatIntelItem, TrumpPost, NewsArticle } from '@/types';

type MarkerModal = {
  type: string;
  date: string;
  items: unknown[];
};

export function useChartClickHandler(
  chartRef: RefObject<IChartApi | null>,
  overlayRefs: OverlayRefs,
  setMarkerModal: (modal: MarkerModal | null) => void,
): void {
  const setMarkerModalRef = useSyncRef(setMarkerModal);

  useEffect(() => {
    if (!chartRef.current) return;
    const {
      trumpPostsRef,
      showTrumpRef,
      nvdVulnsRef,
      showNvdRef,
      otxPulsesRef,
      showOtxRef,
      kevItemsRef,
      showKevRef,
      newsArticlesRef,
      newsAnalysisRef,
      showNewsRef,
    } = overlayRefs;

    chartRef.current.subscribeClick((param) => {
      if (!param.time) return;
      const date =
        typeof param.time === 'string' ? param.time : new Date(Number(param.time) * 1000).toISOString().slice(0, 10);

      if (showNewsRef.current) {
        const items = (newsArticlesRef.current ?? []).filter((a: NewsArticle) => {
          if (!a.providerPublishTime || !a.link) return false;
          const ts = a.providerPublishTime;
          const d = new Date(
            typeof ts === 'number' || (typeof ts === 'string' && /^\d{10}$/.test(ts)) ? Number(ts) * 1000 : ts,
          )
            .toISOString()
            .slice(0, 10);
          return d === date && (newsAnalysisRef.current?.[a.link]?.sentiment ?? null) !== null;
        });
        if (items.length) {
          setMarkerModalRef.current?.({ type: 'news', date, items });
          return;
        }
      }

      const overlays: Array<{
        showRef: RefObject<boolean | undefined>;
        dataRef: RefObject<unknown[] | undefined>;
        type: string;
        filter: (item: unknown) => boolean;
      }> = [
        {
          showRef: showTrumpRef,
          dataRef: trumpPostsRef as RefObject<unknown[] | undefined>,
          type: 'trump',
          filter: (p) => (p as TrumpPost).created_at?.slice(0, 10) === date,
        },
        {
          showRef: showNvdRef,
          dataRef: nvdVulnsRef as RefObject<unknown[] | undefined>,
          type: 'nvd',
          filter: (v) => ((v as ThreatIntelItem & { published?: string }).published)?.slice(0, 10) === date,
        },
        {
          showRef: showOtxRef,
          dataRef: otxPulsesRef as RefObject<unknown[] | undefined>,
          type: 'otx',
          filter: (p) => ((p as ThreatIntelItem & { created?: string }).created)?.slice(0, 10) === date,
        },
        {
          showRef: showKevRef,
          dataRef: kevItemsRef as RefObject<unknown[] | undefined>,
          type: 'kev',
          filter: (v) => (v as ThreatIntelItem & { dateAdded?: string }).dateAdded === date,
        },
      ];
      for (const { showRef, dataRef, type: t, filter } of overlays) {
        if (!showRef.current) continue;
        const items = (dataRef.current ?? []).filter(filter);
        if (items.length) {
          setMarkerModalRef.current?.({ type: t, date, items });
          return;
        }
      }
    });
  }, [chartRef]); // eslint-disable-line react-hooks/exhaustive-deps
}
