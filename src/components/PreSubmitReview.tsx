import { useState } from "react";
import { AlertCircle, Check, ChevronDown, ChevronUp, X } from "lucide-react";
import type { Session, Exercise } from "../App";
import { trackingTemplates } from "../exerciseDatabase/taxonomies";
import { normalizeExerciseKey, productionExerciseLibrary } from "../exerciseDatabase/libraryExercises";

type Props = {
  session: Session;
  onEdit: (exerciseId: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
};

export function PreSubmitReview({ session, onEdit, onConfirm, onCancel }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function requiredFields(exercise: Exercise) {
    const canonical = productionExerciseLibrary.find((item) => item.id === exercise.canonicalExerciseId)
      ?? productionExerciseLibrary.find((item) => [item.canonicalName, item.displayName, ...item.aliases].some((name) => normalizeExerciseKey(name) === normalizeExerciseKey(exercise.name)));
    const template = trackingTemplates.find((item) => item.id === (exercise.trackingTemplateId ?? canonical?.trackingTemplateId));
    return template ? template.requiredFieldIds : ["weight", "reps"];
  }

  function setFieldValue(set: Exercise["sets"][number], fieldId: string) {
    return set.values?.[fieldId] ?? (fieldId === "weight" ? set.weight : fieldId === "reps" ? set.reps : "");
  }

  function isMissingValue(value: unknown) {
    return value === undefined || value === null || value === "" || value === 0 || value === "0";
  }

  function getExerciseStatus(exercise: Exercise) {
    const complete = exercise.sets.every((s) => s.complete);
    const fields = requiredFields(exercise);
    const hasMissingData = exercise.sets.some((set) => set.complete && fields.some((fieldId) => isMissingValue(setFieldValue(set, fieldId))));
    return { complete, hasMissingData, completedSets: exercise.sets.filter((s) => s.complete).length };
  }

  const allComplete = session.exercises.every((e) => getExerciseStatus(e).complete);
  const anyMissing = session.exercises.some((e) => getExerciseStatus(e).hasMissingData);

  return (
    <div className="pre-submit-review">
      <div className="review-header">
        <h2>Review Your Workout</h2>
        <p>Before submitting, check that all exercises are complete and data is accurate.</p>
      </div>

      {!allComplete && (
        <div className="review-warning">
          <AlertCircle size={20} />
          <div>
            <strong>Incomplete Workout</strong>
            <p>Not all exercises are marked complete. You can still submit, but review any skipped exercises.</p>
          </div>
        </div>
      )}

      {anyMissing && (
        <div className="review-warning missing-data">
          <AlertCircle size={20} />
          <div>
            <strong>⚠️ Missing Data</strong>
            <p>Some sets are missing required tracking data. Fill these in for accurate workout tracking.</p>
          </div>
        </div>
      )}

      <div className="exercises-review">
        {session.exercises.map((exercise) => {
          const status = getExerciseStatus(exercise);
          const isExpanded = expandedId === exercise.id;

          return (
            <div key={exercise.id} className={`review-exercise ${status.complete ? "review-complete" : ""} ${status.hasMissingData ? "review-missing" : ""}`}>
              <button
                className="review-exercise-header"
                onClick={() => setExpandedId(isExpanded ? null : exercise.id)}
                aria-expanded={isExpanded}
              >
                <div className="review-exercise-status">
                  {status.complete ? <Check size={20} className="status-icon complete" /> : <X size={20} className="status-icon incomplete" />}
                  <div className="review-exercise-info">
                    <h3>{exercise.name}</h3>
                    <p>{status.completedSets}/{exercise.sets.length} sets completed</p>
                  </div>
                </div>
                <div className="review-expand-trigger">
                  {status.hasMissingData && <span className="missing-badge">Missing data</span>}
                  {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
              </button>

              {isExpanded && (
                <div className="review-exercise-details">
                  <div className="review-sets-grid">
                    {exercise.sets.map((set, index) => {
                      const canonical = productionExerciseLibrary.find((item) => item.id === exercise.canonicalExerciseId)
                        ?? productionExerciseLibrary.find((item) => [item.canonicalName, item.displayName, ...item.aliases].some((name) => normalizeExerciseKey(name) === normalizeExerciseKey(exercise.name)));
                      const template = trackingTemplates.find((item) => item.id === (exercise.trackingTemplateId ?? canonical?.trackingTemplateId));
                      const fields = requiredFields(exercise);
                      const missing = set.complete && fields.some((fieldId) => isMissingValue(setFieldValue(set, fieldId)));
                      return (
                        <div key={index} className={`review-set ${set.complete ? "set-complete" : ""} ${missing ? "set-missing" : ""}`}>
                          <strong>Set {index + 1}</strong>
                          <div className="review-set-values">
                            {missing && <span className="warning-indicator">⚠️</span>}
                            {fields.map((fieldId) => {
                              const value = setFieldValue(set, fieldId);
                              const field = template?.fields.find((item) => item.id === fieldId);
                              const unit = set.units?.[fieldId] ?? field?.defaultUnit ?? (fieldId === "weight" ? "lb" : fieldId === "reps" ? "reps" : "");
                              return <span key={fieldId} className={set.complete && isMissingValue(value) ? "value-missing" : ""}>{isMissingValue(value) ? "—" : value} {unit.replaceAll("_", "/")}</span>;
                            })}
                          </div>
                          {set.complete && <Check size={16} className="set-check-icon" />}
                        </div>
                      );
                    })}
                  </div>
                  <button className="review-edit-btn" onClick={() => onEdit(exercise.id)}>
                    Edit Exercise
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="review-actions">
        <button className="btn-secondary" onClick={onCancel}>
          Back to Workout
        </button>
        <button className="btn-primary" onClick={onConfirm} disabled={anyMissing}>
          {allComplete ? "Submit Workout" : "Submit Anyway"}
        </button>
      </div>
    </div>
  );
}
