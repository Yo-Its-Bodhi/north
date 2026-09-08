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
		const existingValue = set.values?.[field.id] ?? "";
		const hasLegacyWeight = field.id === "weight" && Boolean(set.weight);
		const unit = existingValue || hasLegacyWeight ? set.units?.[field.id] ?? (hasLegacyWeight ? "lb" : fieldUnit(field, preferences)) : fieldUnit(field, preferences);
		const values = { ...(set.values ?? {}), [field.id]: value };
		if (template.supportsSides) {
			values[`${field.id}_left`] = value;
			values[`${field.id}_right`] = value;
		}
		const canonicalWeight = field.id === "weight" && value ? String(unit === "kg" ? Number(value) / 0.45359237 : Number(value)) : undefined;
		onChange(index, { values, units: { ...(set.units ?? {}), [field.id]: unit }, ...(canonicalWeight !== undefined ? { weight: canonicalWeight } : {}), ...(field.id === "reps" ? { reps: value } : {}) });
	}

	return <section className="sets-table dynamic-sets-table">
		<div className="set-row set-head dynamic-set-row" style={{ gridTemplateColumns }}><span>SET</span>{fields.map((field) => <span key={field.id}>{field.label.toUpperCase()}</span>)}<span>REST</span><span>DONE</span></div>
		{sets.map((set, index) => {
			const missingCount = fields.filter((field) => {
				const value = set.values?.[field.id] ?? (field.id === "weight" ? set.weight : field.id === "reps" ? set.reps : "");
				return !value || value === "0" || value === 0;
			}).length;
			return <div key={index} className={`set-row dynamic-set-row ${set.complete ? "set-complete" : ""} ${missingCount > 0 ? "set-has-missing" : ""}`} style={{ gridTemplateColumns }}>
				<strong title={missingCount > 0 ? `⚠️ ${missingCount} missing fields` : ""}>{index + 1}</strong>
				{fields.map((field) => {
					const value = set.values?.[field.id] ?? (field.id === "weight" ? set.weight ?? "" : field.id === "reps" ? set.reps ?? "" : "");
					const unit = value ? set.units?.[field.id] ?? (field.id === "weight" && set.weight ? "lb" : fieldUnit(field, preferences)) : fieldUnit(field, preferences);
					const isMissing = !value || value === "0" || value === 0;
					return <label key={field.id} className={`dynamic-set-field ${isMissing ? "field-missing" : ""}`}><input type="number" inputMode="decimal" min={field.minimum} max={field.maximum} value={String(value)} onChange={(event) => updateValue(index, field, event.target.value)} aria-label={`Set ${index + 1} ${field.label}`} /><small>{unit.replaceAll("_", "/")}</small></label>;
				})}
				<label className="dynamic-set-field"><input type="number" inputMode="numeric" min="0" value={set.restSeconds ?? 0} onChange={(event) => onChange(index, { restSeconds: Number(event.target.value) || 0 })} aria-label={`Set ${index + 1} rest in seconds`} /><small>sec</small></label>
				<button className="set-check" type="button" onClick={() => onComplete(index)} aria-label={`${set.complete ? "Mark incomplete" : "Complete"} set ${index + 1}`}>{set.complete && <Check size={18} />}</button>
			</div>;
		})}
	</section>;
}
