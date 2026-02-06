import "./ChatbotFloatingButton.css";
import { useLocation, useNavigate } from "react-router-dom";

export default function ChatbotFloatingButton() {
  const navigate = useNavigate();
  const location = useLocation();
  const isChatPage = location.pathname.toLowerCase() === "/chatbot";

  if (isChatPage) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        className="chatbot-btn"
        aria-label="Open AI chat"
        onClick={() => navigate("/chatBot")}
      >
        <span className="chatbot-btn__inner">AI</span>
      </button>
    </>
  );
}
