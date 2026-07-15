import { useEffect, useRef, useState, type ReactNode } from "react";

const INTRO_VERSION = "north-brand-intro-v1";

function prefersReducedMotion() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

export function BootIntro({ children, ready = true }: { children: ReactNode; ready?: boolean }) {
  const [intro] = useState<"first" | "everyday">(() => localStorage.getItem(INTRO_VERSION) ? "everyday" : "first");
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!ready) return;
    const reduced = prefersReducedMotion();
    const duration = reduced ? 180 : intro === "first" ? 2800 : 860;
    if (intro === "first") localStorage.setItem(INTRO_VERSION, new Date().toISOString());
    const timer = window.setTimeout(() => setVisible(false), duration);
    return () => window.clearTimeout(timer);
  }, [intro, ready]);

  return <>{children}{visible && <div className={`north-boot-intro ${intro}`} role="status" aria-label="North is opening">
    <div className="north-boot-lockup">
      <img className="north-boot-stacked north-boot-stacked-light" src="/png/transparent/lockup-stacked-teal.png" alt="North" />
      <img className="north-boot-stacked north-boot-stacked-dark" src="/png/transparent/lockup-stacked-offwhite.png" alt="North" />
    </div>
    <i className="north-grain" aria-hidden="true" />
  </div>}</>;
}

export function BrandLoader({ label = "North is working", compact = false }: { label?: string; compact?: boolean }) {
  return <span className={`north-brand-loader${compact ? " compact" : ""}`} role="status" aria-label={label}>
    <span><img className="north-loader-light" src="/png/transparent/lockup-stacked-teal.png" alt="" /><img className="north-loader-dark" src="/png/transparent/lockup-stacked-offwhite.png" alt="" /></span>
    {!compact && <small>{label}</small>}
  </span>;
}

export function LoginBrandReveal({ onDone }: { onDone: () => void }) {
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    const timer = window.setTimeout(() => onDoneRef.current(), prefersReducedMotion() ? 120 : 900);
    return () => window.clearTimeout(timer);
  }, []);
  return <div className="north-login-reveal" aria-hidden="true"><img src="/png/transparent/lockup-stacked-offwhite.png" alt="" /></div>;
}
