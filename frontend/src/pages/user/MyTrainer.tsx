import { useEffect, useState } from "react";
import { fetchMyTrainer } from "../../services/user.service";
import type { AssignedTrainer } from "../../types/trainer.types";
import "./MyTrainer.css";

const MyTrainer = () => {
  const [assignment, setAssignment] = useState<AssignedTrainer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadTrainer = async () => {
      try {
        setIsLoading(true);
        setError("");
        const data = await fetchMyTrainer();
        setAssignment(data);
      } catch (err: any) {
        setError(err.message || "Failed to load your trainer.");
      } finally {
        setIsLoading(false);
      }
    };

    void loadTrainer();
  }, []);

  if (isLoading) {
    return (
      <div className="my-trainer">
        <h2>My Trainer</h2>
        <div className="my-trainer__details">
          <p>Loading trainer...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="my-trainer">
        <h2>My Trainer</h2>
        <div className="my-trainer__details">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="my-trainer">
      <h2>My Trainer</h2>

      {assignment ? (
        <>
          <div className="my-trainer__details">
            <div className="my-trainer__identity">
              <div>
                <p className="my-trainer__eyebrow">Assigned trainer</p>
                <h3>{assignment.trainer.user.name}</h3>
                <p className="my-trainer__email">{assignment.trainer.user.email}</p>
              </div>
              <span className="my-trainer__since">
                Since {new Date(assignment.createdAt).toLocaleDateString()}
              </span>
            </div>

            <div className="my-trainer__stats">
              <article className="my-trainer__stat-card">
                <strong>{assignment.trainer.experienceYears}+ years</strong>
                <p>Coaching experience</p>
              </article>
              <article className="my-trainer__stat-card">
                <strong>{assignment.trainer.qualifications.length}</strong>
                <p>Qualifications</p>
              </article>
              <article className="my-trainer__stat-card">
                <strong>{assignment.trainer.expertise.length}</strong>
                <p>Expertise areas</p>
              </article>
            </div>

            <div className="my-trainer__section">
              <h4>Expertise</h4>
              <div className="my-trainer__tags">
                {assignment.trainer.expertise.length > 0 ? (
                  assignment.trainer.expertise.map((item) => (
                    <span key={item} className="my-trainer__tag">
                      {item}
                    </span>
                  ))
                ) : (
                  <p className="my-trainer__empty">No expertise added yet.</p>
                )}
              </div>
            </div>

            <div className="my-trainer__section">
              <h4>Qualifications</h4>
              <div className="my-trainer__tags">
                {assignment.trainer.qualifications.length > 0 ? (
                  assignment.trainer.qualifications.map((item) => (
                    <span key={item} className="my-trainer__tag my-trainer__tag--soft">
                      {item}
                    </span>
                  ))
                ) : (
                  <p className="my-trainer__empty">No qualifications listed yet.</p>
                )}
              </div>
            </div>
          </div>

          <div className="my-trainer__chat">
            <div className="my-trainer__chat-placeholder">
              <h4>Trainer communication</h4>
              <p>Chat can be connected here next using your existing messaging flow.</p>
            </div>
          </div>
        </>
      ) : (
        <div className="my-trainer__details">
          <p className="my-trainer__empty">
            You do not have an assigned trainer yet. Send a request from a trainer details page to get started.
          </p>
        </div>
      )}
    </div>
  );
};

export default MyTrainer;
