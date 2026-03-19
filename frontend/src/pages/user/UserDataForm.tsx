import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../services/api";
import "./UserDataForm.css";

type FitnessGoal =
    | "FAT_LOSS"
    | "WEIGHT_GAIN"
    | "MUSCLE_GAIN"
    | "MAINTENANCE"
    | "STRENGTH_INCREASE"
    | "ENDURANCE_INCREASE"
    | "FLEXIBILITY"
    | "MOBILITY"
    | "BALANCE"
    | "ATHLETIC_PERFORMANCE"
    | "PHYSICAL_REHABILITATION";

type FitnessLevel =
    | "BEGINNER"
    | "INTERMEDIATE"
    | "ADVANCED"
    | "ATHLETE";

type ActivityType =
    | "WEIGHT_TRAINING"
    | "BODYWEIGHT"
    | "YOGA"
    | "PILATES"
    | "RUNNING"
    | "WALKING"
    | "HIKING"
    | "CYCLING"
    | "SWIMMING"
    | "CROSSFIT"
    | "HIIT"
    | "DANCE"
    | "MARTIAL_ARTS"
    | "SPORTS"
    | "HOME_WORKOUTS"
    | "OUTDOOR_TRAINING"
    | "MIXED_TRAINING";

interface RuleResponse {
    activity: ActivityType;
}

export default function UserDataForm() {
    const navigate = useNavigate();

    // Fitness Details
    const [goal, setGoal] = useState<FitnessGoal | "">("");
    const [level, setLevel] = useState<FitnessLevel | "">("");
    const [activity, setActivity] = useState<ActivityType | "">("");

    // Progress Data - Mandatory
    const [weight, setWeight] = useState("");
    const [waistCircumference, setWaistCircumference] = useState("");
    const [restingHeartRate, setRestingHeartRate] = useState("");
    const [sleepHours, setSleepHours] = useState("");
    const [proteinIntake, setProteinIntake] = useState("");
    const [cardioMinutes, setCardioMinutes] = useState("");
    const [stressLevel, setStressLevel] = useState("3");

    // Progress Data - Optional (but required at signup)
    const [bodyFat, setBodyFat] = useState("");
    const [muscleMass, setMuscleMass] = useState("");
    const [workoutFrequency, setWorkoutFrequency] = useState("");
    const [workoutDuration, setWorkoutDuration] = useState("");

    const [allowedActivities, setAllowedActivities] = useState<ActivityType[]>([]);
    const [loadingActivities, setLoadingActivities] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    // Fetch allowed activities whenever goal or level changes
    useEffect(() => {
        if (!goal || !level) {
            setAllowedActivities([]);
            setActivity("");
            return;
        }

        const fetchAllowedActivities = async () => {
            try {
                setLoadingActivities(true);
                setActivity("");

                const params = new URLSearchParams({ goal, level });
                const data = await api<RuleResponse[]>(`/rules/activities?${params.toString()}`);
                setAllowedActivities(data.map((r) => r.activity));
            } catch (error) {
                console.error("Failed to fetch activities", error);
                setAllowedActivities([]);
            } finally {
                setLoadingActivities(false);
            }
        };

        fetchAllowedActivities();
    }, [goal, level]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        // Validate fitness details
        if (!goal || !level || !activity) {
            setError("Please complete all fitness details");
            return;
        }

        // Validate mandatory progress fields
        if (!weight || !waistCircumference || !restingHeartRate || !sleepHours || 
            !proteinIntake || !cardioMinutes) {
            setError("Please complete all mandatory progress fields");
            return;
        }

        // Validate optional progress fields required at signup
        if (!bodyFat || !muscleMass || !workoutFrequency || !workoutDuration) {
            setError("Please complete all optional progress fields");
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                fitnessGoal: goal,
                fitnessLevel: level,
                activityType: activity,
                progress: {
                    weight: Number(weight),
                    waistCircumference: Number(waistCircumference),
                    restingHeartRate: Number(restingHeartRate),
                    sleepHours: Number(sleepHours),
                    proteinIntake: Number(proteinIntake),
                    cardioMinutes: Number(cardioMinutes),
                    stressLevel: Number(stressLevel),
                    bodyFat: Number(bodyFat),
                    muscleMass: Number(muscleMass),
                    workoutFrequency: Number(workoutFrequency),
                    workoutDuration: Number(workoutDuration)
                }
            };

            await api("/users/setup", {
                method: "POST",
                body: JSON.stringify(payload)
            });

            navigate("/user/plan", { replace: true });
        } catch (err: any) {
            setError(err.message || "Failed to save user data");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="user-data-form">
            <h2>Complete Your Profile</h2>

            {error && <p className="user-data-form__error">{error}</p>}

            <label>
                Fitness Goal *
                <select value={goal} onChange={e => setGoal(e.target.value as FitnessGoal)} required>
                    <option value="">Select goal</option>
                    {[
                        "FAT_LOSS",
                        "WEIGHT_GAIN",
                        "MUSCLE_GAIN",
                        "MAINTENANCE",
                        "STRENGTH_INCREASE",
                        "ENDURANCE_INCREASE",
                        "FLEXIBILITY",
                        "MOBILITY",
                        "BALANCE",
                        "ATHLETIC_PERFORMANCE",
                        "PHYSICAL_REHABILITATION"
                    ].map(g => (
                        <option key={g} value={g}>{g.replace(/_/g, " ")}</option>
                    ))}
                </select>
            </label>

            {/* Level */}
            <label>
                Fitness Level *
                <select value={level} onChange={e => setLevel(e.target.value as FitnessLevel)} required>
                    <option value="">Select level</option>
                    {["BEGINNER", "INTERMEDIATE", "ADVANCED", "ATHLETE"].map(l => (
                        <option key={l} value={l}>{l}</option>
                    ))}
                </select>
            </label>

            {/* Activity */}
            <label>
                Activity Type *
                <select
                    value={activity}
                    onChange={e => setActivity(e.target.value as ActivityType)}
                    disabled={!goal || !level || loadingActivities}
                    required
                >
                    <option value="">
                        {loadingActivities ? "Loading activities..." : "Select activity"}
                    </option>
                    {allowedActivities.map(a => (
                        <option key={a} value={a}>{a.replace(/_/g, " ")}</option>
                    ))}
                </select>
            </label>

            <label>
                Weight (kg) *
                <input
                    type="number"
                    value={weight}
                    onChange={e => setWeight(e.target.value)}
                    min={20}
                    max={300}
                    step="0.1"
                    required
                />
            </label>

            <label>
                Waist Circumference (cm) *
                <input
                    type="number"
                    value={waistCircumference}
                    onChange={e => setWaistCircumference(e.target.value)}
                    min={40}
                    max={200}
                    step="0.1"
                    required
                />
            </label>

            <label>
                Resting Heart Rate (bpm) *
                <input
                    type="number"
                    value={restingHeartRate}
                    onChange={e => setRestingHeartRate(e.target.value)}
                    min={30}
                    max={200}
                    required
                />
            </label>

            <label>
                Sleep Hours *
                <input
                    type="number"
                    value={sleepHours}
                    onChange={e => setSleepHours(e.target.value)}
                    min={0}
                    max={24}
                    step="0.1"
                    required
                />
            </label>

            <label>
                Protein Intake (g) *
                <input
                    type="number"
                    value={proteinIntake}
                    onChange={e => setProteinIntake(e.target.value)}
                    min={0}
                    max={400}
                    step="0.1"
                    required
                />
            </label>

            <label>
                Cardio Minutes *
                <input
                    type="number"
                    value={cardioMinutes}
                    onChange={e => setCardioMinutes(e.target.value)}
                    min={0}
                    max={1000}
                    required
                />
            </label>

            <label>
                Stress Level (1-5) *
                <input
                    type="number"
                    value={stressLevel}
                    onChange={e => setStressLevel(e.target.value)}
                    min={1}
                    max={5}
                    required
                />
            </label>

            <label>
                Body Fat (%) *
                <input
                    type="number"
                    value={bodyFat}
                    onChange={e => setBodyFat(e.target.value)}
                    min={2}
                    max={70}
                    step="0.1"
                    required
                />
            </label>

            <label>
                Muscle Mass (kg) *
                <input
                    type="number"
                    value={muscleMass}
                    onChange={e => setMuscleMass(e.target.value)}
                    min={5}
                    max={80}
                    step="0.1"
                    required
                />
            </label>

            <label>
                Workout Frequency (per week) *
                <input
                    type="number"
                    value={workoutFrequency}
                    onChange={e => setWorkoutFrequency(e.target.value)}
                    min={0}
                    max={14}
                    required
                />
            </label>

            <label>
                Workout Duration (minutes) *
                <input
                    type="number"
                    value={workoutDuration}
                    onChange={e => setWorkoutDuration(e.target.value)}
                    min={0}
                    max={300}
                    required
                />
            </label>

            <button type="submit" disabled={submitting}>
                {submitting ? "Saving..." : "Complete Setup"}
            </button>
        </form>
    );
}
