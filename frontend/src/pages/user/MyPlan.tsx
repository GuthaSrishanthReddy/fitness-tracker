import "./MyPlan.css";
import { useEffect, useState } from "react";
import { fetchLatestAiPlan } from "../../services/routine.services";
import type { PlanItem } from "../../services/routine.services";

const MyPlan = () => {
  const [plan, setPlan] = useState<PlanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const data = await fetchLatestAiPlan();
        if (isMounted) setPlan(data);
      } catch (err) {
        if (isMounted) setError("Failed to generate plan");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    load();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="my-plan">
      <h2>My Plan</h2>

      <section>
        <h3>Workout Plan</h3>
        <div className="workout-plan">
          {loading && <p>Generating plan...</p>}
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

      <section>Meals</section>
      <section>Supplements</section>
      <section>Yoga</section>
      <section>Meditation</section>
    </div>
  );
};

export default MyPlan;
