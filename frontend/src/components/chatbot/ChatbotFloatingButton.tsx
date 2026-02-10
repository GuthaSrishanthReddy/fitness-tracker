import "./ChatbotFloatingButton.css";
import { useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import ChatWindow from "./ChatWindow";

export default function ChatbotFloatingButton() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  // ❌ hide AI completely when logged out
  if (!user) return null;

  return (
    <>
      {!open && (
        <button
          type="button"
          className="chatbot-btn"
          aria-label="Open AI chat"
          onClick={() => setOpen(true)}
        >
          <span className="chatbot-btn__inner">AI</span>
        </button>
      )}

      {open && <ChatWindow onClose={() => setOpen(false)} />}
    </>
  );
}
