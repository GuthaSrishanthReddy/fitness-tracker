import { useEffect, useState } from "react";
import { fetchExploreClients } from "../../services/trainer.service";
import type { ExploreClientItem } from "../../types/client.types";
import "./ExploreClients.css";

const ExploreClients = () => {
  const [clients, setClients] = useState<ExploreClientItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const data = await fetchExploreClients();
        if (active) setClients(data);
      } catch (err: any) {
        if (active) setError(err.message || "Failed to load clients");
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => { active = false; };
  }, []);

  return (
    <div className="explore-clients">
      <h2>Explore Clients</h2>
      <p>Find users looking for personal training</p>

      <div className="explore-clients__grid">
        {loading && <p>Loading clients...</p>}
        {!loading && error && <p>{error}</p>}
        {!loading && !error && clients.length === 0 && (
          <p>No available clients found.</p>
        )}
        {!loading && !error && clients.map((client) => (
          <div key={client.id} className="client-card">
            <h3>{client.name}</h3>
            <p>{client.email}</p>
            {client.fitnessGoal && <p><strong>Goal:</strong> {client.fitnessGoal}</p>}
            {client.fitnessLevel && <p><strong>Level:</strong> {client.fitnessLevel}</p>}
            {client.activityType && <p><strong>Activity:</strong> {client.activityType}</p>}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ExploreClients;
