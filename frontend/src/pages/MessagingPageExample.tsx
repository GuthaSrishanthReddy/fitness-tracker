import React, { useEffect, useState } from "react";
import MessagingComponent from "../components/MessagingComponent";
import { useAuth } from "../context/AuthContext";
import { useMessages } from "../context/MessageContext";
import { api } from "../services/api";

interface Conversation {
  id: string;
  participants: Array<{ id: string; name: string; email: string }>;
  messages: Array<{
    sender: { name: string };
    content: string;
  }>;
}

/**
 * SAMPLE: MessagingPage - Shows how to integrate the messaging system
 * This demonstrates:
 * 1. Loading conversations from API
 * 2. Creating new conversations with trainers/users
 * 3. Using the MessagingComponent
 */
export const MessagingPageExample: React.FC = () => {
  const { user } = useAuth();
  const { joinConversation } = useMessages();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load conversations on component mount
  useEffect(() => {
    loadConversations();
  }, [user?.id]);

  const loadConversations = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get all conversations for current user
      const response = await api<Conversation[]>("/messages/conversations");
      setConversations(response);

      // If there are conversations, select the first one
      if (response.length > 0) {
        setSelectedConversationId(response[0].id);
      }
    } catch (err) {
      setError("Failed to load conversations");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectConversation = (conversationId: string) => {
    setSelectedConversationId(conversationId);
    joinConversation(conversationId);
  };

  if (!user) {
    return <div>Please log in to access messaging</div>;
  }

  const selectedConversation = conversations.find(
    (c) => c.id === selectedConversationId
  );

  const otherParticipant = selectedConversation?.participants.find(
    (p) => p.id !== user.id
  );

  return (
    <div className="messaging-page">
      <div className="conversations-sidebar">
        <h2>Conversations</h2>
        {isLoading && <p>Loading conversations...</p>}
        {error && <p className="error">{error}</p>}

        <div className="conversations-list">
          {conversations.map((conversation) => {
            const otherUser = conversation.participants.find(
              (p) => p.id !== user.id
            );
            const lastMessage = conversation.messages[0];

            return (
              <div
                key={conversation.id}
                className={`conversation-item ${
                  selectedConversationId === conversation.id ? "active" : ""
                }`}
                onClick={() => handleSelectConversation(conversation.id)}
              >
                <div className="conversation-name">{otherUser?.name}</div>
                <div className="conversation-preview">
                  {lastMessage
                    ? `${lastMessage.sender.name}: ${lastMessage.content.substring(
                        0,
                        30
                      )}...`
                    : "No messages yet"}
                </div>
              </div>
            );
          })}
        </div>

        <button
          className="new-conversation-btn"
          onClick={() => {
            // This would open a dialog to select a trainer/user
            // For now, this is a placeholder
            alert("Select a trainer or user to start a conversation");
          }}
        >
          + New Conversation
        </button>
      </div>

      <div className="messaging-area">
        {selectedConversation && otherParticipant ? (
          <MessagingComponent
            conversationId={selectedConversationId!}
            otherUserName={otherParticipant.name}
          />
        ) : (
          <div className="no-conversation-selected">
            <p>Select a conversation or start a new one</p>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * SAMPLE: TrainerUserMessaging - Example for trainer-user specific messaging
 * Shows how to start messaging with a specific trainer or user
 */
export const TrainerUserMessagingExample: React.FC<{
  otherUserId: string;
  otherUserName: string;
}> = ({ otherUserId, otherUserName }) => {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { joinConversation } = useMessages();

  useEffect(() => {
    // Get or create conversation with the other user
    const getConversation = async () => {
      try {
        const response = await api<Conversation>(
          `/messages/conversations/${otherUserId}`
        );
        setConversationId(response.id);
        joinConversation(response.id);
      } catch (error) {
        console.error("Failed to get conversation:", error);
      } finally {
        setIsLoading(false);
      }
    };

    getConversation();
  }, [otherUserId, joinConversation]);

  if (isLoading) {
    return <div>Loading conversation...</div>;
  }

  if (!conversationId) {
    return <div>Failed to load conversation</div>;
  }

  return (
    <MessagingComponent
      conversationId={conversationId}
      otherUserName={otherUserName}
    />
  );
};

export default MessagingPageExample;
