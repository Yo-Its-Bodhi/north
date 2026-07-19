import type { Exercise, ExerciseTrackingTemplate, TrackingField } from "../exerciseDatabase/types";
import type { LoggedTrackingSet, UnitPreferences } from "../exerciseDatabase/trackingEngine";

type Props = { exercise: Exercise; template: ExerciseTrackingTemplate; sets: LoggedTrackingSet[]; preferences: UnitPreferences; onChange: (index: number, patch: Partial<LoggedTrackingSet>) => void; onComplete: (index: number) => void; };

function fieldUnit(field: TrackingField, preferences: UnitPreferences) {
	if (field.units.includes(preferences.weight)) return preferences.weight;
	if (field.units.includes(preferences.distance)) return preferences.distance;
	if (field.units.includes(preferences.shortDistance)) return preferences.shortDistance;
	return field.defaultUnit;
}

export function DynamicSetLogger({ template, sets, preferences, onChange, onComplete }: Props) {
	const fields = template.fields.filter((field) => field.required);

	function updateValue(index: number, field: TrackingField, value: string) {
		const set = sets[index];
		const values = { ...(set.values ?? {}), [field.id]: value };
		if (template.supportsSides) {
			values[`${field.id}_left`] = value;
			values[`${field.id}_right`] = value;
		}
		onChange(index, { values, ...(field.id === "weight" ? { weight: value } : {}), ...(field.id === "reps" ? { reps: value } : {}) });
	}

	return <section className="simple-set-logger">
		{sets.map((set, index) => <article key={index} className={set.complete ? "complete" : ""}>
			<header><strong>Set {index + 1}</strong><button type="button" onClick={() => onComplete(index)}>{set.complete ? "Complete" : "Complete"}</button></header>
			<div className={`simple-set-fields fields-${Math.min(fields.length, 3)}`}>
				{fields.map((field) => <label key={field.id}><span>{field.label}</span><div><input type="number" inputMode="decimal" min={field.minimum} max={field.maximum} value={String(set.values?.[field.id] ?? (field.id === "weight" ? set.weight ?? "" : field.id === "reps" ? set.reps ?? "" : ""))} onChange={(event) => updateValue(index, field, event.target.value)} /><small>{fieldUnit(field, preferences).replaceAll("_", "/")}</small></div></label>)}
			</div>
			<label className="simple-set-rest"><span>Rest</span><div><input type="number" inputMode="numeric" min="0" value={set.restSeconds ?? 0} onChange={(event) => onChange(index, { restSeconds: Number(event.target.value) || 0 })} /><small>sec</small></div></label>
		</article>)}
	</section>;
}
