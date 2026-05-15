import NewsSection from '@/components/organisms/ticker/NewsSection';
import type { NewsArticle } from '@/types';

type ArticlesTabProps = {
  ticker: string;
  newsArticles?: NewsArticle[];
};

export default function ArticlesTab({ ticker, newsArticles }: ArticlesTabProps) {
  return (
    <section>
      <NewsSection ticker={ticker} news={newsArticles} />
    </section>
  );
}
