import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchMyClients } from "../../services/trainer.service";
import type { ClientListItem } from "../../types/client.types";
import "./MyClients.css";

const MyClients = () => {
  const [clients, setClients] = useState<ClientListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadClients = async () => {
      try {
        setIsLoading(true);
        setError("");
        const data = await fetchMyClients();
        setClients(data);
      } catch (err: any) {
        setError(err.message || "Failed to load clients.");
      } finally {
        setIsLoading(false);
      }
    };

    void loadClients();
  }, []);

  return (
    <div className="my-clients">
      <div className="my-clients__header">
        <h2>My Clients</h2>
        <Link to="/trainer/requests" className="my-clients__requests-btn">
          Requests
        </Link>
      </div>

      {isLoading ? (
        <div className="my-clients__empty">
          <p>Loading clients...</p>
        </div>
      ) : error ? (
        <div className="my-clients__empty">
          <p>{error}</p>
        </div>
      ) : clients.length === 0 ? (
        <div className="my-clients__empty">
          <p>No clients assigned yet. Accept a request to build your client list.</p>
        </div>
      ) : (
        <div className="my-clients__grid">
          {clients.map((client) => (
            <Link
              key={client.id}
              to={`/trainer/client-details/${client.id}`}
              className="my-clients__card"
            >
              <h3>{client.user.name}</h3>
              <p>{client.user.email}</p>
              <span className="my-clients__since">
                {client.createdAt
                  ? `Client since ${new Date(client.createdAt).toLocaleDateString()}`
                  : "Client relationship active"}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyClients;
