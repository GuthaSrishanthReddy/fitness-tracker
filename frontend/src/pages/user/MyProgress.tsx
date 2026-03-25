import { useState } from "react";
import { fetchProgressInsights } from "../../services/progress.service";
import type { InsightResponse } from "../../types/progress.types";
import ProgressInsights from "../../components/progress/ProgressInsights";
import ProgressUpdateForm from "../../components/progress/ProgressUpdateForm";
import "./MyProgress.css";

const MyProgress = () => {
  const [insights, setInsights] = useState<InsightResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAnalyze = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchProgressInsights();
      setInsights(data);
    } catch (err: any) {
      setError(err?.message ?? "Failed to fetch insights.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="my-progress">
      <div className="my-progress__header">
        <h2>My Progress</h2>
        <button className="my-progress__analyze-btn" onClick={handleAnalyze} disabled={loading}>
          {loading ? "Analyzing..." : "Analyze My Progress"}
        </button>
      </div>

      {error && <p className="my-progress__error">{error}</p>}
      {insights && <ProgressInsights data={insights} />}

      <ProgressUpdateForm />
    </div>
  );
};

export default MyProgress;

