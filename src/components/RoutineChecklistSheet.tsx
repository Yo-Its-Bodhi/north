import { X } from "lucide-react";
import type { Exercise } from "../App";

type Props = {
  exercises: Exercise[];
  currentExerciseId: string;
  onExerciseSelect: (exerciseId: string) => void;
  onClose: () => void;
};

export function RoutineChecklistSheet({ exercises, currentExerciseId, onExerciseSelect, onClose }: Props) {
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
          <button onClick={onClose} aria-label="Close routine checklist" className="sheet-close-btn">
            <X size={20} />
          </button>
        </div>
        
        <div className="exercises-checklist">
          {exercises.map((exercise, index) => {
            const status = getExerciseStatus(exercise);
            const completedSets = exercise.sets.filter((s) => s.complete).length;
            
            return (
              <button
                key={exercise.id}
                className={`checklist-exercise ${status.isCurrent ? "current" : ""} ${status.complete ? "complete" : status.inProgress ? "in-progress" : "pending"}`}
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
                  <strong>{index + 1}. {exercise.name}</strong>
                  <small>{completedSets}/{exercise.sets.length} sets</small>
                </div>
                
                {status.isCurrent && <span className="current-indicator">now</span>}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
