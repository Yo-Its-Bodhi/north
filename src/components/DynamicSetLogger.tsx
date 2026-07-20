import type { Exercise, ExerciseTrackingTemplate, TrackingField } from "../exerciseDatabase/types";
import type { LoggedTrackingSet, UnitPreferences } from "../exerciseDatabase/trackingEngine";
import { Check } from "lucide-react";

type Props = { exercise: Exercise; template: ExerciseTrackingTemplate; sets: LoggedTrackingSet[]; preferences: UnitPreferences; onChange: (index: number, patch: Partial<LoggedTrackingSet>) => void; onComplete: (index: number) => void; };

function fieldUnit(field: TrackingField, preferences: UnitPreferences) {
	if (field.units.includes(preferences.weight)) return preferences.weight;
	if (field.units.includes(preferences.distance)) return preferences.distance;
	if (field.units.includes(preferences.shortDistance)) return preferences.shortDistance;
	return field.defaultUnit;
}

export function DynamicSetLogger({ template, sets, preferences, onChange, onComplete }: Props) {
	const fields = template.fields.filter((field) => field.required);
	const gridTemplateColumns = `34px repeat(${fields.length}, minmax(0, 1fr)) minmax(72px, .8fr) 44px`;

	function updateValue(index: number, field: TrackingField, value: string) {
		const set = sets[index];
		const values = { ...(set.values ?? {}), [field.id]: value };
		if (template.supportsSides) {
			values[`${field.id}_left`] = value;
			values[`${field.id}_right`] = value;
		}
		onChange(index, { values, ...(field.id === "weight" ? { weight: value } : {}), ...(field.id === "reps" ? { reps: value } : {}) });
	}

	return <section className="sets-table dynamic-sets-table">
		<div className="set-row set-head dynamic-set-row" style={{ gridTemplateColumns }}><span>SET</span>{fields.map((field) => <span key={field.id}>{field.label.toUpperCase()}</span>)}<span>REST</span><span>DONE</span></div>
		{sets.map((set, index) => <div key={index} className={`set-row dynamic-set-row ${set.complete ? "set-complete" : ""}`} style={{ gridTemplateColumns }}>
			<strong>{index + 1}</strong>
			{fields.map((field) => <label key={field.id} className="dynamic-set-field"><input type="number" inputMode="decimal" min={field.minimum} max={field.maximum} value={String(set.values?.[field.id] ?? (field.id === "weight" ? set.weight ?? "" : field.id === "reps" ? set.reps ?? "" : ""))} onChange={(event) => updateValue(index, field, event.target.value)} aria-label={`Set ${index + 1} ${field.label}`} /><small>{fieldUnit(field, preferences).replaceAll("_", "/")}</small></label>)}
			<label className="dynamic-set-field"><input type="number" inputMode="numeric" min="0" value={set.restSeconds ?? 0} onChange={(event) => onChange(index, { restSeconds: Number(event.target.value) || 0 })} aria-label={`Set ${index + 1} rest in seconds`} /><small>sec</small></label>
			<button className="set-check" type="button" onClick={() => onComplete(index)} aria-label={`${set.complete ? "Mark incomplete" : "Complete"} set ${index + 1}`}>{set.complete && <Check size={18} />}</button>
		</div>)}
	</section>;
}
