import { Navigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

import "./Home.css";

const Home = () => {
  const { isAuthenticated, user } = useAuth();

  if (isAuthenticated && user) {
    return (
      <Navigate
        to={user.role === "USER" ? "/user/progress" : "/trainer/clients"}
        replace
      />
    );
  }

  return (
    <div className="home">
      <h1 className="home__title">Welcome to Fitness Tracker</h1>
      <p className="home__subtitle">
        Track your health. Train smarter. Grow stronger.
      </p>

      <div className="home__actions">
        <a href="/login" className="home__btn home__btn--primary">
          Login
        </a>
        <a href="/signup" className="home__btn home__btn--secondary">
          Sign Up
        </a>
      </div>
    </div>
  );
};

export default Home;
