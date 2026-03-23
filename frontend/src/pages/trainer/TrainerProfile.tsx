import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  fetchMyClients,
  fetchTrainerProfile,
  updateTrainerProfile
} from "../../services/trainer.service";
import type { ClientListItem } from "../../types/client.types";
import type { TrainerProfile as TrainerProfileData } from "../../types/trainer.types";
import "./TrainerProfile.css";

const defaultProfile: TrainerProfileData = {
  id: "",
  userId: "",
  qualifications: [],
  expertise: [],
  experienceYears: 0,
  rating: null
};

const TrainerProfile = () => {
  const [profile, setProfile] = useState<TrainerProfileData>(defaultProfile);
  const [clients, setClients] = useState<ClientListItem[]>([]);
  const [expertiseInput, setExpertiseInput] = useState("");
  const [isEditingExpertise, setIsEditingExpertise] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setIsLoading(true);
        const [profileData, clientData] = await Promise.all([
          fetchTrainerProfile(),
          fetchMyClients().catch(() => [])
        ]);

        setProfile({
          ...defaultProfile,
          ...profileData,
          qualifications: profileData.qualifications ?? [],
          expertise: profileData.expertise ?? []
        });
        setExpertiseInput((profileData.expertise ?? []).join(", "));
        setClients(clientData);
      } catch (err: any) {
        setMessage(err.message || "Unable to load trainer profile.");
      } finally {
        setIsLoading(false);
      }
    };

    void loadProfile();
  }, []);

  const achievementItems = useMemo(() => {
    const achievements = [];

    achievements.push({
      title: `${profile.experienceYears || 0}+ years coaching`,
    });

    if (profile.qualifications.length > 0) {
      achievements.push({
        title: `${profile.qualifications.length} professional qualification${
          profile.qualifications.length > 1 ? "s" : ""
        }`,
      });
    }

    achievements.push({
      title: `${clients.length} client${clients.length === 1 ? "" : "s"} guided`,
    });

    if (typeof profile.rating === "number") {
      achievements.push({
        title: `${profile.rating.toFixed(1)} average rating`,
      });
    }

    return achievements;
  }, [clients.length, profile.experienceYears, profile.qualifications, profile.rating]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage("");
    setIsSaving(true);

    try {
      const expertise = expertiseInput
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

      const updatedProfile = await updateTrainerProfile(expertise);
      setProfile((current) => ({
        ...current,
        ...updatedProfile,
        qualifications: updatedProfile.qualifications ?? current.qualifications,
        expertise: updatedProfile.expertise ?? expertise
      }));
      setExpertiseInput((updatedProfile.expertise ?? expertise).join(", "));
      setIsEditingExpertise(false);
      setMessage("Expertise updated successfully.");
    } catch (err: any) {
      setMessage(err.message || "Update failed.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="trainer-profile trainer-profile--loading">
        <p>Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="trainer-profile">
      <section className="trainer-profile__panel trainer-profile__panel--hero">
        <div className="trainer-profile__hero-top">
          <div>
            <p className="trainer-profile__eyebrow">Trainer profile</p>
            <h2>Expertise</h2>
          </div>

          <button
            type="button"
            className="trainer-profile__edit-btn"
            onClick={() => {
              setIsEditingExpertise((current) => !current);
              setMessage("");
            }}
          >
            {isEditingExpertise ? "Close" : "Edit"}
          </button>
        </div>

        <div className="trainer-profile__expertise-list">
          {profile.expertise.length > 0 ? (
            profile.expertise.map((item) => (
              <span key={item} className="trainer-profile__tag">
                {item}
              </span>
            ))
          ) : (
            <p className="trainer-profile__empty">
              Add your core coaching specialties to help clients understand your strengths.
            </p>
          )}
        </div>

        {isEditingExpertise && (
          <form className="trainer-profile__form" onSubmit={handleSubmit}>
            <label className="trainer-profile__field">
              <span>Update expertise</span>
              <input
                type="text"
                placeholder="e.g., Strength Training, Fat Loss, Mobility"
                value={expertiseInput}
                onChange={(e) => setExpertiseInput(e.target.value)}
              />
            </label>

            <div className="trainer-profile__actions">
              <button
                type="submit"
                className="trainer-profile__btn trainer-profile__btn--primary"
                disabled={isSaving}
              >
                {isSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </form>
        )}

        {message && <p className="trainer-profile__message">{message}</p>}
      </section>

      <section className="trainer-profile__panel">
        <div className="trainer-profile__section-heading">
          <div>
            <p className="trainer-profile__eyebrow">Proof of work</p>
            <h3>Achievements</h3>
          </div>
        </div>

        <div className="trainer-profile__achievement-grid">
          {achievementItems.map((item) => (
            <article key={item.title} className="trainer-profile__achievement-card">
              <strong>{item.title}</strong>
            </article>
          ))}
        </div>
      </section>

      <section className="trainer-profile__panel">
        <div className="trainer-profile__section-heading">
          <div>
            <p className="trainer-profile__eyebrow">Relationships</p>
            <h3>Clients History</h3>
          </div>
        </div>

        <div className="trainer-profile__history-list">
          {clients.length > 0 ? (
            clients.map((client) => (
              <article key={client.id} className="trainer-profile__history-card">
                <div>
                  <strong>{client.user.name}</strong>
                  <p>{client.user.email}</p>
                </div>
                <span className="trainer-profile__history-date">
                  {client.createdAt
                    ? `Since ${new Date(client.createdAt).toLocaleDateString()}`
                    : "Client relationship active"}
                </span>
              </article>
            ))
          ) : (
            <p className="trainer-profile__empty">
              Your client history will appear here as soon as you start working with clients.
            </p>
          )}
        </div>
      </section>
    </div>
  );
};

export default TrainerProfile;
