import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Download, Footprints, Share2, Trophy, X } from "lucide-react";
import "./TrainingAtlas.css";

export type AtlasRecord = {
  id: string;
  date: string;
  title: string;
  kind: "strength" | "run" | "bike" | "walk" | "mobility";
  minutes: number;
  reps: number;
  volume: number;
  distance: number;
};

type Range = "week" | "month" | "quarter" | "year" | "all";
type Metric = "sessions" | "minutes" | "reps" | "volume" | "distance";
type RecapFormat = "square" | "story" | "landscape";
type Totals = { sessions: number; minutes: number; reps: number; volume: number; distance: number };
type Bucket = Totals & { key: string; label: string; start: Date; end: Date; records: AtlasRecord[] };

const ranges: Array<{ id: Range; label: string }> = [
  { id: "week", label: "Week" }, { id: "month", label: "Month" }, { id: "quarter", label: "Quarter" },
  { id: "year", label: "Year" }, { id: "all", label: "All time" },
];
const metrics: Array<{ id: Metric; label: string }> = [
  { id: "sessions", label: "Sessions" }, { id: "minutes", label: "Minutes" }, { id: "reps", label: "Reps" },
  { id: "volume", label: "Volume" }, { id: "distance", label: "Distance" },
];
const formatSize: Record<RecapFormat, [number, number]> = { square: [1080, 1080], story: [1080, 1920], landscape: [1600, 900] };
const day = 86_400_000;

function startOfWeek(value: Date) { const date = new Date(value); date.setHours(0, 0, 0, 0); date.setDate(date.getDate() - ((date.getDay() + 6) % 7)); return date; }
function addDays(value: Date, amount: number) { const date = new Date(value); date.setDate(date.getDate() + amount); return date; }
function iso(value: Date) { return value.toISOString().slice(0, 10); }
function total(records: AtlasRecord[]): Totals {
  return records.reduce((sum, record) => ({ sessions: sum.sessions + 1, minutes: sum.minutes + record.minutes, reps: sum.reps + record.reps, volume: sum.volume + record.volume, distance: sum.distance + record.distance }), { sessions: 0, minutes: 0, reps: 0, volume: 0, distance: 0 });
}
function formatValue(metric: Metric, value: number, weightUnit: string, distanceUnit: string) {
  if (metric === "volume") return `${Math.round(value).toLocaleString()} ${weightUnit}`;
  if (metric === "distance") return `${value.toFixed(1)} ${distanceUnit}`;
  return Math.round(value).toLocaleString();
}

function currentWeekStreak(records: AtlasRecord[]) {
  if (!records.length) return 0;
  const recordedWeeks = new Set(records.map((record) => iso(startOfWeek(new Date(`${record.date}T12:00:00`)))));
  let cursor = startOfWeek(new Date());
  if (!recordedWeeks.has(iso(cursor))) cursor = addDays(cursor, -7);
  let streak = 0;
  while (recordedWeeks.has(iso(cursor))) { streak += 1; cursor = addDays(cursor, -7); }
  return streak;
}

function periodKey(range: Range, date: string) {
  const value = new Date(`${date}T12:00:00`);
  if (range === "week") return iso(startOfWeek(value));
  if (range === "month") return date.slice(0, 7);
  if (range === "quarter") return `${value.getFullYear()}-Q${Math.floor(value.getMonth() / 3) + 1}`;
  if (range === "year") return date.slice(0, 4);
  return "all";
}

function chartComparisonKey(range: Range, date: string) {
  if (range === "week") return date;
  if (range === "month" || range === "quarter") return iso(startOfWeek(new Date(`${date}T12:00:00`)));
  return date.slice(0, 7);
}

function periodBounds(range: Range, offset: number, records: AtlasRecord[]) {
  const now = new Date(); now.setHours(12, 0, 0, 0);
  if (range === "all") {
    const dates = records.map((record) => new Date(`${record.date}T12:00:00`).getTime()).filter(Number.isFinite);
    const start = dates.length ? new Date(Math.min(...dates)) : startOfWeek(now);
    return { start, end: now, label: "All recorded training" };
  }
  if (range === "week") { const start = addDays(startOfWeek(now), offset * 7); return { start, end: addDays(start, 6), label: offset === 0 ? "This week" : start.toLocaleDateString("en", { month: "short", day: "numeric" }) }; }
  if (range === "month") { const start = new Date(now.getFullYear(), now.getMonth() + offset, 1, 12); return { start, end: new Date(start.getFullYear(), start.getMonth() + 1, 0, 12), label: start.toLocaleDateString("en", { month: "long", year: "numeric" }) }; }
  if (range === "quarter") { const quarter = Math.floor(now.getMonth() / 3) + offset; const start = new Date(now.getFullYear(), quarter * 3, 1, 12); return { start, end: new Date(start.getFullYear(), start.getMonth() + 3, 0, 12), label: `Q${Math.floor(start.getMonth() / 3) + 1} ${start.getFullYear()}` }; }
  const start = new Date(now.getFullYear() + offset, 0, 1, 12); return { start, end: new Date(start.getFullYear(), 11, 31, 12), label: String(start.getFullYear()) };
}

function makeBuckets(range: Range, start: Date, end: Date, records: AtlasRecord[]): Bucket[] {
  const count = range === "week" ? 7 : range === "month" ? 5 : range === "quarter" ? 13 : range === "year" ? 12 : 10;
  const span = Math.max(1, end.getTime() - start.getTime() + day);
  return Array.from({ length: count }, (_, index) => {
    let bucketStart: Date; let bucketEnd: Date; let label: string;
    if (range === "week") { bucketStart = addDays(start, index); bucketEnd = bucketStart; label = bucketStart.toLocaleDateString("en", { weekday: "short" }).slice(0, 2); }
    else if (range === "year") { bucketStart = new Date(start.getFullYear(), index, 1, 12); bucketEnd = new Date(start.getFullYear(), index + 1, 0, 12); label = bucketStart.toLocaleDateString("en", { month: "short" }); }
    else {
      bucketStart = new Date(start.getTime() + span * index / count);
      bucketEnd = new Date(start.getTime() + span * (index + 1) / count - day);
      label = range === "quarter" ? `W${index + 1}` : bucketStart.toLocaleDateString("en", { month: "short", day: "numeric" });
    }
    const items = records.filter((record) => record.date >= iso(bucketStart) && record.date <= iso(bucketEnd));
    return { key: `${iso(bucketStart)}-${index}`, label, start: bucketStart, end: bucketEnd, records: items, ...total(items) };
  });
}

export default function TrainingAtlas({ records, weightUnit, distanceUnit, onOpenDate }: { records: AtlasRecord[]; weightUnit: string; distanceUnit: string; onOpenDate: (date: string) => void }) {
  const [range, setRange] = useState<Range>("month");
  const [metric, setMetric] = useState<Metric>("sessions");
  const [offset, setOffset] = useState(0);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [recapOpen, setRecapOpen] = useState(false);
  const [recapFormat, setRecapFormat] = useState<RecapFormat>("square");
  const [recapStats, setRecapStats] = useState<Metric[]>(["sessions", "minutes", "volume"]);
  const bounds = useMemo(() => periodBounds(range, offset, records), [range, offset, records]);
  const periodRecords = useMemo(() => records.filter((record) => record.date >= iso(bounds.start) && record.date <= iso(bounds.end)), [records, bounds]);
  const previousStart = new Date(bounds.start.getTime() - (bounds.end.getTime() - bounds.start.getTime() + day));
  const previousRecords = records.filter((record) => record.date >= iso(previousStart) && record.date < iso(bounds.start));
  const totals = total(periodRecords); const previousTotals = total(previousRecords);
  const buckets = useMemo(() => makeBuckets(range, bounds.start, bounds.end, periodRecords), [range, bounds, periodRecords]);
  const previousBuckets = useMemo(() => makeBuckets(range, previousStart, addDays(bounds.start, -1), previousRecords), [range, previousStart, bounds.start, previousRecords]);
  const maxValue = Math.max(1, ...buckets.map((bucket) => bucket[metric]), ...previousBuckets.map((bucket) => bucket[metric]));
  const selected = buckets.find((bucket) => bucket.key === selectedKey) ?? null;
  const currentValue = totals[metric]; const priorValue = previousTotals[metric];
  const change = priorValue ? Math.round((currentValue - priorValue) / priorValue * 100) : null;
  const weekStreak = currentWeekStreak(records);
  const historicalPeriods = new Map<string, AtlasRecord[]>();
  records.forEach((record) => { const key = periodKey(range, record.date); historicalPeriods.set(key, [...(historicalPeriods.get(key) ?? []), record]); });
  const personalHigh = range !== "all" && currentValue > 0 && currentValue >= Math.max(...[...historicalPeriods.values()].map((items) => total(items)[metric]));
  const historicalChartValues = new Map<string, number>();
  records.forEach((record) => { const key = chartComparisonKey(range, record.date); historicalChartValues.set(key, (historicalChartValues.get(key) ?? 0) + total([record])[metric]); });
  const chartPersonalHigh = Math.max(0, ...historicalChartValues.values());
  const composition = (["strength", "run", "bike", "walk", "mobility"] as const).map((kind) => ({ kind, value: periodRecords.filter((record) => record.kind === kind).length })).filter((item) => item.value);
  const compositionTotal = composition.reduce((sum, item) => sum + item.value, 0);
  const colors = ["var(--blue)", "#d46a3a", "#2465ad", "#58a676", "#b38a32"];
  let angle = 0; const donut = composition.map((item, index) => { const start = angle; angle += item.value / compositionTotal * 360; return `${colors[index]} ${start}deg ${angle}deg`; }).join(", ");
  const weekdayCounts = new Map<string, number>(); periodRecords.forEach((record) => { const label = new Date(`${record.date}T12:00:00`).toLocaleDateString("en", { weekday: "long" }); weekdayCounts.set(label, (weekdayCounts.get(label) ?? 0) + 1); });
  const mostActiveDay = [...weekdayCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  const insights = [
    periodRecords.length >= 3 && mostActiveDay ? `${mostActiveDay[0]} is your most active day in this period, with ${mostActiveDay[1]} sessions.` : "",
    previousTotals.sessions > 0 && totals.sessions !== previousTotals.sessions ? `Training frequency ${totals.sessions > previousTotals.sessions ? "increased" : "decreased"} ${Math.abs(Math.round((totals.sessions - previousTotals.sessions) / previousTotals.sessions * 100))}% from the previous period.` : "",
    composition.length > 1 ? `${composition.sort((a, b) => b.value - a.value)[0].kind[0].toUpperCase() + composition.sort((a, b) => b.value - a.value)[0].kind.slice(1)} made up the largest share of recorded activity.` : "",
  ].filter(Boolean);

  function changeRange(next: Range) { setRange(next); setOffset(0); setSelectedKey(null); }
  function toggleRecapStat(stat: Metric) { setRecapStats((current) => current.includes(stat) ? current.filter((item) => item !== stat) : current.length < 3 ? [...current, stat] : current); }
  function exportRecap() {
    const [width, height] = formatSize[recapFormat]; const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height;
    const context = canvas.getContext("2d"); if (!context) return;
    const accent = getComputedStyle(document.documentElement).getPropertyValue("--blue").trim() || "#2563eb";
    context.fillStyle = "#f7faf9"; context.fillRect(0, 0, width, height); context.fillStyle = accent; context.fillRect(0, 0, width, Math.round(height * .12));
    context.globalAlpha = .08; context.fillStyle = accent; context.beginPath(); context.arc(width * .84, height * .28, width * .28, 0, Math.PI * 2); context.fill(); context.globalAlpha = 1;
    const inset = width * .08; context.fillStyle = "#ffffff"; context.font = `800 ${width * .032}px sans-serif`; context.fillText("NORTH / TRAINING ATLAS", inset, height * .075);
    context.fillStyle = accent; context.font = `800 ${width * .026}px sans-serif`; context.fillText(bounds.label.toUpperCase(), inset, height * .2);
    context.fillStyle = "#17343b"; context.font = `700 ${width * .064}px sans-serif`; context.fillText(personalHigh ? "A personal-high period." : `${totals.sessions} sessions recorded.`, inset, height * .29);
    recapStats.forEach((stat, index) => { const y = height * (.4 + index * .1); context.fillStyle = "#5d7478"; context.font = `700 ${width * .022}px sans-serif`; context.fillText(metrics.find((item) => item.id === stat)!.label.toUpperCase(), inset, y); context.fillStyle = "#17343b"; context.font = `800 ${width * .045}px sans-serif`; context.fillText(formatValue(stat, totals[stat], weightUnit, distanceUnit), inset + width * .25, y); });
    const chartTop = height * .72; buckets.forEach((bucket, index) => { const barWidth = width * .65 / buckets.length; const barHeight = Math.max(5, bucket[metric] / maxValue * height * .13); context.fillStyle = accent; context.fillRect(inset + index * barWidth, chartTop - barHeight, barWidth * .58, barHeight); });
    context.globalAlpha = .14; context.fillStyle = accent; context.font = `900 ${width * .18}px sans-serif`; context.fillText("N", width * .73, height * .88); context.globalAlpha = 1;
    context.fillStyle = "#17343b"; context.font = `700 ${width * .022}px sans-serif`; context.fillText("north.bodhix.io", inset, height * .93);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `north-training-recap-${recapFormat}.png`;
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, "image/png");
  }

  return <section className="training-atlas" aria-labelledby="training-atlas-title">
    <header className="atlas-heading"><div><p className="eyebrow">TRAINING ATLAS</p><h2 id="training-atlas-title">Understand the shape of your work.</h2><p>Explore what changed, then choose what is worth carrying forward.</p></div><button className="atlas-recap-launch" onClick={() => setRecapOpen(true)}><Share2 size={16}/> Create recap</button></header>
    <div className="atlas-range" aria-label="Atlas period">{ranges.map((item) => <button key={item.id} className={range === item.id ? "active" : ""} onClick={() => changeRange(item.id)}>{item.label}</button>)}</div>
    <div className="atlas-period"><button aria-label="Previous period" disabled={range === "all"} onClick={() => { setOffset((value) => value - 1); setSelectedKey(null); }}><ChevronLeft/></button><strong>{bounds.label}</strong><button aria-label="Next period" disabled={range === "all" || offset >= 0} onClick={() => { setOffset((value) => value + 1); setSelectedKey(null); }}><ChevronRight/></button></div>
    <section className="atlas-snapshot" aria-label="Period snapshot">
      {(["sessions", "minutes", "volume", "distance"] as Metric[]).map((item) => <article key={item}><small>{metrics.find((entry) => entry.id === item)!.label}</small><strong>{formatValue(item, totals[item], weightUnit, distanceUnit)}</strong>{item === metric && change !== null ? <span className={change >= 0 ? "positive" : "negative"}>{change >= 0 ? "+" : ""}{change}% vs previous</span> : <span>{item === "sessions" ? `${new Set(periodRecords.map((record) => record.date)).size} active days` : "Recorded total"}</span>}</article>)}
      <article><small>Current streak</small><strong>{weekStreak ? `${weekStreak} wk` : "—"}</strong><span>{weekStreak ? "consecutive active weeks" : "No active week yet"}</span></article>
      <article className={personalHigh ? "personal-high" : ""}><small>Personal high</small><strong>{personalHigh ? <><Trophy size={17}/> This period</> : "Building"}</strong><span>{personalHigh ? `Highest ${metric}` : "More periods add context"}</span></article>
    </section>
    <div className="atlas-metrics" aria-label="Chart metric">{metrics.map((item) => <button key={item.id} className={metric === item.id ? "active" : ""} onClick={() => { setMetric(item.id); setSelectedKey(null); }}>{item.label}</button>)}</div>
    <section className="atlas-chart" aria-label={`${bounds.label} ${metric} chart`}>
      {buckets.map((bucket, index) => { const details = `${bucket.label}: ${bucket.sessions} session${bucket.sessions === 1 ? "" : "s"}, ${bucket.minutes} minutes, ${bucket.reps} reps, ${formatValue("volume", bucket.volume, weightUnit, distanceUnit)} volume, ${formatValue("distance", bucket.distance, weightUnit, distanceUnit)}`; return <button key={bucket.key} className={selectedKey === bucket.key ? "selected" : ""} title={details} aria-label={`${details}. Open activities.`} onClick={() => setSelectedKey((value) => value === bucket.key ? null : bucket.key)}><span className="atlas-bars"><i className="comparison" style={{ height: `${Math.max(2, previousBuckets[index]?.[metric] / maxValue * 100)}%` }}/><i className="current" style={{ height: `${Math.max(3, bucket[metric] / maxValue * 100)}%` }}/>{bucket[metric] > 0 && bucket[metric] >= chartPersonalHigh && <Footprints className="atlas-best" size={13}/>}</span><small>{bucket.label}</small></button>; })}
    </section>
    <div className="atlas-legend"><span><i/>Selected period</span><span><i/>Previous period</span>{change !== null && <em className={change >= 0 ? "positive" : "negative"}>{change >= 0 ? "+" : ""}{change}%</em>}<b>{formatValue(metric, currentValue, weightUnit, distanceUnit)}</b></div>
    {selected && <section className="atlas-drilldown"><header><div><small>PERIOD ACTIVITIES</small><strong>{selected.label} · {selected.records.length} recorded</strong></div><button onClick={() => setSelectedKey(null)} aria-label="Close period activities"><X size={16}/></button></header>{selected.records.length ? selected.records.map((record) => <button key={record.id} onClick={() => onOpenDate(record.date)}><span className={`atlas-kind ${record.kind}`}/><div><strong>{record.title}</strong><small>{record.kind} · {record.minutes} min</small></div><ChevronRight size={15}/></button>) : <p>No recorded activities in this part of the period.</p>}</section>}
    <section className="atlas-lower">
      <div className="atlas-observations"><p className="eyebrow">WHAT CHANGED</p><h3>Evidence from this period</h3>{insights.length ? insights.map((insight) => <p key={insight}>{insight}</p>) : <p>North needs repeated activity across periods before it describes a change.</p>}</div>
      <div className="atlas-composition"><p className="eyebrow">ACTIVITY COMPOSITION</p><h3>How the period was made</h3>{compositionTotal ? <div><span className="atlas-donut" role="img" style={{ background: `conic-gradient(${donut})` }} aria-label={`Activity composition: ${composition.map((item) => `${item.kind} ${item.value}`).join(", ")}`}/><ul>{composition.map((item, index) => <li key={item.kind}><i style={{ background: colors[index] }}/><span>{item.kind}</span><strong>{Math.round(item.value / compositionTotal * 100)}%</strong></li>)}</ul></div> : <p>No activity composition is available for this period.</p>}</div>
    </section>
    {recapOpen && <section className="atlas-recap" aria-label="North recap composer"><header><div><p className="eyebrow">NORTH RECAP</p><h3>Share the work, not the private context.</h3></div><button aria-label="Close recap composer" onClick={() => setRecapOpen(false)}><X/></button></header><p>Account identity, bodyweight, recovery and exact activity dates are always excluded.</p><div className="atlas-format" aria-label="Recap format">{(["square", "story", "landscape"] as RecapFormat[]).map((format) => <button key={format} className={recapFormat === format ? "active" : ""} onClick={() => setRecapFormat(format)}>{format === "square" ? "1:1 Square" : format === "story" ? "9:16 Story" : "16:9 Landscape"}</button>)}</div><fieldset><legend>Choose up to three statistics</legend>{metrics.map((item) => <label key={item.id}><input type="checkbox" checked={recapStats.includes(item.id)} disabled={!recapStats.includes(item.id) && recapStats.length >= 3} onChange={() => toggleRecapStat(item.id)}/><span>{item.label}<small>{formatValue(item.id, totals[item.id], weightUnit, distanceUnit)}</small></span></label>)}</fieldset><button className="atlas-export" disabled={!recapStats.length} onClick={exportRecap}><Download size={17}/> Export private-safe PNG</button></section>}
  </section>;
}
