import { Link } from "react-router-dom";
import "./TrainerCard.css";

type Props = {
  name: string;
  expertise: string;
  to: string;
};

const TrainerCard = ({ name, expertise = "", to }: Props) => {
  return (
    <Link to={to} className="trainer-card">
      <h4>{name}</h4>
      <p>{expertise || "View trainer details"}</p>
    </Link>
  );
};

export default TrainerCard;
