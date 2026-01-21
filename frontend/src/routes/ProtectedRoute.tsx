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

  if (isLoading) return null;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (role && user.role !== role) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
