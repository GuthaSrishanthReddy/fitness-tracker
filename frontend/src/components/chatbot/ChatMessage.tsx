import "./ChatMessage.css";

export default function ChatMessage({ text }: { text: string }) {
  return <div className="chat-message">{text}</div>;
}
