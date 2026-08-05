import { Component, createElement, lazy, StrictMode, Suspense, useEffect, type ErrorInfo, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/dm-sans/latin-400.css";
import "@fontsource/dm-sans/latin-500.css";
import "@fontsource/dm-sans/latin-600.css";
import "@fontsource/dm-sans/latin-700.css";
import "@fontsource/manrope/latin-600.css";
import "@fontsource/manrope/latin-700.css";
import "@fontsource/barlow-condensed/latin-600.css";
import "@fontsource/barlow-condensed/latin-700.css";
import "@fontsource/barlow-condensed/latin-800.css";
import App from "./App";
import { BootIntro } from "./components/BrandMotion";
import { hydratePublishedCatalogue } from "./data/catalogue";
import "./styles/runtime-01.css";
import "./styles/runtime-02.css";
import "./styles/runtime-03.css";
import "./styles/runtime-04.css";
import "./styles/runtime-05.css";
import "./styles/runtime-06.css";
import "./styles/runtime-07.css";
import "./trophy-room.css";
import "./destination-reliability.css";
import "./product-tour.css";

const Admin = lazy(() => import("./Admin"));
const MuscleMapPreview = lazy(() => import("./components/MuscleMapPreview"));

export function NorthRoot() {
  const admin = location.pathname.startsWith("/admin");
  const musclePreview = import.meta.env.DEV && location.pathname.startsWith("/dev/muscle-map");
  useEffect(() => {
    if (admin || musclePreview) return;
    void hydratePublishedCatalogue();
  }, [admin, musclePreview]);
  return <BootIntro><Suspense fallback={null}>{createElement(musclePreview ? MuscleMapPreview : admin ? Admin : App)}</Suspense></BootIntro>;
}

class NorthErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error("North render failed", error, info); }
  render() {
    if (!this.state.failed) return this.props.children;
    return <main style={{ minHeight: "100dvh", padding: 32, display: "grid", placeContent: "center", color: "#13243a", background: "#f3f6fa", fontFamily: "system-ui" }}><section style={{ maxWidth: 440, padding: 28, borderRadius: 24, background: "white", boxShadow: "0 20px 60px rgba(20,47,78,.12)" }}><strong style={{ letterSpacing: ".18em" }}>NORTH</strong><h1>North needs a quick refresh.</h1><p>Your account and saved records are safe. A previous app version may still be open on this device.</p><button style={{ width: "100%", minHeight: 50, border: 0, borderRadius: 14, color: "white", background: "#087cf0", fontWeight: 700 }} onClick={() => location.reload()}>Reload North</button></section></main>;
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <NorthErrorBoundary><NorthRoot /></NorthErrorBoundary>
  </StrictMode>,
);

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" });
      void registration.update();
    } catch (error) {
      console.warn("North offline support could not start", error);
    }
  });
}
