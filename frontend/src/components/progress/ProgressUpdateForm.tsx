import { useEffect, useMemo, useState } from "react";
import { fetchProgress, submitProgress } from "../../services/progress.service";
import type { ProgressInput, ProgressRecord } from "../../types/progress.types";
import "./ProgressUpdateForm.css";

const emptyProgress: ProgressInput = {
  weight: 0,
  waistCircumference: 0,
  restingHeartRate: 0,
  sleepHours: 0,
  proteinIntake: 0,
  cardioMinutes: 0,
  stressLevel: 1,
  bodyFat: undefined,
  muscleMass: undefined,
  workoutFrequency: undefined,
  workoutDuration: undefined,
  notes: "",
};

const toNumberOrUndefined = (value: string) => {
  if (value.trim() === "") return undefined;
  const num = Number(value);
  return Number.isNaN(num) ? undefined : num;
};

const emptyFormState = {
  weight: "",
  waistCircumference: "",
  restingHeartRate: "",
  sleepHours: "",
  proteinIntake: "",
  cardioMinutes: "",
  stressLevel: "1",
  bodyFat: "",
  muscleMass: "",
  workoutFrequency: "",
  workoutDuration: "",
  notes: "",
};

type FormState = typeof emptyFormState;

type ProgressUpdateFormProps = {
  title?: string;
};

export default function ProgressUpdateForm({
  title = "Update Progress",
}: ProgressUpdateFormProps) {
  const [progressHistory, setProgressHistory] = useState<ProgressRecord[]>([]);
  const [form, setForm] = useState<FormState>(() => ({ ...emptyFormState }));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const history = await fetchProgress();
        setProgressHistory(history);
      } catch {
        // ignore load errors here
      }
    };
    load();
  }, []);

  const lastUpdated = useMemo(() => {
    if (progressHistory.length === 0) return null;
    const sorted = [...progressHistory].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return sorted[0];
  }, [progressHistory]);

  const daysSinceLastUpdate = useMemo(() => {
    if (!lastUpdated) return null;
    const last = new Date(lastUpdated.createdAt);
    const now = new Date();
    const diffMs = now.getTime() - last.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }, [lastUpdated]);

  const canUpdateToday = useMemo(() => {
    if (!lastUpdated) return true;
    const last = new Date(lastUpdated.createdAt);
    const now = new Date();
    return (
      last.getFullYear() !== now.getFullYear() ||
      last.getMonth() !== now.getMonth() ||
      last.getDate() !== now.getDate()
    );
  }, [lastUpdated]);

  const showWeeklyBanner =
    daysSinceLastUpdate === null || daysSinceLastUpdate >= 7;

  const handleChange = (name: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!canUpdateToday) {
      setError("You can update progress only once per day.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: ProgressInput = {
        ...emptyProgress,
        weight: Number(form.weight),
        waistCircumference: Number(form.waistCircumference),
        restingHeartRate: Number(form.restingHeartRate),
        sleepHours: Number(form.sleepHours),
        proteinIntake: Number(form.proteinIntake),
        cardioMinutes: Number(form.cardioMinutes),
        stressLevel: Number(form.stressLevel) || 1,
        bodyFat: toNumberOrUndefined(form.bodyFat),
        muscleMass: toNumberOrUndefined(form.muscleMass),
        workoutFrequency: toNumberOrUndefined(form.workoutFrequency),
        workoutDuration: toNumberOrUndefined(form.workoutDuration),
        notes: form.notes.trim() ? form.notes.trim() : undefined,
      };

      await submitProgress(payload);
      setSuccess("Progress updated successfully.");
      setForm({ ...emptyFormState });
      const refreshed = await fetchProgress();
      setProgressHistory(refreshed);
    } catch (err: any) {
      setError(err?.message || "Failed to update progress.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="progress-update">
      <div className="progress-update__header">
        <h2>{title}</h2>
        {showWeeklyBanner && (
          <div className="progress-update__banner">
            You have not updated your progress in at least a week. Please update
            today.
          </div>
        )}
      </div>

      {!canUpdateToday && (
        <p className="progress-update__note">
          You already updated your progress today.
        </p>
      )}
      {error && <p className="progress-update__error">{error}</p>}
      {success && <p className="progress-update__success">{success}</p>}

      <form className="progress-update__form" onSubmit={handleSubmit}>
        <div className="progress-update__grid">
          <label>
            Weight (kg) *
            <input
              type="number"
              value={form.weight}
              onChange={(e) => handleChange("weight", e.target.value)}
              required
              min={20}
              max={300}
              step="0.1"
            />
          </label>
          <label>
            Body Fat (%)
            <input
              type="number"
              value={form.bodyFat}
              onChange={(e) => handleChange("bodyFat", e.target.value)}
              min={2}
              max={70}
              step="0.1"
            />
          </label>
          <label>
            Muscle Mass (kg)
            <input
              type="number"
              value={form.muscleMass}
              onChange={(e) => handleChange("muscleMass", e.target.value)}
              min={5}
              max={80}
              step="0.1"
            />
          </label>
          <label>
            Waist Circumference (cm) *
            <input
              type="number"
              value={form.waistCircumference}
              onChange={(e) => handleChange("waistCircumference", e.target.value)}
              required
              min={40}
              max={200}
              step="0.1"
            />
          </label>
          <label>
            Resting Heart Rate (bpm) *
            <input
              type="number"
              value={form.restingHeartRate}
              onChange={(e) => handleChange("restingHeartRate", e.target.value)}
              required
              min={30}
              max={200}
            />
          </label>
          <label>
            Sleep Hours *
            <input
              type="number"
              value={form.sleepHours}
              onChange={(e) => handleChange("sleepHours", e.target.value)}
              required
              min={0}
              max={24}
              step="0.1"
            />
          </label>
          <label>
            Protein Intake (g) *
            <input
              type="number"
              value={form.proteinIntake}
              onChange={(e) => handleChange("proteinIntake", e.target.value)}
              required
              min={0}
              max={400}
              step="0.1"
            />
          </label>
          <label>
            Cardio Minutes *
            <input
              type="number"
              value={form.cardioMinutes}
              onChange={(e) => handleChange("cardioMinutes", e.target.value)}
              required
              min={0}
              max={1000}
            />
          </label>
          <label>
            Stress Level (1-5) *
            <input
              type="number"
              value={form.stressLevel}
              onChange={(e) => handleChange("stressLevel", e.target.value)}
              required
              min={1}
              max={5}
            />
          </label>
          <label>
            Workout Frequency (per week)
            <input
              type="number"
              value={form.workoutFrequency}
              onChange={(e) => handleChange("workoutFrequency", e.target.value)}
              min={0}
              max={14}
            />
          </label>
          <label>
            Workout Duration (minutes)
            <input
              type="number"
              value={form.workoutDuration}
              onChange={(e) => handleChange("workoutDuration", e.target.value)}
              min={0}
              max={300}
            />
          </label>
        </div>
        <label className="progress-update__notes">
          Notes
          <textarea
            value={form.notes}
            onChange={(e) => handleChange("notes", e.target.value)}
            maxLength={1000}
          />
        </label>

        <button
          className="progress-update__btn progress-update__btn--primary"
          type="submit"
          disabled={isSubmitting || !canUpdateToday}
        >
          {isSubmitting ? "Saving..." : "Update Progress"}
        </button>
      </form>
    </section>
  );
}
