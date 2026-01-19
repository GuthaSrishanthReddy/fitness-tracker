import { useState } from "react";
import ChatWindow from "./ChatWindow";
import "./ChatbotFloatingButton.css";

export default function ChatbotFloatingButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="chatbot-btn" onClick={() => setOpen(o => !o)}>AI</button>
      {open && <ChatWindow />}
    </>
  );
}
