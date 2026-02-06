import { Routes, Route } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import TrainerDashboard from "../pages/trainer/TrainerDashboard";
import Dashboard from "../pages/user/Dashboard";
import UserLayout from "../layouts/UserLayout";
import TrainerLayout from "../layouts/TrainerLayout";

/* Public */
import Home from "../pages/public/Home";
import Login from "../pages/public/Login";
import Signup from "../pages/public/Signup";


/* User */
import MyProgress from "../pages/user/MyProgress";
import MyPlan from "../pages/user/MyPlan";
import MyTrainer from "../pages/user/MyTrainer";
import ExploreTrainers from "../pages/user/ExploreTrainers";
import Profile from "../pages/user/Profile";
import UserDataForm from "../pages/user/UserDataForm";

/* Trainer */
import MyClients from "../pages/trainer/MyClients";
import ExploreClients from "../pages/trainer/ExploreClients";
import ClientDetails from "../pages/trainer/ClientDetails";
import MyHistory from "../pages/trainer/MyHistory";
import TrainerProfile from "../pages/trainer/Profile"
import ChatBotWindow from "../components/chatbot/ChatWindow";

const AppRoutes = () => {
  return (
    <Routes>
      {/* 🌍 Public */}
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/chatBot" element={<ChatBotWindow />} />

      {/* 👤 USER (protected + layout) */}
<Route
  path="/user"
  element={
    <ProtectedRoute role="USER">
      <UserLayout />
    </ProtectedRoute>
  }
>
  <Route path="dashboard" element={<Dashboard />} />
  <Route path="plan" element={<MyPlan />} />
  <Route path="progress" element={<MyProgress />} />
  <Route path="my-trainer" element={<MyTrainer />} />
  <Route path="explore-trainers" element={<ExploreTrainers />} />
  <Route path="profile" element={<Profile />} />
  <Route path="user-data" element={<UserDataForm />} />
  </Route>

      
      {/* 🧑‍🏫 TRAINER (protected) */}
      <Route
  path="/trainer"
  element={
    <ProtectedRoute role="TRAINER">
      <TrainerLayout />
    </ProtectedRoute>
  }
>
  <Route path="dashboard" element={<TrainerDashboard />} />
  <Route path="clients" element={<MyClients />} />
  <Route path="explore-clients" element={<ExploreClients />}/>
  <Route path="client-details" element={<ClientDetails/>}/>
  <Route path="history" element={<MyHistory/>}/>
  <Route path="profile" element={<TrainerProfile/>}/>
  {/* other trainer routes */}
</Route>


      {/* ❌ 404 — NOT redirect */}
      <Route path="*" element={<div>Page not found</div>} />
    </Routes>
  );
};

export default AppRoutes;
