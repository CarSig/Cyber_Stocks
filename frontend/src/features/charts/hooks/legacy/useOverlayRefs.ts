import { type RefObject } from 'react';
import type { TrumpPost, ThreatIntelItem, NewsArticle, NewsAnalysisMap } from '@/types';
// Re-exported for back-compat with imports that took `useSyncRef` from here.
// New code should import from '../useSyncRef' directly.
import { useSyncRef } from '../useSyncRef';
export { useSyncRef };

type TrumpOverlay = { posts?: TrumpPost[]; show?: boolean };
type DataOverlay<T> = { data?: T[]; show?: boolean };
type NewsOverlay = { articles?: NewsArticle[]; analysis?: NewsAnalysisMap; show?: boolean };

type OverlayConfig = {
  trump?: TrumpOverlay;
  nvd?: DataOverlay<ThreatIntelItem>;
  otx?: DataOverlay<ThreatIntelItem>;
  kev?: DataOverlay<ThreatIntelItem>;
  news?: NewsOverlay;
};

export type OverlayRefs = {
  trumpPostsRef: RefObject<TrumpPost[] | undefined>;
  showTrumpRef: RefObject<boolean | undefined>;
  nvdVulnsRef: RefObject<ThreatIntelItem[] | undefined>;
  showNvdRef: RefObject<boolean | undefined>;
  otxPulsesRef: RefObject<ThreatIntelItem[] | undefined>;
  showOtxRef: RefObject<boolean | undefined>;
  kevItemsRef: RefObject<ThreatIntelItem[] | undefined>;
  showKevRef: RefObject<boolean | undefined>;
  newsArticlesRef: RefObject<NewsArticle[] | undefined>;
  newsAnalysisRef: RefObject<NewsAnalysisMap | undefined>;
  showNewsRef: RefObject<boolean | undefined>;
};

export function useOverlayRefs({ trump = {}, nvd = {}, otx = {}, kev = {}, news = {} }: OverlayConfig): OverlayRefs {
  return {
    trumpPostsRef: useSyncRef(trump.posts),
    showTrumpRef: useSyncRef(trump.show),
    nvdVulnsRef: useSyncRef(nvd.data),
    showNvdRef: useSyncRef(nvd.show),
    otxPulsesRef: useSyncRef(otx.data),
    showOtxRef: useSyncRef(otx.show),
    kevItemsRef: useSyncRef(kev.data),
    showKevRef: useSyncRef(kev.show),
    newsArticlesRef: useSyncRef(news.articles),
    newsAnalysisRef: useSyncRef(news.analysis),
    showNewsRef: useSyncRef(news.show),
  };
}
