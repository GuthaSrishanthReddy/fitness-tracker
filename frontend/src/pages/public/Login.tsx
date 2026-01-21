import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginApi } from "../../services/auth.service";
import type { AuthResponse } from "../../types/auth.types";

import "./Login.css";

const Login = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    try {
      const res: AuthResponse = await loginApi(email, password);

      // store JWT token
      localStorage.setItem("token", res.token);

      // redirect based on role
      if (res.user.role === "USER") {
        navigate("/user/progress");
      } else {
        navigate("/trainer/clients");
      }
    } catch (err) {
      setError("Invalid email or password");
    }
  };

  return (
    <div className="login">
      <h2 className="login__title">Login</h2>

      {error && <p className="login__error">{error}</p>}

      <form onSubmit={handleSubmit} className="login__form">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button type="submit">Login</button>
      </form>
    </div>
  );
};

export default Login;
