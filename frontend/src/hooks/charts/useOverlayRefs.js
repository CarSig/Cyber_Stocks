import { useEffect, useRef } from "react";

export function useSyncRef(value) {
  const ref = useRef(value);
  useEffect(() => { ref.current = value; }, [value]);
  return ref;
}

export function useOverlayRefs({ trump = {}, nvd = {}, otx = {}, kev = {}, news = {} }) {
  return {
    trumpPostsRef:   useSyncRef(trump.posts),
    showTrumpRef:    useSyncRef(trump.show),
    nvdVulnsRef:     useSyncRef(nvd.data),
    showNvdRef:      useSyncRef(nvd.show),
    otxPulsesRef:    useSyncRef(otx.data),
    showOtxRef:      useSyncRef(otx.show),
    kevItemsRef:     useSyncRef(kev.data),
    showKevRef:      useSyncRef(kev.show),
    newsArticlesRef: useSyncRef(news.articles),
    newsAnalysisRef: useSyncRef(news.analysis),
    showNewsRef:     useSyncRef(news.show),
  };
}
