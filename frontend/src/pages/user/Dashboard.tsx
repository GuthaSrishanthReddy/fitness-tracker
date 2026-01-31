import "./Dashboard.css";
import { useNavigate } from "react-router-dom";
import PlanCard from "../../components/cards/PlanCard";
import TrainerCard from "../../components/cards/TrainerCard";
import ClientCard from "../../components/cards/ClientCard";


const Dashboard = () => {
  const navigate = useNavigate();

  return (
    <div className="dashboard-container">
      {/* Header */}
        <div className="dashboard-header">
            
        <div>
            <h1>Welcome back 👋</h1>
            <p>Let’s continue your fitness journey.</p>
        </div>
    </div>


      {/* Cards Grid */}
      <div className="dashboard-grid">
        {/* My Plan */}
        <div
          className="dashboard-card"
          onClick={() => navigate("/user/plan")}
        >
          <PlanCard />
        </div>

        {/* My Progress */}
        <div
          className="dashboard-card"
          onClick={() => navigate("/user/progress")}
        >
          <ClientCard name="Your Progress" />
        </div>

        {/* My Trainer */}
        <div
          className="dashboard-card"
          onClick={() => navigate("/user/my-trainer")}
        >
          <TrainerCard name="Assigned Trainer" expertise="Strength Training" />
        </div>

        {/* Explore Trainers */}
        <div
          className="dashboard-card"
          onClick={() => navigate("/user/explore-trainers")}
        >
          <TrainerCard name="Find Trainers" expertise="Multiple Specializations" />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
