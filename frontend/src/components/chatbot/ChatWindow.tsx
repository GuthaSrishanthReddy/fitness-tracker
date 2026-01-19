import ChatInput from "./ChatInput";
import ChatMessage from "./ChatMessage";
import "./ChatWindow.css";

export default function ChatWindow() {
  return (
    <div className="chat-window">
      <ChatMessage text="Hi! Ask me anything." />
      <ChatInput />
    </div>
  );
}
