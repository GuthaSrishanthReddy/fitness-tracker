import React, { useState, useRef, useEffect } from "react";
import { useConversationMessages, useMessageSender } from "../hooks/useMessaging";
import { useAuth } from "../context/AuthContext";
import "./MessagingComponent.css";

interface MessagingComponentProps {
  conversationId: string;
  otherUserName: string;
}

/**
 * MessagingComponent - A sample messaging UI component
 * Demonstrates how to use the messaging hooks and context
 */
export const MessagingComponent: React.FC<MessagingComponentProps> = ({
  conversationId,
  otherUserName,
}) => {
  const { user } = useAuth();
  const { messages, isAnyoneTyping, getTypingUserNames } =
    useConversationMessages(conversationId);
  const { sendMessage, setTyping, isLoading } = useMessageSender(conversationId);

  const [inputValue, setInputValue] = useState("");
  const [senderNames] = useState<Map<string, string>>(new Map());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Build sender names map as messages arrive
  useEffect(() => {
    messages.forEach((msg) => {
      senderNames.set(msg.senderId, msg.senderName);
    });
  }, [messages, senderNames]);

  const handleSendMessage = () => {
    if (inputValue.trim()) {
      sendMessage(inputValue);
      setInputValue("");
      setTyping(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    // Set typing indicator
    setTyping(true);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const typingUserNames = getTypingUserNames(senderNames);

  return (
    <div className="messaging-container">
      <div className="messaging-header">
        <h2>{otherUserName}</h2>
        <div className="online-status">
          <div className="status-dot"></div>
          <span>Online</span>
        </div>
      </div>

      <div className="messages-container">
        {messages.length === 0 ? (
          <div className="no-messages">
            <p>No messages yet. Start a conversation!</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`message ${
                message.senderId === user?.id ? "sent" : "received"
              }`}
            >
              <div className="message-content">
                <div className="message-sender">{message.senderName}</div>
                <div className="message-text">{message.content}</div>
                <div className="message-time">
                  {new Date(message.createdAt).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))
        )}

        {isAnyoneTyping() && (
          <div className="typing-indicator">
            <div className="typing-text">
              {typingUserNames.length > 0
                ? `${typingUserNames.join(", ")} is typing...`
                : "Someone is typing..."}
            </div>
            <div className="typing-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="messaging-input">
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          placeholder="Type a message..."
          disabled={isLoading}
          className="message-input-field"
        />
        <button
          onClick={handleSendMessage}
          disabled={isLoading || !inputValue.trim()}
          className="send-button"
        >
          {isLoading ? "Sending..." : "Send"}
        </button>
      </div>
    </div>
  );
};

export default MessagingComponent;
