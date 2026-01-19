import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

type Props = {
  allowedRole: "USER" | "TRAINER";
  children: JSX.Element;
};

const RoleBasedRoute = ({ allowedRole, children }: Props) => {
  const { user } = useAuth();

  if (!user) return null;

  if (user.role !== allowedRole) {
    return (
      <Navigate
        to={user.role === "USER" ? "/user/progress" : "/trainer/clients"}
        replace
      />
    );
  }

  return children;
};

export default RoleBasedRoute;
