import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  createTrainerRequest,
  fetchTrainerById
} from "../../services/trainer.service";
import type { TrainerDetail } from "../../types/trainer.types";
import "./TrainerDetails.css";

const TrainerDetails = () => {
  const { trainerId } = useParams();
  const [trainer, setTrainer] = useState<TrainerDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [requestError, setRequestError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!trainerId) {
      setLoadError("Trainer not found.");
      setIsLoading(false);
      return;
    }

    const loadTrainer = async () => {
      try {
        setIsLoading(true);
        setLoadError("");
        setRequestError("");
        setMessage("");
        const data = await fetchTrainerById(trainerId);
        setTrainer(data);
      } catch (err: any) {
        setLoadError(err.message || "Failed to load trainer details.");
      } finally {
        setIsLoading(false);
      }
    };

    void loadTrainer();
  }, [trainerId]);

  const handleRequestTrainer = async () => {
    if (!trainerId || !trainer?.canRequest) {
      return;
    }

    try {
      setIsSubmittingRequest(true);
      setRequestError("");
      setMessage("");
      await createTrainerRequest(trainerId);
      setTrainer((current) =>
        current
          ? {
              ...current,
              requestStatus: "PENDING",
              canRequest: false
            }
          : current
      );
      setMessage("Request sent to trainer successfully.");
    } catch (err: any) {
      setRequestError(err.message || "Failed to send trainer request.");
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  const achievementItems = useMemo(() => {
    if (!trainer) {
      return [];
    }

    const items = [
      {
        title: `${trainer.experienceYears || 0}+ years coaching`,
        detail: "Experience built through structured client transformations."
      },
      {
        title: `${trainer.expertise.length || 0} key specialt${
          trainer.expertise.length === 1 ? "y" : "ies"
        }`,
        detail:
          trainer.expertise.length > 0
            ? trainer.expertise.join(", ")
            : "Expertise details will be updated soon."
      }
    ];

    if (trainer.qualifications.length > 0) {
      items.push({
        title: `${trainer.qualifications.length} qualification${
          trainer.qualifications.length === 1 ? "" : "s"
        }`,
        detail: trainer.qualifications.join(", ")
      });
    }

    if (typeof trainer.rating === "number") {
      items.push({
        title: `${trainer.rating.toFixed(1)} average rating`,
        detail: "Based on overall trainer feedback."
      });
    }

    return items;
  }, [trainer]);

  if (isLoading) {
    return (
      <div className="trainer-details trainer-details--state">
        <p>Loading trainer details...</p>
      </div>
    );
  }

  if (loadError || !trainer) {
    return (
      <div className="trainer-details trainer-details--state">
        <p>{loadError || "Trainer not found."}</p>
      </div>
    );
  }

  return (
    <div className="trainer-details">
      <section className="trainer-details__panel trainer-details__panel--hero">
        <div className="trainer-details__hero-top">
          <div>
            <p className="trainer-details__eyebrow">Trainer details</p>
            <h2>{trainer.user.name}</h2>
            <p className="trainer-details__subtitle">{trainer.user.email}</p>
          </div>
        </div>

        <div className="trainer-details__request-bar">
          <div>
            <p className="trainer-details__request-label">Training request</p>
            <p className="trainer-details__request-status">
              {trainer.requestStatus === "PENDING" && "Request pending trainer response."}
              {trainer.requestStatus === "ACCEPTED" && "You are already assigned to this trainer."}
              {trainer.requestStatus === "REJECTED" &&
                "This trainer previously declined your request. You can request again."}
              {!trainer.requestStatus && "Send a request if you want to work with this trainer."}
            </p>
          </div>

          <button
            type="button"
            className="trainer-details__request-btn"
            onClick={handleRequestTrainer}
            disabled={!trainer.canRequest || isSubmittingRequest}
          >
            {isSubmittingRequest
              ? "Sending..."
              : trainer.requestStatus === "PENDING"
                ? "Request Sent"
                : trainer.requestStatus === "ACCEPTED"
                  ? "Already Assigned"
                  : "Request Trainer"}
          </button>
        </div>

        {message && <p className="trainer-details__success">{message}</p>}
        {requestError && <p className="trainer-details__error">{requestError}</p>}

        <div className="trainer-details__section">
          <h3>Expertise</h3>
          <div className="trainer-details__tag-list">
            {trainer.expertise.length > 0 ? (
              trainer.expertise.map((item) => (
                <span key={item} className="trainer-details__tag">
                  {item}
                </span>
              ))
            ) : (
              <p className="trainer-details__empty">
                This trainer has not added expertise details yet.
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="trainer-details__panel">
        <p className="trainer-details__eyebrow">Highlights</p>
        <h3>Achievements</h3>

        <div className="trainer-details__achievement-grid">
          {achievementItems.map((item) => (
            <article key={item.title} className="trainer-details__achievement-card">
              <strong>{item.title}</strong>
              <p>{item.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="trainer-details__panel">
        <p className="trainer-details__eyebrow">Credentials</p>
        <h3>Qualifications</h3>

        {trainer.qualifications.length > 0 ? (
          <div className="trainer-details__qualification-list">
            {trainer.qualifications.map((item) => (
              <article key={item} className="trainer-details__qualification-card">
                <strong>{item}</strong>
              </article>
            ))}
          </div>
        ) : (
          <p className="trainer-details__empty">
            Qualifications will be added here when available.
          </p>
        )}
      </section>
    </div>
  );
};

export default TrainerDetails;
