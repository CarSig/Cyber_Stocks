import NewsSection from "@/components/organisms/ticker/NewsSection.jsx";

export default function ArticlesTab({ ticker, newsArticles }) {
  return (
    <section>
      <NewsSection ticker={ticker} news={newsArticles} />
    </section>
  );
}
