import { useEffect, useMemo, useState } from "react";
import { fetchProgress } from "../../services/progress.service";
import type { ProgressRecord } from "../../types/progress.types";
import "./RecentProgress.css";

type RecentProgressProps = {
  title?: string;
};

export default function RecentProgress({
  title = "Recent Progress",
}: RecentProgressProps) {
  const [history, setHistory] = useState<ProgressRecord[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchProgress();
        setHistory(data);
      } catch (err: any) {
        setError(err?.message || "Failed to load recent progress.");
      }
    };
    load();
  }, []);

  const latest = useMemo(() => {
    if (history.length === 0) return null;
    return [...history].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0];
  }, [history]);

  return (
    <section className="recent-progress">
      <h3>{title}</h3>
      {error && <p className="recent-progress__error">{error}</p>}
      {!error && !latest && (
        <p className="recent-progress__note">No progress updates yet.</p>
      )}
      {latest && (
        <div className="recent-progress__stats">
          <div>
            <span>Date</span>
            <strong>{new Date(latest.createdAt).toLocaleString()}</strong>
          </div>
          <div>
            <span>Weight</span>
            <strong>{latest.weight} kg</strong>
          </div>
          <div>
            <span>Waist Circumference</span>
            <strong>{latest.waistCircumference} cm</strong>
          </div>
          <div>
            <span>Resting Heart Rate</span>
            <strong>{latest.restingHeartRate} bpm</strong>
          </div>
          <div>
            <span>Sleep Hours</span>
            <strong>{latest.sleepHours} hours</strong>
          </div>
          <div>
            <span>Protein Intake</span>
            <strong>{latest.proteinIntake} g</strong>
          </div>
          <div>
            <span>Cardio Minutes</span>
            <strong>{latest.cardioMinutes} min</strong>
          </div>
          <div>
            <span>Stress Level</span>
            <strong>{latest.stressLevel} / 5</strong>
          </div>
          <div>
            <span>Body Fat</span>
            <strong>{latest.bodyFat ?? "N/A"} %</strong>
          </div>
          <div>
            <span>Muscle Mass</span>
            <strong>{latest.muscleMass ?? "N/A"} kg</strong>
          </div>
          <div>
            <span>Workout Frequency</span>
            <strong>{latest.workoutFrequency ?? "N/A"} times/week</strong>
          </div>
          <div>
            <span>Workout Duration</span>
            <strong>{latest.workoutDuration ?? "N/A"} min</strong>
          </div>
          <div className="recent-progress__notes">
            <span>Notes</span>
            <strong>{latest.notes ?? "None"}</strong>
          </div>
        </div>
      )}
    </section>
  );
}
