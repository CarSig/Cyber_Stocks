import { buildNewsMarkers } from '../utils/markers';
import { sentimentScoreStyle } from '../utils/colors';
import ModalItem from './ModalItem';
import type { ChartPlugin } from '../types';
import type { Quote, NewsArticle, NewsAnalysisMap } from '@/types';

type NewsOverlayOpts = {
  articles: NewsArticle[] | null | undefined;
  analysis: NewsAnalysisMap | null | undefined;
  /** Trading-day calendar used to snap weekend/holiday news onto the next
   *  trading day. Mirrors the existing StockChart marker behavior. */
  quotes: Quote[];
  defaultEnabled?: boolean;
};

export function newsOverlay({ articles, analysis, quotes, defaultEnabled = false }: NewsOverlayOpts): ChartPlugin {
  return {
    id: 'news',
    label: 'News',
    defaultEnabled,
    mount: (ctrl) => {
      const markers = buildNewsMarkers(articles, analysis, quotes);
      ctrl.setMarkers('news', markers);
      return {
        unmount: () => ctrl.setMarkers('news', []),
      };
    },
    onMarkerClick: ({ date }) => {
      if (!articles?.length) return null;
      const matches = articles.filter((a) => {
        if (!a.providerPublishTime || !a.link) return false;
        const ts = a.providerPublishTime;
        const d = new Date(
          typeof ts === 'number' || (typeof ts === 'string' && /^\d{10}$/.test(ts)) ? Number(ts) * 1000 : ts,
        )
          .toISOString()
          .slice(0, 10);
        return d === date && (analysis?.[a.link]?.sentiment ?? null) !== null;
      });
      if (!matches.length) return null;
      return {
        title: `News — ${date}`,
        body: matches.map((a) => {
          const score = analysis?.[a.link]?.sentiment ?? null;
          const { color, icon } = sentimentScoreStyle(score);
          return (
            <ModalItem
              key={a.link}
              href={a.link}
              icon={icon}
              iconColor={color}
              title={a.title}
              subtitle={a.publisher}
            />
          );
        }),
      };
    },
  };
}
