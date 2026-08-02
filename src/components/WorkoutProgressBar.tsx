import { ChevronUp } from "lucide-react";

type Props = {
  currentExerciseIndex: number;
  totalExercises: number;
  completedExercises: number;
  onExpand: () => void;
};

export function WorkoutProgressBar({ currentExerciseIndex, totalExercises, completedExercises, onExpand }: Props) {
  const progressPercent = (completedExercises / totalExercises) * 100;

  return (
    <div className="workout-progress-bar" aria-label={`Exercise ${currentExerciseIndex + 1} of ${totalExercises}`}>
      <div className="progress-bar-content">
        <div className="progress-info">
          <span className="progress-label">{completedExercises}/{totalExercises} complete</span>
          <div className="progress-mini-track">
            <span style={{ width: `${progressPercent}%` }} />
          </div>
        </div>
        <button 
          className="progress-expand-btn" 
          onClick={onExpand}
          aria-label="Expand routine checklist"
          title="Show all exercises"
        >
          <ChevronUp size={18} />
        </button>
      </div>
    </div>
  );
}
