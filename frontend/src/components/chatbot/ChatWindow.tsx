import { useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ChatInput from "./ChatInput";
import ChatMessage from "./ChatMessage";
import "./ChatWindow.css";

type ChatWindowProps = {
  onClose?: () => void;
};

export default function ChatWindow({ onClose }: ChatWindowProps) {
  const navigate = useNavigate();

  const handleClose = useCallback(() => {
    if (onClose) {
      onClose();
    } else {
      navigate(-1);
    }
  }, [navigate, onClose]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleClose]);

  return (
    <div className="chat-window">
      <header className="chat-window__header">
        <div>
          <p className="chat-window__title">AI Coach</p>
          <p className="chat-window__subtitle">Fitness guidance on demand</p>
        </div>
        <div className="chat-window__header-actions">
          <span className="chat-window__status">Online</span>
          <button
            type="button"
            className="chat-window__close"
            aria-label="Close chat"
            onClick={handleClose}
          >
            Close
          </button>
        </div>
      </header>

      <div className="chat-window__messages">
        <ChatMessage text="Hi! Ask me anything about training or nutrition." />
        <ChatMessage
          variant="user"
          text="Can you suggest a quick post‑workout meal?"
        />
        <ChatMessage text="Sure. Try Greek yogurt with berries and a handful of nuts for protein and carbs." />
      </div>

      <div className="chat-window__composer">
        <ChatInput />
      </div>
    </div>
  );
}
