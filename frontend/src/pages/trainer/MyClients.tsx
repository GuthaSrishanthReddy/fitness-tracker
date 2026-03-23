import { Link } from "react-router-dom";
import "./MyClients.css";

const MyClients = () => {
  return (
    <div className="my-clients">
      <div className="my-clients__header">
        <h2>My Clients</h2>
        <Link to="/trainer/requests" className="my-clients__requests-btn">
          Requests
        </Link>
      </div>

      <div className="my-clients__grid">
        {/* ClientCard */}
      </div>
    </div>
  );
};

export default MyClients;
