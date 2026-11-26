import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import RecentProgress from "../../components/progress/RecentProgress";
import { fetchMyTrainer, fetchUserProfile } from "../../services/user.service";
import type { AssignedTrainer } from "../../types/trainer.types";
import type { UserProfile as UserProfileData } from "../../types/user.types";
import "./Profile.css";

const formatValue = (value?: string) =>
  value
    ?.toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ") ?? "Not set";

const Profile = () => {
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [assignment, setAssignment] = useState<AssignedTrainer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setIsLoading(true);
        setError("");
        const [profileData, trainerData] = await Promise.all([
          fetchUserProfile(),
          fetchMyTrainer().catch(() => null)
        ]);
        setProfile(profileData);
        setAssignment(trainerData);
      } catch (err: any) {
        setError(err?.message || "Unable to load your profile.");
      } finally {
        setIsLoading(false);
      }
    };

    void loadProfile();
  }, []);

  if (isLoading) {
    return (
      <div className="user-profile user-profile--loading">
        <p>Loading profile...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="user-profile user-profile--loading">
        <p>{error}</p>
      </div>
    );
  }

  const initials = (profile?.name || "User")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <main className="user-profile">
      <section className="user-profile__hero">
        <div className="user-profile__identity">
          <div className="user-profile__avatar" aria-label="Profile initials">
            {initials}
          </div>
          <div>
            <p className="user-profile__eyebrow">Member profile</p>
            <h2>{profile?.name || "User"}</h2>
            <p className="user-profile__email">{profile?.email}</p>
          </div>
        </div>

        {typeof profile?.complianceScore === "number" && (
          <div className="user-profile__score">
            <strong>{profile.complianceScore}%</strong>
            <span>Compliance</span>
          </div>
        )}
      </section>

      <section className="user-profile__grid">
        <article className="user-profile__panel">
          <div className="user-profile__panel-heading">
            <div>
              <p className="user-profile__eyebrow">Fitness setup</p>
              <h3>Your goals</h3>
            </div>
            <Link className="user-profile__edit-link" to="/user/user-data">
              Update
            </Link>
          </div>

          <div className="user-profile__details">
            <div>
              <span>Fitness goal</span>
              <strong>{formatValue(profile?.fitnessGoal)}</strong>
            </div>
            <div>
              <span>Experience level</span>
              <strong>{formatValue(profile?.fitnessLevel)}</strong>
            </div>
            <div>
              <span>Preferred activity</span>
              <strong>{formatValue(profile?.activityType)}</strong>
            </div>
          </div>
        </article>

        <article className="user-profile__panel">
          <p className="user-profile__eyebrow">Coaching</p>
          <h3>My trainer</h3>

          {assignment ? (
            <div className="user-profile__trainer">
              <div className="user-profile__trainer-avatar">
                {(assignment.trainer.user.name || "T")[0].toUpperCase()}
              </div>
              <div className="user-profile__trainer-copy">
                <strong>{assignment.trainer.user.name}</strong>
                <span>{assignment.trainer.user.email}</span>
              </div>
              <Link className="user-profile__edit-link" to="/user/my-trainer">
                View
              </Link>
            </div>
          ) : (
            <div className="user-profile__trainer user-profile__trainer--empty">
              <div>
                <strong>No trainer assigned</strong>
                <span>Explore trainers and send a request.</span>
              </div>
              <Link className="user-profile__edit-link" to="/user/explore-trainers">
                Explore
              </Link>
            </div>
          )}
        </article>
      </section>

      <section className="user-profile__progress">
        <RecentProgress title="Current condition" />
      </section>

      <div className="user-profile__footer">
        {profile?.createdAt && (
          <span>
            Member since {new Date(profile.createdAt).toLocaleDateString()}
          </span>
        )}
      </div>
    </main>
  );
};

export default Profile;
