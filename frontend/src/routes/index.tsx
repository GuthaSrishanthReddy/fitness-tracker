import { Routes, Route, Navigate } from "react-router-dom";

/* Public pages */
import Home from "../pages/public/Home";
import Login from "../pages/public/Login";
import Signup from "../pages/public/Signup";

/* User pages */
import MyProgress from "../pages/user/MyProgress";
import MyPlan from "../pages/user/MyPlan";
import Profile from "../pages/user/Profile";
import ExploreTrainers from "../pages/user/ExploreTrainers";
import MyTrainer from "../pages/user/MyTrainer";
import UpdateProgress from "../pages/user/UpdateProgress";

/* Trainer pages */
import MyClients from "../pages/trainer/MyClients";
import ExploreClients from "../pages/trainer/ExploreClients";
import ClientDetails from "../pages/trainer/ClientDetails";
import MyHistory from "../pages/trainer/MyHistory";
import TrainerProfile from "../pages/trainer/Profile";

const AppRoutes = () => {
  return (
    <Routes>
      {/* 🏠 ORIGINAL HOME (UNCHANGED UI) */}
      <Route path="/" element={<Home />} />

      {/* 🔓 Public */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      {/* 👤 User */}
      <Route path="/user/progress" element={<MyProgress />} />
      <Route path="/user/plan" element={<MyPlan />} />
      <Route path="/user/profile" element={<Profile />} />
      <Route path="/user/trainers" element={<ExploreTrainers />} />
      <Route path="/user/my-trainer" element={<MyTrainer />} />
      <Route path="/user/update-progress" element={<UpdateProgress />} />

      {/* 🧑‍🏫 Trainer */}
      <Route path="/trainer/clients" element={<MyClients />} />
      <Route path="/trainer/explore" element={<ExploreClients />} />
      <Route path="/trainer/client/:id" element={<ClientDetails />} />
      <Route path="/trainer/history" element={<MyHistory />} />
      <Route path="/trainer/profile" element={<TrainerProfile />} />

      {/* ❌ Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;
