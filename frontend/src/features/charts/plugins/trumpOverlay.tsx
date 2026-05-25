import { buildTrumpMarkers, SENTIMENT_COLORS } from '../utils/markers';
import ModalItem from './ModalItem';
import type { ChartPlugin } from '../types';
import type { Quote, TrumpPost } from '@/types';

type TrumpOverlayOpts = {
  posts: TrumpPost[] | null | undefined;
  /** Quotes are required to anchor markers to the chart's date range —
   *  matches the existing StockChart behavior of dropping posts older than
   *  the earliest quote. */
  quotes: Quote[];
  defaultEnabled?: boolean;
};

export function trumpOverlay({ posts, quotes, defaultEnabled = false }: TrumpOverlayOpts): ChartPlugin {
  return {
    id: 'trump',
    label: 'Trump',
    defaultEnabled,
    mount: (ctrl) => {
      const markers = buildTrumpMarkers(posts, quotes);
      ctrl.setMarkers('trump', markers);
      return {
        unmount: () => ctrl.setMarkers('trump', []),
      };
    },
    onMarkerClick: ({ date }) => {
      if (!posts?.length) return null;
      const matches = posts.filter((p) => p.created_at?.slice(0, 10) === date);
      if (!matches.length) return null;
      return {
        title: `Trump — ${date}`,
        body: matches.map((p, i) => {
          const s = p.sentiment ?? 'neutral';
          return (
            <ModalItem
              key={i}
              icon={s === 'positive' ? '▲' : s === 'negative' ? '▼' : '●'}
              iconColor={SENTIMENT_COLORS[s]}
              title={p.content}
              subtitle={p.created_at?.slice(0, 16).replace('T', ' ')}
            />
          );
        }),
      };
    },
  };
}
