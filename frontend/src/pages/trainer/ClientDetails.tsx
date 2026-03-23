import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchTrainerClientDetails } from "../../services/trainer.service";
import type { ClientProgressDetails } from "../../types/client.types";
import "./ClientDetails.css";

const ClientDetails = () => {
  const { clientLinkId } = useParams();
  const [details, setDetails] = useState<ClientProgressDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!clientLinkId) {
      setError("Client not found.");
      setIsLoading(false);
      return;
    }

    const loadDetails = async () => {
      try {
        setIsLoading(true);
        setError("");
        const data = await fetchTrainerClientDetails(clientLinkId);
        setDetails(data);
      } catch (err: any) {
        setError(err.message || "Failed to load client details.");
      } finally {
        setIsLoading(false);
      }
    };

    void loadDetails();
  }, [clientLinkId]);

  const latest = useMemo(() => details?.progressHistory[0] ?? null, [details]);

  if (isLoading) {
    return (
      <div className="client-details">
        <h2>Client Details</h2>
        <div className="client-details__panel">
          <p>Loading client progress...</p>
        </div>
      </div>
    );
  }

  if (error || !details) {
    return (
      <div className="client-details">
        <h2>Client Details</h2>
        <div className="client-details__panel">
          <p>{error || "Client not found."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="client-details">
      <section className="client-details__panel client-details__panel--hero">
        <div className="client-details__hero-top">
          <div>
            <p className="client-details__eyebrow">Client overview</p>
            <h2>{details.assignment.user.name}</h2>
            <p className="client-details__subtitle">{details.assignment.user.email}</p>
          </div>

          <span className="client-details__since">
            Since {new Date(details.assignment.createdAt).toLocaleDateString()}
          </span>
        </div>

        <div className="client-details__meta-grid">
          <article className="client-details__meta-card">
            <strong>{details.assignment.user.fitnessGoal}</strong>
            <p>Fitness goal</p>
          </article>
          <article className="client-details__meta-card">
            <strong>{details.assignment.user.fitnessLevel}</strong>
            <p>Fitness level</p>
          </article>
          <article className="client-details__meta-card">
            <strong>{details.assignment.user.activityType}</strong>
            <p>Primary activity</p>
          </article>
          <article className="client-details__meta-card">
            <strong>{details.progressHistory.length}</strong>
            <p>Progress updates since joining</p>
          </article>
        </div>
      </section>

      <section className="client-details__panel">
        <p className="client-details__eyebrow">Latest snapshot</p>
        <h3>Current condition</h3>

        {latest ? (
          <div className="client-details__stats-grid">
            <div><span>Date</span><strong>{new Date(latest.createdAt).toLocaleString()}</strong></div>
            <div><span>Weight</span><strong>{latest.weight} kg</strong></div>
            <div><span>Waist</span><strong>{latest.waistCircumference} cm</strong></div>
            <div><span>Heart rate</span><strong>{latest.restingHeartRate} bpm</strong></div>
            <div><span>Sleep</span><strong>{latest.sleepHours} hrs</strong></div>
            <div><span>Protein</span><strong>{latest.proteinIntake} g</strong></div>
            <div><span>Cardio</span><strong>{latest.cardioMinutes} min</strong></div>
            <div><span>Stress</span><strong>{latest.stressLevel} / 5</strong></div>
            <div><span>Body fat</span><strong>{latest.bodyFat ?? "N/A"} %</strong></div>
            <div><span>Muscle mass</span><strong>{latest.muscleMass ?? "N/A"} kg</strong></div>
            <div><span>Workout freq</span><strong>{latest.workoutFrequency ?? "N/A"} /week</strong></div>
            <div><span>Workout duration</span><strong>{latest.workoutDuration ?? "N/A"} min</strong></div>
            <div className="client-details__notes"><span>Notes</span><strong>{latest.notes ?? "None"}</strong></div>
          </div>
        ) : (
          <p className="client-details__empty">
            No progress entries have been added since this client joined you.
          </p>
        )}
      </section>

      <section className="client-details__panel">
        <p className="client-details__eyebrow">Timeline</p>
        <h3>Progress History</h3>

        {details.progressHistory.length > 0 ? (
          <div className="client-details__history">
            {details.progressHistory.map((entry) => (
              <article key={entry.id} className="client-details__history-card">
                <div className="client-details__history-head">
                  <strong>{new Date(entry.createdAt).toLocaleString()}</strong>
                  <span>{entry.weight} kg</span>
                </div>
                <div className="client-details__history-grid">
                  <p><strong>Waist:</strong> {entry.waistCircumference} cm</p>
                  <p><strong>Heart Rate:</strong> {entry.restingHeartRate} bpm</p>
                  <p><strong>Sleep:</strong> {entry.sleepHours} hrs</p>
                  <p><strong>Protein:</strong> {entry.proteinIntake} g</p>
                  <p><strong>Cardio:</strong> {entry.cardioMinutes} min</p>
                  <p><strong>Stress:</strong> {entry.stressLevel} / 5</p>
                  <p><strong>Body Fat:</strong> {entry.bodyFat ?? "N/A"} %</p>
                  <p><strong>Muscle Mass:</strong> {entry.muscleMass ?? "N/A"} kg</p>
                  <p><strong>Workout Frequency:</strong> {entry.workoutFrequency ?? "N/A"} /week</p>
                  <p><strong>Workout Duration:</strong> {entry.workoutDuration ?? "N/A"} min</p>
                </div>
                <p className="client-details__history-notes">
                  <strong>Notes:</strong> {entry.notes ?? "None"}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <p className="client-details__empty">
            No progress history is available after the association date yet.
          </p>
        )}
      </section>
    </div>
  );
};

export default ClientDetails;
