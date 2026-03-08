import { useEffect, useRef, useState } from "react";
import { askRag } from "../../services/rag.service";
import ChatInput from "../../components/chatbot/ChatInput";
import ChatMessage from "../../components/chatbot/ChatMessage";
import "./RagChat.css";

type UiMessage = {
  id: string;
  sender: "user" | "ai";
  text: string;
};

const RagChat = () => {
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<UiMessage[]>([
    {
      id: "welcome-rag",
      sender: "ai",
      text: "RAG is live. Ask something about your stored progress, routines, or plans.",
    },
  ]);
  const endRef = useRef<HTMLDivElement | null>(null);

  const onSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || sending) return;

    setMessages((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, sender: "user", text: trimmed },
    ]);
    setInput("");
    setSending(true);
    try {
      const reply = await askRag(trimmed);
      setMessages((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, sender: "ai", text: reply || "No response." },
      ]);
    } catch (error: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          sender: "ai",
          text: error?.message || "Failed to fetch RAG response.",
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  return (
    <section className="rag-page">
      <header className="rag-page__header">
        <h2>RAG Assistant</h2>
        <p>
          Vector similarity retrieval over your embedded records.
        </p>
      </header>

      <div className="rag-page__messages">
        {messages.map((message) => (
          <ChatMessage
            key={message.id}
            text={message.text}
            variant={message.sender === "user" ? "user" : "bot"}
          />
        ))}
        <div ref={endRef} />
      </div>

      <div className="rag-page__composer">
        <ChatInput
          value={input}
          onChange={setInput}
          onSend={onSend}
          disabled={sending}
        />
      </div>
    </section>
  );
};

export default RagChat;
