import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import type { ReactNode } from "react";

type Role = "USER" | "TRAINER";

interface ProtectedRouteProps {
  children: ReactNode;
  role?: Role;
}

const ProtectedRoute = ({ children, role }: ProtectedRouteProps) => {
  const { user, isLoading } = useAuth();

  // ⏳ While checking auth, show NOTHING BUT BLOCK ROUTING
  if (isLoading) {
    return <div />; // 👈 NOT null
  }

  // 🔐 Not logged in
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // 🚫 Role mismatch
  if (role && user.role !== role) {
    return <Navigate to="/unauthorized" replace />;
  }

  // ✅ Allowed
  return <>{children}</>;
};

export default ProtectedRoute;
