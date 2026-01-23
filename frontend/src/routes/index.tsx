import { Routes, Route } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";

/* Public */
import Home from "../pages/public/Home";
import Login from "../pages/public/Login";
import Signup from "../pages/public/Signup";

/* User */
import MyProgress from "../pages/user/MyProgress";
import MyPlan from "../pages/user/MyPlan";

/* Trainer */
import MyClients from "../pages/trainer/MyClients";

const AppRoutes = () => {
  return (
    <Routes>
      {/* 🌍 Public */}
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      {/* 👤 USER (protected) */}
      <Route
        path="/user/progress"
        element={
          <ProtectedRoute role="USER">
            <MyProgress />
          </ProtectedRoute>
        }
      />
      <Route
        path="/user/plan"
        element={
          <ProtectedRoute role="USER">
            <MyPlan />
          </ProtectedRoute>
        }
      />

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
