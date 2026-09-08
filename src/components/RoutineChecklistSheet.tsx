import { Fragment } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import type { Exercise } from "../App";
import { supersetMembers, supersetSequenceLabel } from "../data/supersets";

type Props = {
  exercises: Exercise[];
  currentExerciseId: string;
  onExerciseSelect: (exerciseId: string) => void;
  onClose: () => void;
  onEditRoutine?: () => void;
};

export function RoutineChecklistSheet({ exercises, currentExerciseId, onExerciseSelect, onClose, onEditRoutine }: Props) {
  const getExerciseStatus = (exercise: Exercise) => {
    const complete = exercise.sets.every((s) => s.complete);
    const anyComplete = exercise.sets.some((s) => s.complete);
    const isCurrent = exercise.id === currentExerciseId;
    
    return {
      complete,
      inProgress: !complete && anyComplete,
      pending: !complete && !anyComplete,
      isCurrent,
    };
  };

  return (
    <>
      <div className="routine-sheet-overlay" onClick={onClose} />
      <div className="routine-checklist-sheet">
        <div className="sheet-header">
          <h3>Routine</h3>
          {onEditRoutine && <button onClick={onEditRoutine} className="sheet-edit-btn"><SlidersHorizontal size={15}/> Edit groups</button>}
          <button onClick={onClose} aria-label="Close routine checklist" className="sheet-close-btn">
            <X size={20} />
          </button>
        </div>
        
        <div className="exercises-checklist">
          {exercises.map((exercise, index) => {
            const status = getExerciseStatus(exercise);
            const completedSets = exercise.sets.filter((s) => s.complete).length;
            
            const sequence = supersetSequenceLabel(exercises, exercise);
            const members = supersetMembers(exercises, exercise.supersetId);
            const firstInGroup = exercise.supersetId && members[0]?.id === exercise.id;
            return (
              <Fragment key={exercise.id}>
              {firstInGroup && <div className="checklist-superset-heading"><span>SUPERSET {sequence?.[0]}</span><small>{members.length} exercises · {exercise.sets.length} rounds · {exercise.supersetRest ?? 90}s rest</small></div>}
              <button
                className={`checklist-exercise ${exercise.supersetId ? "superset-member" : ""} ${status.isCurrent ? "current" : ""} ${status.complete ? "complete" : status.inProgress ? "in-progress" : "pending"}`}
                onClick={() => {
                  onExerciseSelect(exercise.id);
                  onClose();
                }}
              >
                <div className="checklist-status">
                  {status.complete ? (
                    <span className="status-icon complete">✓</span>
                  ) : status.inProgress ? (
                    <span className="status-icon in-progress">◐</span>
                  ) : (
                    <span className="status-icon pending">◦</span>
                  )}
                </div>
                
                <div className="checklist-exercise-info">
                  <strong>{sequence && <b className="checklist-sequence">{sequence}</b>}{index + 1}. {exercise.name}</strong>
                  <small>{completedSets}/{exercise.sets.length} sets</small>
                </div>
                
                {status.isCurrent && <span className="current-indicator">now</span>}
              </button>
              </Fragment>
            );
          })}
        </div>
      </div>
    </>
  );
}
