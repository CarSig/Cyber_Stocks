import NewsSection from "../../../components/organisms/NewsSection.jsx";

export default function ArticlesTab({ ticker, newsArticles }) {
  return (
    <section>
      <NewsSection ticker={ticker} news={newsArticles} />
    </section>
  );
}
