import { useEffect, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, ArrowUp, BookOpen, Bug, Compass, X } from "lucide-react";
import { sendGuideQuestion } from "../data/guideApi";
import { findGuideAgentSources, guideAgentFallback, guideAgentSmallTalk, splitGuideAnswer, type GuideAgentSource } from "../data/guideAgent";
import type { GuideAction } from "../data/guide";
import guideAgentStyles from "./NorthGuideAgent.css?inline";

type GuideAgentMessage = {
  id: string;
  role: "user" | "guide";
  content: string;
  sources?: GuideAgentSource[];
};

type NorthGuideAgentProps = {
  onOpenAction: (action: GuideAction) => void;
  onOpenArticle: (articleId: string) => void;
  onOpenFullGuide: () => void;
  onReportIssue: () => void;
};

const startingQuestions = ["Show me around North", "What can Nova do?", "How do I build a workout?", "Where is my progress?"];

export default function NorthGuideAgent({ onOpenAction, onOpenArticle, onOpenFullGuide, onReportIssue }: NorthGuideAgentProps) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<GuideAgentMessage[]>([]);
  const [thinking, setThinking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  useEffect(() => {
    transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, thinking]);

  async function ask(value: string) {
    const text = value.trim();
    if (!text || thinking) return;
    const smallTalk = guideAgentSmallTalk(text);
    const sources = findGuideAgentSources(text);
    setQuestion("");
    setMessages((current) => [...current, { id: crypto.randomUUID(), role: "user", content: text }]);
    setThinking(true);
    let answer: string;
    if (smallTalk) answer = smallTalk;
    else try {
      answer = await sendGuideQuestion(text, sources);
    } catch {
      answer = guideAgentFallback(text, sources);
    }
    setMessages((current) => [...current, { id: crypto.randomUUID(), role: "guide", content: answer, sources }]);
    setThinking(false);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void ask(question);
  }

  function follow(action: () => void) {
    setOpen(false);
    action();
  }

  return createPortal(<div className={`north-guide-agent${open ? " is-open" : ""}`}><style>{guideAgentStyles}</style>
    {open && <section className="north-guide-panel" role="dialog" aria-modal="false" aria-labelledby="north-guide-agent-title">
      <header className="north-guide-agent-header">
        <span className="north-guide-signal" aria-hidden="true"><Compass size={19}/></span>
        <div><small>NORTH GUIDE</small><strong id="north-guide-agent-title">Find the next useful step.</strong></div>
        <button onClick={() => setOpen(false)} aria-label="Close North Guide"><X size={18}/></button>
      </header>
      <div className="north-guide-transcript" ref={transcriptRef} aria-live="polite">
        {messages.length === 0 && <div className="north-guide-intro">
          <span>ASK NORTH</span>
          <h2>Start anywhere.</h2>
          <p>I can explain North, show you where something lives, or help you decide whether you need Guide or Nova.</p>
          <div>{startingQuestions.map((prompt) => <button key={prompt} onClick={() => void ask(prompt)}>{prompt}<ArrowRight size={14}/></button>)}</div>
        </div>}
        {messages.map((message) => { const answer = splitGuideAnswer(message.content); const List = answer.listType === "ordered" ? "ol" : "ul"; return <article key={message.id} className={`north-guide-message ${message.role}`}>
          <small>{message.role === "guide" ? "GUIDE" : "YOU"}</small>
          {answer.introduction && <p>{answer.introduction}</p>}
          {answer.listType && <List>{answer.items.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</List>}
          {message.role === "guide" && message.sources && message.sources.length > 0 && <div className="north-guide-routes">
            {message.sources[0].action && <button className="north-guide-primary-route" onClick={() => follow(() => onOpenAction(message.sources![0].action!))}>{message.sources[0].action.label}<ArrowRight size={14}/></button>}
            <button onClick={() => follow(() => onOpenArticle(message.sources![0].id))}><BookOpen size={14}/> Read “{message.sources[0].title}”</button>
          </div>}
        </article>; })}
        {thinking && <div className="north-guide-thinking"><i/><i/><i/><span>Finding the clearest route</span></div>}
      </div>
      <form className="north-guide-composer" onSubmit={submit}>
        <input ref={inputRef} value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask how North works…" aria-label="Ask North Guide" maxLength={1200}/>
        <button type="submit" disabled={!question.trim() || thinking} aria-label="Send question"><ArrowUp size={18}/></button>
      </form>
      <footer><button onClick={() => follow(onOpenFullGuide)}><BookOpen size={14}/> Full text Guide</button><button onClick={() => follow(onReportIssue)}><Bug size={14}/> Report an issue</button></footer>
    </section>}
    <button className="north-guide-launcher" onClick={() => setOpen((value) => !value)} aria-label={open ? "Close North Guide" : "Ask North Guide"} aria-expanded={open} title="Ask North Guide"><Compass size={24}/><span aria-hidden="true"/></button>
  </div>, document.body);
}
