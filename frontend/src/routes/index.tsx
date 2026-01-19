import { Routes, Route } from "react-router-dom";

/* layouts */
import PublicLayout from "../layouts/PublicLayout";
import UserLayout from "../layouts/UserLayout";
import TrainerLayout from "../layouts/TrainerLayout";

/* route guards */
import ProtectedRoute from "./ProtectedRoute";
import RoleBasedRoute from "./RoleBasedRoute";

/* public pages */
import Home from "../pages/public/Home";
import Login from "../pages/public/Login";
import Signup from "../pages/public/Signup";

/* user pages */
import MyProgress from "../pages/user/MyProgress";
import UpdateProgress from "../pages/user/UpdateProgress";
import MyPlan from "../pages/user/MyPlan";
import MyTrainer from "../pages/user/MyTrainer";
import ExploreTrainers from "../pages/user/ExploreTrainers";
import UserProfile from "../pages/user/Profile";

/* trainer pages */
import MyClients from "../pages/trainer/MyClients";
import ClientDetails from "../pages/trainer/ClientDetails";
import MyHistory from "../pages/trainer/MyHistory";
import ExploreClients from "../pages/trainer/ExploreClients";
import TrainerProfile from "../pages/trainer/Profile";

const AppRoutes = () => {
  return (
    <Routes>

      {/* ---------- PUBLIC ---------- */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
      </Route>

      {/* ---------- USER ---------- */}
      <Route
        element={
          <ProtectedRoute>
            <RoleBasedRoute allowedRole="USER">
              <UserLayout />
            </RoleBasedRoute>
          </ProtectedRoute>
        }
      >
        <Route path="/user/progress" element={<MyProgress />} />
        <Route path="/user/progress/update" element={<UpdateProgress />} />
        <Route path="/user/plan" element={<MyPlan />} />
        <Route path="/user/my-trainer" element={<MyTrainer />} />
        <Route path="/user/explore-trainers" element={<ExploreTrainers />} />
        <Route path="/user/profile" element={<UserProfile />} />
      </Route>

      {/* ---------- TRAINER ---------- */}
      <Route
        element={
          <ProtectedRoute>
            <RoleBasedRoute allowedRole="TRAINER">
              <TrainerLayout />
            </RoleBasedRoute>
          </ProtectedRoute>
        }
      >
        <Route path="/trainer/clients" element={<MyClients />} />
        <Route path="/trainer/clients/:clientId" element={<ClientDetails />} />
        <Route path="/trainer/history" element={<MyHistory />} />
        <Route path="/trainer/explore-clients" element={<ExploreClients />} />
        <Route path="/trainer/profile" element={<TrainerProfile />} />
      </Route>

    </Routes>
  );
};

export default AppRoutes;
