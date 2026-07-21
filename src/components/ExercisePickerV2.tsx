import { Plus, Search, SlidersHorizontal, X } from "lucide-react";
import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { canonicalExerciseDatabase } from "../exerciseDatabase/validation";
import { productionExerciseLibrary } from "../exerciseDatabase/libraryExercises";
import { searchExercises } from "../exerciseDatabase/search";
import { categories, equipment, exerciseTypes, movementPatterns, muscles, trackingTemplates } from "../exerciseDatabase/taxonomies";
import type { Exercise } from "../exerciseDatabase/types";

const database = canonicalExerciseDatabase(productionExerciseLibrary);

type Props = {
	onAdd: (exercise: Exercise) => void;
	onView?: (exercise: Exercise) => void;
	addedIds?: string[];
	limit?: number;
};

const bodyAreas = [
	{ id: "chest", label: "Chest", muscleId: "chest" },
	{ id: "back", label: "Back", muscleId: "back" },
	{ id: "shoulders", label: "Shoulders", muscleId: "shoulders" },
	{ id: "biceps", label: "Biceps", muscleId: "biceps_brachii" },
	{ id: "triceps", label: "Triceps", muscleId: "triceps_brachii" },
	{ id: "core", label: "Core", muscleId: "core" },
	{ id: "glutes", label: "Glutes", muscleId: "gluteus_maximus" },
	{ id: "quads", label: "Quads", muscleId: "quadriceps" },
	{ id: "hamstrings", label: "Hamstrings", muscleId: "hamstrings" },
	{ id: "calves", label: "Calves", muscleId: "lower_leg" },
	{ id: "full_body", label: "Full body" },
	{ id: "cardio", label: "Cardio" },
	{ id: "mobility", label: "Mobility" },
];

const quickFilters = [
	["no_equipment", "No equipment"],
	["low_impact", "Low impact"],
	["beginner", "Beginner"],
	["timed", "Timed holds"],
	["cardio", "Cardio"],
	["unilateral", "Left / right"],
] as const;

const musclesById = new Map(muscles.map((muscle) => [muscle.id, muscle]));

const isMuscleOrDescendant = (muscleId: string, ancestorId: string) => {
	let current = musclesById.get(muscleId);
	while (current) {
		if (current.id === ancestorId) return true;
		current = current.parentMuscleGroupId ? musclesById.get(current.parentMuscleGroupId) : undefined;
	}
	return false;
};

const bodyAreaFor = (exercise: Exercise) => {
	if (exercise.categoryId === "full_body_strength") return "Full body";
	if (exercise.categoryId === "cardio") return "Cardio";
	if (exercise.categoryId === "mobility") return "Mobility";
	return bodyAreas.find((area) => area.muscleId && exercise.muscles.some((muscle) => muscle.role === "primary" && isMuscleOrDescendant(muscle.muscleId, area.muscleId)))?.label ?? "Strength";
};

const matchesBodyArea = (exercise: Exercise, bodyAreaId: string) => {
	const area = bodyAreas.find((item) => item.id === bodyAreaId);
	if (!area) return true;
	if (area.id === "full_body") return exercise.categoryId === "full_body_strength";
	if (area.id === "cardio") return exercise.categoryId === "cardio";
	if (area.id === "mobility") return exercise.categoryId === "mobility";
	return Boolean(area.muscleId && exercise.muscles.some((muscle) => muscle.role === "primary" && isMuscleOrDescendant(muscle.muscleId, area.muscleId)));
};

export function ExercisePickerV2({ onAdd, onView, addedIds = [], limit = 100 }: Props) {
	const [query, setQuery] = useState("");
	const [bodyArea, setBodyArea] = useState("");
	const [muscle, setMuscle] = useState("");
	const [equipmentId, setEquipment] = useState("");
	const [pattern, setPattern] = useState("");
	const [difficulty, setDifficulty] = useState("");
	const [type, setType] = useState("");
	const [position, setPosition] = useState("");
	const [place, setPlace] = useState("");
	const [quick, setQuick] = useState<string[]>([]);
	const [filtersOpen, setFiltersOpen] = useState(false);

	const toggle = (id: string) => setQuick((active) => active.includes(id) ? active.filter((value) => value !== id) : [...active, id]);
	const clearFilters = () => {
		setBodyArea("");
		setMuscle("");
		setEquipment("");
		setPattern("");
		setDifficulty("");
		setType("");
		setPosition("");
		setPlace("");
		setQuick([]);
	};
	const activeFilterCount = [bodyArea, muscle, equipmentId, pattern, difficulty, type, position, place].filter(Boolean).length + quick.length;

	const matchingResults = useMemo(() => searchExercises(database, query, {
		equipmentIds: equipmentId ? [equipmentId] : undefined,
		movementPatternId: pattern || undefined,
		difficulty: difficulty as Exercise["difficulty"] || undefined,
		exerciseType: type as Exercise["exerciseType"] || undefined,
	})
		.filter(({ exercise }) => !bodyArea || matchesBodyArea(exercise, bodyArea))
		.filter(({ exercise }) => !muscle || exercise.muscles.some((item) => item.muscleId === muscle))
		.filter(({ exercise }) => !position || exercise.bodyPositionIds.includes(position))
		.filter(({ exercise }) => !place || exercise.equipment.every((item) => equipment.find((entry) => entry.id === item.equipmentId)?.suitability.includes(place as "home" | "gym" | "outdoor")))
		.filter(({ exercise }) => !quick.includes("no_equipment") || exercise.equipment.every((item) => item.equipmentId === "bodyweight"))
		.filter(({ exercise }) => !quick.includes("low_impact") || exercise.accessibilityTags.includes("low_impact"))
		.filter(({ exercise }) => !quick.includes("beginner") || exercise.difficulty === "beginner" || exercise.accessibilityTags.includes("beginner_friendly"))
		.filter(({ exercise }) => !quick.includes("timed") || exercise.timedHold)
		.filter(({ exercise }) => !quick.includes("cardio") || exercise.cardio)
		.filter(({ exercise }) => !quick.includes("unilateral") || exercise.unilateral), [query, bodyArea, muscle, equipmentId, pattern, difficulty, type, position, place, quick]);

	const results = matchingResults.slice(0, limit);
	const select = (label: string, value: string, onChange: (value: string) => void, items: Array<{ id: string; label: string }>) => (
		<label>
			<span>{label}</span>
			<select value={value} onChange={(event) => onChange(event.target.value)}>
				<option value="">All</option>
				{items.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
			</select>
		</label>
	);

	const filterControls = <>
		<div className="exercise-filter-grid">
			{select("Body area", bodyArea, setBodyArea, bodyAreas.map(({ id, label }) => ({ id, label })))}
			{select("Equipment", equipmentId, setEquipment, equipment.map((item) => ({ id: item.id, label: item.displayName })))}
			{select("Movement", pattern, setPattern, movementPatterns.map((item) => ({ id: item.id, label: item.displayName })))}
			{select("Difficulty", difficulty, setDifficulty, ["beginner", "intermediate", "advanced"].map((id) => ({ id, label: id })))}
			{select("Type", type, setType, exerciseTypes.map((id) => ({ id, label: id.replaceAll("_", " ") })))}
			{select("Position", position, setPosition, [...new Set(productionExerciseLibrary.flatMap((item) => item.bodyPositionIds))].map((id) => ({ id, label: id.replaceAll("_", " ") })))}
			{select("Place", place, setPlace, ["home", "gym", "outdoor"].map((id) => ({ id, label: id })))}
			{select("Target muscle", muscle, setMuscle, muscles.filter((item) => item.parentMuscleGroupId).map((item) => ({ id: item.id, label: item.commonName })))}
		</div>
		<div className="picker-quick-filters">
			{quickFilters.map(([id, label]) => <button type="button" key={id} className={quick.includes(id) ? "active" : ""} onClick={() => toggle(id)}>{label}</button>)}
		</div>
	</>;

	return <section className="exercise-picker-v2">
		<label className="search-field">
			<Search size={17} />
			<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${productionExerciseLibrary.length} exercises, body areas or equipment`} />
		</label>

		{createPortal(<button type="button" className="picker-mobile-filter-rail" onClick={() => setFiltersOpen(true)} aria-expanded={filtersOpen} aria-controls="exercise-picker-filters">
			<SlidersHorizontal size={16} />
			<span>Filters{activeFilterCount ? ` · ${activeFilterCount}` : ""}</span>
		</button>, document.body)}

		<div className="exercise-filter-desktop">{filterControls}</div>
		{createPortal(<div className={`exercise-filter-overlay${filtersOpen ? " is-open" : ""}`} id="exercise-picker-filters">
			<button type="button" className="exercise-filter-scrim" aria-label="Close filters" onClick={() => setFiltersOpen(false)} />
			<aside className="exercise-filter-drawer" aria-label="Exercise filters">
				<header className="exercise-filter-drawer-header">
					<div><small>Refine your list</small><strong>Filters</strong></div>
					<div>
						{activeFilterCount > 0 && <button type="button" className="picker-filter-clear" onClick={clearFilters}>Clear</button>}
						<button type="button" className="picker-filter-close" onClick={() => setFiltersOpen(false)} aria-label="Close filters"><X size={18} /></button>
					</div>
				</header>
				{filterControls}
			</aside>
		</div>, document.body)}

		<p className="result-count">{matchingResults.length}{matchingResults.length > limit ? ` matching · showing the first ${limit}` : " shown"} · filters update instantly</p>
		<div className="picker-v2-results">
			{results.length ? results.map(({ exercise }) => {
				const gear = exercise.equipment.map((item) => equipment.find((entry) => entry.id === item.equipmentId)?.displayName).filter(Boolean).slice(0, 2);
				const category = categories.find((item) => item.id === exercise.categoryId)?.name;
				const tracking = trackingTemplates.find((item) => item.id === exercise.trackingTemplateId)?.name;
				return <article key={exercise.id}>
					<button type="button" className="picker-v2-main" onClick={() => onView?.(exercise)}>
						<strong>{exercise.displayName}</strong>
						<span>{gear.join(" + ")} · {bodyAreaFor(exercise)}</span>
						<small>{category} · {exercise.difficulty} · {tracking}</small>
					</button>
					<button type="button" className="picker-v2-add" disabled={addedIds.includes(exercise.id)} onClick={() => onAdd(exercise)} aria-label={`Add ${exercise.displayName}`}><Plus size={17} /></button>
				</article>;
			}) : <p className="picker-v2-empty">No exercises match these filters.</p>}
		</div>
	</section>;
}
