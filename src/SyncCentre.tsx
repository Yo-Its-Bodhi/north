import { Database, RotateCcw } from "lucide-react";
import type { SyncConflict } from "./data/northDb";
import type { SyncResult } from "./data/sync";

type Props = {
  expanded: boolean; online: boolean; syncing: boolean; error: string; result: SyncResult | null;
  conflicts: SyncConflict[]; lastSyncedAt: string; onSync: () => void;
  onResolve: (conflict: SyncConflict, choice: "local" | "remote") => void;
};

const date = (value: string) => new Intl.DateTimeFormat("en-CA", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

export default function SyncCentre({ expanded, online, syncing, error, result, conflicts, lastSyncedAt, onSync, onResolve }: Props) {
  if (!expanded && online && !error && (result?.pending ?? 0) === 0 && conflicts.length === 0) return null;
  const title = !online ? "Offline · changes stay safe here" : syncing ? "Syncing your North…" : conflicts.length ? "A sync decision needs you" : (result?.pending ?? 0) > 0 ? `${result?.pending} change${result?.pending === 1 ? "" : "s"} waiting to sync` : "Your North is synced";
  return <section className={`sync-centre ${expanded ? "expanded" : "compact"} ${!online ? "offline" : error ? "attention" : ""}`}>
    <header><span><Database size={18} /></span><div><strong>{title}</strong><small>{lastSyncedAt ? `Last successful sync ${date(lastSyncedAt)}` : "Waiting for the first successful account sync"}{result?.failed ? ` · ${result.failed} retrying` : ""}</small></div><button onClick={onSync} disabled={syncing || !online}><RotateCcw size={16} />{syncing ? "Working" : "Sync now"}</button></header>
    {error && <p role="status">{error}</p>}
    {expanded && <div className="sync-facts"><span><strong>{result?.pending ?? 0}</strong>Pending</span><span><strong>{result?.failed ?? 0}</strong>Retrying</span><span><strong>{conflicts.length}</strong>Decisions</span><span><strong>{online ? "Online" : "Offline"}</strong>Connection</span></div>}
    {expanded && conflicts.length > 0 && <div className="member-conflicts"><p className="eyebrow">CHOOSE WHICH VERSION TO KEEP</p>{conflicts.map((conflict) => <article key={conflict.conflictId}><div><strong>{conflict.collection.replaceAll("-", " ")}</strong><small>This device changed it {date(conflict.local.updatedAt)}; the account version changed {date(conflict.remote.updatedAt)}.</small></div><button onClick={() => onResolve(conflict, "local")} disabled={syncing}>Keep this device</button><button onClick={() => onResolve(conflict, "remote")} disabled={syncing}>Keep account version</button></article>)}</div>}
  </section>;
}
