import type { PlanItem } from "../../services/routine.services";

type WorkoutPlanSectionProps = {
  loading: boolean;
  error: string;
  plan: PlanItem[];
};

const WorkoutPlanSection = ({ loading, error, plan }: WorkoutPlanSectionProps) => {
  return (
    <section>
      <h3>Workout Plan</h3>
      <div className="workout-plan">
        {loading && <p>Loading plan...</p>}
        {error && <p className="error">{error}</p>}
        {!loading && !error && plan.length === 0 && (
          <p>No plan yet. Update your progress to generate one.</p>
        )}
        {!loading && !error && plan.length > 0 && (
          <div className="workout-table-wrap">
            <table className="workout-table">
              <thead>
                <tr>
                  <th>Workout</th>
                  <th>Sets x Reps</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {plan.map((item, idx) => (
                  <tr key={`${item.workout}-${idx}`}>
                    <td>{item.workout}</td>
                    <td>{item.setsReps}</td>
                    <td>{item.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
};

export default WorkoutPlanSection;
