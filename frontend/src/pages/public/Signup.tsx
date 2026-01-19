import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

import "./Signup.css";

const Signup = () => {
  const navigate = useNavigate();
  const { signup } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"USER" | "TRAINER">("USER");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    await signup({ name, email, password, role });

    navigate(role === "USER" ? "/user/progress" : "/trainer/clients");
  };

  return (
    <div className="signup">
      <h2 className="signup__title">Create Account</h2>

      <form onSubmit={handleSubmit} className="signup__form">
        <input
          type="text"
          placeholder="Full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <input
          type="email"
          placeholder="Email address"
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

        <select value={role} onChange={(e) => setRole(e.target.value as any)}>
          <option value="USER">User</option>
          <option value="TRAINER">Trainer</option>
        </select>

        <button type="submit">Sign Up</button>
      </form>
    </div>
  );
};

export default Signup;
