import { useDeferredValue, useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, Check, Search } from "lucide-react";
import { guideArticles, guideTopics, type GuideAction, type GuideArticle, type GuideTopic } from "../data/guide";

type NorthGuideProps = {
  onBack: () => void;
  onOpen: (action: GuideAction) => void;
  backLabel: string;
  initialArticleId?: string | null;
};

export default function NorthGuide({ onBack, onOpen, backLabel, initialArticleId }: NorthGuideProps) {
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState<"All" | GuideTopic>("All");
  const [selectedArticle, setSelectedArticle] = useState<GuideArticle | null>(() => guideArticles.find((article) => article.id === initialArticleId) ?? null);
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());
  const articles = guideArticles.filter((article) => {
    const matchesTopic = topic === "All" || article.topic === topic;
    const searchable = `${article.title} ${article.summary} ${article.introduction} ${article.searchTerms.join(" ")}`.toLowerCase();
    return matchesTopic && (!deferredQuery || searchable.includes(deferredQuery));
  });

  if (selectedArticle) {
    return <section className="screen destination-screen guide-screen guide-article-screen">
      <button className="back-button" onClick={() => setSelectedArticle(null)}><ArrowLeft size={17}/> Guide</button>
      <header className="guide-article-header"><p className="eyebrow">{selectedArticle.topic.toUpperCase()}</p><h1>{selectedArticle.title}</h1><p>{selectedArticle.introduction}</p></header>
      <ol className="guide-steps">{selectedArticle.steps.map((step, index) => <li key={step.title}><span>{index + 1}</span><div><h2>{step.title}</h2><p>{step.body}</p></div></li>)}</ol>
      <aside className="guide-remember"><Check size={18}/><div><small>KEEP THIS IN MIND</small><strong>{selectedArticle.remember}</strong></div></aside>
      {selectedArticle.action && <button className="guide-open-action" onClick={() => onOpen(selectedArticle.action!)}>{selectedArticle.action.label}<ArrowRight size={16}/></button>}
    </section>;
  }

  return <section className="screen destination-screen guide-screen">
    <button className="back-button" onClick={onBack}><ArrowLeft size={17}/> {backLabel}</button>
    <header className="guide-heading destination-brand-header destination-brand-guide"><div className="destination-header-copy"><p className="eyebrow destination-eyebrow">NORTH GUIDE</p><h1>Guide</h1><p className="destination-subheading">Take your time.</p><p className="destination-header-detail">Learn North and training in ordinary language. Start anywhere. Nothing here is a test.</p></div><div className="destination-header-actions" aria-hidden="true"><BookOpen size={24}/></div></header>
    <label className="guide-search"><Search size={18}/><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="What would you like help with?" aria-label="Search the North Guide"/>{query && <button onClick={() => setQuery("")} aria-label="Clear Guide search">Clear</button>}</label>
    <nav className="guide-topics" aria-label="Guide topics">{guideTopics.map((item) => <button key={item} className={topic === item ? "active" : ""} aria-pressed={topic === item} onClick={() => setTopic(item)}>{item}</button>)}</nav>
    <div className="guide-results-heading"><strong>{deferredQuery ? `${articles.length} result${articles.length === 1 ? "" : "s"}` : "Choose a place to begin"}</strong><small>{guideArticles.length} guides available</small></div>
    <section className="guide-article-list">{articles.map((article) => <button key={article.id} onClick={() => setSelectedArticle(article)}><span>{article.topic}</span><div><strong>{article.title}</strong><p>{article.summary}</p></div><ArrowRight size={17}/></button>)}{articles.length === 0 && <div className="guide-empty"><BookOpen size={22}/><strong>No guide matched that search.</strong><p>Try a shorter phrase such as “sets”, “plan”, “Samsung”, or “account”.</p></div>}</section>
  </section>;
}