import { useEffect } from "react";
import { useSyncRef } from "./useOverlayRefs.js";

// Wires the chart click listener that opens the marker detail modal.
export function useChartClickHandler(chartRef, overlayRefs, setMarkerModal) {
  const setMarkerModalRef = useSyncRef(setMarkerModal);

  useEffect(() => {
    if (!chartRef.current) return;
    const { trumpPostsRef, showTrumpRef, nvdVulnsRef, showNvdRef, otxPulsesRef, showOtxRef, kevItemsRef, showKevRef, newsArticlesRef, newsAnalysisRef, showNewsRef } = overlayRefs;

    chartRef.current.subscribeClick((param) => {
      if (!param.time) return;
      const date = typeof param.time === "string" ? param.time : new Date(param.time * 1000).toISOString().slice(0, 10);

      if (showNewsRef.current) {
        const items = (newsArticlesRef.current ?? []).filter((a) => {
          if (!a.providerPublishTime || !a.link) return false;
          const ts = a.providerPublishTime;
          const d = new Date(typeof ts === "number" || (typeof ts === "string" && /^\d{10}$/.test(ts)) ? Number(ts) * 1000 : ts).toISOString().slice(0, 10);
          return d === date && (newsAnalysisRef.current?.[a.link]?.sentiment ?? null) !== null;
        });
        if (items.length) { setMarkerModalRef.current({ type: "news", date, items }); return; }
      }

      const overlays = [
        { showRef: showTrumpRef, dataRef: trumpPostsRef, type: "trump", filter: (p) => p.created_at?.slice(0, 10) === date },
        { showRef: showNvdRef,   dataRef: nvdVulnsRef,   type: "nvd",   filter: (v) => v.published?.slice(0, 10) === date },
        { showRef: showOtxRef,   dataRef: otxPulsesRef,  type: "otx",   filter: (p) => p.created?.slice(0, 10) === date },
        { showRef: showKevRef,   dataRef: kevItemsRef,   type: "kev",   filter: (v) => v.dateAdded === date },
      ];
      for (const { showRef, dataRef, type: t, filter } of overlays) {
        if (!showRef.current) continue;
        const items = (dataRef.current ?? []).filter(filter);
        if (items.length) { setMarkerModalRef.current({ type: t, date, items }); return; }
      }
    });
  }, [chartRef]); // re-wire when chart rebuilds — overlayRefs/setMarkerModalRef are stable refs // eslint-disable-line react-hooks/exhaustive-deps
}
