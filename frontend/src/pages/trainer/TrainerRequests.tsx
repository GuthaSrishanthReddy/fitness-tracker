import { useEffect, useState } from "react";
import {
  fetchTrainerRequests,
  respondToTrainerRequest
} from "../../services/trainer.service";
import type { TrainerRequestItem } from "../../types/trainer.types";
import "./TrainerRequests.css";

const TrainerRequests = () => {
  const [requests, setRequests] = useState<TrainerRequestItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);

  useEffect(() => {
    const loadRequests = async () => {
      try {
        setIsLoading(true);
        setError("");
        const data = await fetchTrainerRequests();
        setRequests(data);
      } catch (err: any) {
        setError(err.message || "Failed to load trainer requests.");
      } finally {
        setIsLoading(false);
      }
    };

    void loadRequests();
  }, []);

  const handleDecision = async (
    requestId: string,
    action: "ACCEPT" | "REJECT"
  ) => {
    try {
      setActiveRequestId(requestId);
      setError("");
      setMessage("");
      await respondToTrainerRequest(requestId, action);
      setRequests((current) => current.filter((request) => request.id !== requestId));
      setMessage(
        action === "ACCEPT"
          ? "Request accepted and client added successfully."
          : "Request rejected successfully."
      );
    } catch (err: any) {
      setError(err.message || "Failed to update trainer request.");
    } finally {
      setActiveRequestId(null);
    }
  };

  return (
    <div className="trainer-requests">
      <div className="trainer-requests__header">
        <div>
          <h2>Client Requests</h2>
          <p>Review incoming requests from users who want to work with you.</p>
        </div>
      </div>

      {message && <p className="trainer-requests__message">{message}</p>}
      {error && <p className="trainer-requests__error">{error}</p>}

      {isLoading ? (
        <p>Loading requests...</p>
      ) : requests.length === 0 ? (
        <div className="trainer-requests__empty">
          <p>No pending trainer requests right now.</p>
        </div>
      ) : (
        <div className="trainer-requests__grid">
          {requests.map((request) => (
            <article key={request.id} className="trainer-requests__card">
              <div className="trainer-requests__card-top">
                <div>
                  <h3>{request.user.name}</h3>
                  <p>{request.user.email}</p>
                </div>
                <span className="trainer-requests__stamp">
                  {new Date(request.createdAt).toLocaleDateString()}
                </span>
              </div>

              <div className="trainer-requests__meta">
                <p>
                  <strong>Goal:</strong> {request.user.fitnessGoal}
                </p>
                <p>
                  <strong>Level:</strong> {request.user.fitnessLevel}
                </p>
                <p>
                  <strong>Activity:</strong> {request.user.activityType}
                </p>
              </div>

              <div className="trainer-requests__actions">
                <button
                  type="button"
                  className="trainer-requests__btn trainer-requests__btn--accept"
                  onClick={() => handleDecision(request.id, "ACCEPT")}
                  disabled={activeRequestId === request.id}
                >
                  {activeRequestId === request.id ? "Working..." : "Accept"}
                </button>
                <button
                  type="button"
                  className="trainer-requests__btn trainer-requests__btn--reject"
                  onClick={() => handleDecision(request.id, "REJECT")}
                  disabled={activeRequestId === request.id}
                >
                  Reject
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

export default TrainerRequests;
