import { useState, type MouseEvent } from "react";
import humanFrontBack from "../assets/anatomy/north-human-front-back-v1.png";

export type MuscleRole = "primary" | "secondary" | "supporting";

export type AnatomyMapProps = {
  primary?: string[];
  secondary?: string[];
  supporting?: string[];
  compact?: boolean;
  showBack?: boolean;
  label?: string;
  visibility?: "primary" | "all";
};

type MuscleRegion = "chest" | "front-delts" | "side-delts" | "rear-delts" | "biceps" | "triceps" | "forearms" | "abs" | "obliques" | "traps" | "lats" | "lower-back" | "glutes" | "quads" | "adductors" | "hamstrings" | "calves" | "tibialis";

const muscleNames: Record<MuscleRegion, string> = {
  chest: "Chest", "front-delts": "Front shoulders", "side-delts": "Side shoulders", "rear-delts": "Rear shoulders", biceps: "Biceps", triceps: "Triceps", forearms: "Forearms", abs: "Abs", obliques: "Side core", traps: "Upper back", lats: "Lats", "lower-back": "Lower back", glutes: "Glutes", quads: "Front thighs", adductors: "Inner thighs", hamstrings: "Back thighs", calves: "Calves", tibialis: "Front lower legs",
};

const muscleInsights: Record<MuscleRegion, string> = {
  chest: "Moves your upper arms across your body and drives pressing movements.", "front-delts": "Help raise the arms forward and assist most pressing movements.", "side-delts": "Lift the arms out to the sides and build shoulder width.", "rear-delts": "Pull the upper arms backward and help keep the shoulders balanced.", biceps: "Bend the elbow and help turn the palm upward.", triceps: "Straighten the elbow during presses, pushdowns and overhead extensions.", forearms: "Control grip and help stabilise the wrist during loaded movements.", abs: "Brace the trunk and help control the position of the ribs and pelvis.", obliques: "Resist twisting and side-bending while helping transfer force through the trunk.", traps: "Support the shoulder blades and help control shrugging, pulling and overhead work.", lats: "Pull the upper arms down and back during rows and pulldowns.", "lower-back": "Helps keep the spine steady during hinges, carries and loaded standing work.", glutes: "Extend and stabilise the hips during squats, hinges, running and climbing.", quads: "Straighten the knees and do much of the work in squats, lunges and leg presses.", adductors: "Pull the thighs inward and help stabilise the hips in wide or single-leg positions.", hamstrings: "Bend the knees and extend the hips during hinges, running and leg curls.", calves: "Push through the forefoot and help propel walking, running and jumping.", tibialis: "Lifts the front of the foot and helps control each step as the heel lands.",
};

const categoryRegions: Record<string, MuscleRegion[]> = {
  chest: ["chest"], back: ["lats", "traps", "lower-back"], shoulders: ["front-delts", "side-delts", "rear-delts"], biceps: ["biceps"], triceps: ["triceps"],
  quads: ["quads"], hamstrings: ["hamstrings"], glutes: ["glutes"], calves: ["calves"], core: ["abs", "obliques"],
  "full body": ["chest", "front-delts", "lats", "abs", "glutes", "quads", "hamstrings"], conditioning: ["abs", "quads", "hamstrings", "calves"], mobility: ["front-delts", "lats", "obliques", "glutes", "hamstrings"],
};

const companionRegions: Partial<Record<MuscleRegion, MuscleRegion[]>> = {
  chest: ["triceps", "front-delts"], lats: ["biceps", "rear-delts"], traps: ["rear-delts"], "front-delts": ["triceps"], biceps: ["forearms"], triceps: ["front-delts"], quads: ["glutes", "calves"], hamstrings: ["glutes", "calves"], glutes: ["hamstrings", "quads"], abs: ["obliques"],
};

function regionsFor(values: string[] = []) {
  return Array.from(new Set(values.flatMap((value) => categoryRegions[value.toLowerCase()] ?? [value.toLowerCase() as MuscleRegion])));
}

function roleMap(primary: string[], secondary: string[], supporting: string[]) {
  const result = new Map<MuscleRegion, MuscleRole>();
  regionsFor(supporting).forEach((region) => result.set(region, "supporting"));
  regionsFor(secondary).forEach((region) => result.set(region, "secondary"));
  regionsFor(primary).forEach((region) => result.set(region, "primary"));
  if (!secondary.length) regionsFor(primary).flatMap((region) => companionRegions[region] ?? []).forEach((region) => { if (!result.has(region)) result.set(region, "secondary"); });
  return result;
}

function Figure({ side, roles, selected, onSelect }: { side: "front" | "back"; roles: Map<MuscleRegion, MuscleRole>; selected?: MuscleRegion; onSelect: (region: MuscleRegion) => void }) {
  const cls = (region: MuscleRegion) => `anatomy-muscle region-${region} ${roles.get(region) ?? "inactive"}${selected === region ? " selected" : ""}`;
  const selectFromFigure = (event: MouseEvent<SVGSVGElement>) => {
    const regionClass = (event.target as Element).classList ? [...(event.target as Element).classList].find((name) => name.startsWith("region-")) : undefined;
    if (regionClass) onSelect(regionClass.replace("region-", "") as MuscleRegion);
  };
  return <div className={`anatomy-human-figure ${side}`} role="img" aria-label={`${side} muscle view`} style={{ backgroundImage: `url(${humanFrontBack})` }}><svg className="anatomy-figure" viewBox="0 0 180 360" preserveAspectRatio="none" aria-hidden="true" onClick={selectFromFigure}>
    {side === "front" ? <g>
      <path className={cls("front-delts")} d="M57 72Q43 76 40 93Q50 101 61 91L66 77Z" /><path className={cls("front-delts")} d="M123 72Q137 76 140 93Q130 101 119 91L114 77Z" />
      <path className={cls("side-delts")} d="M54 75Q43 80 41 91L48 100L59 91L62 79Z" /><path className={cls("side-delts")} d="M126 75Q137 80 139 91L132 100L121 91L118 79Z" />
      <path className={cls("chest")} d="M50 75Q65 63 87 69V105Q67 109 48 94Z" /><path className={cls("chest")} d="M93 69Q115 63 130 75L132 94Q113 109 93 105Z" />
      <path className={cls("biceps")} d="M43 99Q52 96 57 103L51 146Q43 149 37 143Z" /><path className={cls("biceps")} d="M137 99Q128 96 123 103L129 146Q137 149 143 143Z" />
      <path className={cls("forearms")} d="M36 149L49 151L37 207L26 204Z" /><path className={cls("forearms")} d="M144 149L131 151L143 207L154 204Z" />
      <path className={cls("abs")} d="M75 108H88V128H73ZM92 108H105L107 128H92ZM73 133H88V155H70ZM92 133H107L110 155H92ZM72 160H88V184H68ZM92 160H108L112 184H92Z" />
      <path className={cls("obliques")} d="M52 103L72 111L67 181L51 157Z" /><path className={cls("obliques")} d="M128 103L108 111L113 181L129 157Z" />
      <path className={cls("quads")} d="M51 191Q70 185 87 201L83 280H57Q47 236 51 191Z" /><path className={cls("quads")} d="M129 191Q110 185 93 201L97 280H123Q133 236 129 191Z" />
      <path className={cls("adductors")} d="M75 194L88 202L85 270L70 238Z" /><path className={cls("adductors")} d="M105 194L92 202L95 270L110 238Z" />
      <path className={cls("calves")} d="M55 282Q69 276 84 285L80 332H64Q51 305 55 282Z" /><path className={cls("calves")} d="M125 282Q111 276 96 285L100 332H116Q129 305 125 282Z" />
      <path className={cls("tibialis")} d="M61 282L78 285L74 329H59Z" /><path className={cls("tibialis")} d="M119 282L102 285L106 329H121Z" />
    </g> : <g>
      <path className={cls("traps")} d="M70 61L87 56L88 101L64 86Z" /><path className={cls("traps")} d="M110 61L93 56L92 101L116 86Z" />
      <path className={cls("rear-delts")} d="M59 72Q44 77 41 94Q51 101 62 91L67 77Z" /><path className={cls("rear-delts")} d="M121 72Q136 77 139 94Q129 101 118 91L113 77Z" />
      <path className={cls("lats")} d="M51 88Q68 84 87 104V169Q69 164 53 148L43 105Z" /><path className={cls("lats")} d="M129 88Q112 84 93 104V169Q111 164 127 148L137 105Z" />
      <path className={cls("triceps")} d="M43 99Q53 97 58 104L51 148Q42 149 37 142Z" /><path className={cls("triceps")} d="M137 99Q127 97 122 104L129 148Q138 149 143 142Z" />
      <path className={cls("lower-back")} d="M73 159L88 170V195L66 186Z" /><path className={cls("lower-back")} d="M107 159L92 170V195L114 186Z" />
      <path className={cls("glutes")} d="M49 191Q69 181 87 197V228Q67 235 47 217Z" /><path className={cls("glutes")} d="M131 191Q111 181 93 197V228Q113 235 133 217Z" />
      <path className={cls("hamstrings")} d="M52 226Q70 220 87 232L82 285H55Q45 250 52 226Z" /><path className={cls("hamstrings")} d="M128 226Q110 220 93 232L98 285H125Q135 250 128 226Z" />
      <path className={cls("calves")} d="M54 282Q69 277 84 287L80 333H62Q49 305 54 282Z" /><path className={cls("calves")} d="M126 282Q111 277 96 287L100 333H118Q131 305 126 282Z" />
    </g>}
  </svg></div>;
}

export default function AnatomyMap({ primary = [], secondary = [], supporting = [], compact = false, showBack = true, label = "Muscle focus", visibility = "all" }: AnatomyMapProps) {
  const [selected, setSelected] = useState<MuscleRegion>();
  const roles = roleMap(primary, secondary, supporting);
  if (visibility === "primary") roles.forEach((role, region) => { if (role !== "primary") roles.delete(region); });
  return <div className={`anatomy-map ${compact ? "compact" : "detailed"}`}>
    <div className="anatomy-figures"><div><small>FRONT</small><Figure side="front" roles={roles} selected={selected} onSelect={(region) => setSelected((current) => current === region ? undefined : region)} /></div>{showBack && <div><small>BACK</small><Figure side="back" roles={roles} selected={selected} onSelect={(region) => setSelected((current) => current === region ? undefined : region)} /></div>}</div>
    {compact ? <span className="anatomy-caption">{label}</span> : <><div className="anatomy-legend"><span><i className="primary" />Primary</span><span><i className="secondary" />Secondary</span><span><i className="supporting" />Supporting</span></div><div className="anatomy-muscle-list">{[...roles.entries()].map(([region, role]) => <button type="button" aria-pressed={selected === region} key={region} className={`${role}${selected === region ? " selected" : ""}`} onClick={() => setSelected((current) => current === region ? undefined : region)}><i /> <span>{muscleNames[region]}</span><small>Learn</small></button>)}</div>{selected && <p className={`anatomy-selection ${roles.get(selected)}`}><strong>{muscleNames[selected]}</strong>{muscleInsights[selected]}</p>}</>}
  </div>;
}
