import type { PlanItem } from "../../services/routine.services";

type WorkoutPlanSectionProps = {
  loading: boolean;
  error: string;
  plan: PlanItem[];
};

const dayOrder = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const WorkoutPlanSection = ({ loading, error, plan }: WorkoutPlanSectionProps) => {
  const sortedPlan = [...plan].sort((a, b) => {
    const aIdx = dayOrder.indexOf(a.day);
    const bIdx = dayOrder.indexOf(b.day);
    const safeA = aIdx === -1 ? Number.MAX_SAFE_INTEGER : aIdx;
    const safeB = bIdx === -1 ? Number.MAX_SAFE_INTEGER : bIdx;
    return safeA - safeB;
  });

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
                  <th>Day</th>
                  <th>Workout</th>
                  <th>Sets x Reps</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {sortedPlan.map((item, idx) => (
                  <tr key={`${item.workout}-${idx}`}>
                    <td>{item.day}</td>
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
