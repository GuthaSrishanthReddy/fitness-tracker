import { Routes, Route } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import Dashboard from "../pages/user/Dashboard";
import UserLayout from "../layouts/UserLayout";

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

/* Trainer */
import MyClients from "../pages/trainer/MyClients";

const AppRoutes = () => {
  return (
    <Routes>
      {/* 🌍 Public */}
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

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
  </Route>

      
      {/* 🧑‍🏫 TRAINER (protected) */}
      <Route
        path="/trainer/clients"
        element={
          <ProtectedRoute role="TRAINER">
            <MyClients />
          </ProtectedRoute>
        }
      />

      {/* ❌ 404 — NOT redirect */}
      <Route path="*" element={<div>Page not found</div>} />
    </Routes>
  );
};

export default AppRoutes;
