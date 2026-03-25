import type { InsightResponse } from "../../types/progress.types";
import "./ProgressInsights.css";

type Props = {
  data: InsightResponse;
};

type BadgeLevel = "good" | "warn" | "bad";

function badge(level: BadgeLevel, label: string) {
  return <span className={`pi-badge pi-badge--${level}`}>{label}</span>;
}

function bodyCompBadge(key: string, value: string) {
  const goodValues = ["down", "improving", "decreasing", "stable"];
  const badValues = ["worsening", "declining", "increasing"];
  const level: BadgeLevel = goodValues.includes(value)
    ? "good"
    : badValues.includes(value)
    ? "bad"
    : "warn";
  return (
    <div className="pi-status-row" key={key}>
      <span className="pi-status-label">{key}</span>
      {badge(level, value.replace(/-/g, " "))}
    </div>
  );
}

function genericBadge(key: string, value: string) {
  const goodValues = ["good", "sufficient", "low"];
  const badValues = ["poor", "needs-attention", "needs-increase", "high", "worsening", "declining"];
  const level: BadgeLevel = goodValues.includes(value)
    ? "good"
    : badValues.includes(value)
    ? "bad"
    : "warn";
  return (
    <div className="pi-status-row" key={key}>
      <span className="pi-status-label">{key}</span>
      {badge(level, value.replace(/-/g, " "))}
    </div>
  );
}

export default function ProgressInsights({ data }: Props) {
  if (data.status === "no-data") {
    return (
      <div className="progress-insights progress-insights--empty">
        <p>No progress data yet. Log at least one entry to get AI insights.</p>
      </div>
    );
  }

  if (data.status === "error" || !data.insights) {
    return (
      <div className="progress-insights progress-insights--error">
        <p>{data.message ?? "Failed to generate insights."}</p>
      </div>
    );
  }

  const { overview, bodyComposition, vitals, lifestyle, strengths, concerns, recommendations } =
    data.insights;

  return (
    <div className="progress-insights">
      <h3>AI Progress Insights</h3>

      <p className="pi-overview">{overview}</p>

      <div className="pi-grid">
        <div className="pi-card">
          <h4>Body Composition</h4>
          {bodyCompBadge("Weight Trend", bodyComposition.weightTrend)}
          {bodyCompBadge("Muscle Mass", bodyComposition.muscleMassStatus)}
          {bodyCompBadge("Body Fat", bodyComposition.bodyFatStatus)}
          {bodyCompBadge("Waist", bodyComposition.waistCircumferenceTrend)}
        </div>

        <div className="pi-card">
          <h4>Vitals</h4>
          {genericBadge("Heart Rate", vitals.restingHeartRateStatus)}
          {genericBadge("Sleep Quality", vitals.sleepQuality)}
        </div>

        <div className="pi-card">
          <h4>Lifestyle</h4>
          {genericBadge("Training", lifestyle.trainingConsistency)}
          {genericBadge("Protein Intake", lifestyle.proteinIntakeStatus)}
          {genericBadge("Cardio", lifestyle.cardioLevel)}
          {genericBadge("Stress", lifestyle.stressLevel)}
        </div>
      </div>

      <div className="pi-lists">
        {strengths.length > 0 && (
          <div className="pi-list pi-list--strengths">
            <h4>Strengths</h4>
            <ul>
              {strengths.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </div>
        )}

        {concerns.length > 0 && (
          <div className="pi-list pi-list--concerns">
            <h4>Concerns</h4>
            <ul>
              {concerns.map((c, i) => <li key={i}>{c}</li>)}
            </ul>
          </div>
        )}

        {recommendations.length > 0 && (
          <div className="pi-list pi-list--recommendations">
            <h4>Recommendations</h4>
            <ul>
              {recommendations.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
