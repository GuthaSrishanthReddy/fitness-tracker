import React, { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { socketService } from "../services/socket.service";
import { useAuth } from "./AuthContext";

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  content: string;
  createdAt: string;
}

interface TypingUser {
  userId: string;
  conversationId: string;
  isTyping: boolean;
}

interface ConversationUser {
  userId: string;
  conversationId: string;
}

interface MessageContextType {
  messages: Map<string, Message[]>;
  typingUsers: Map<string, TypingUser[]>;
  onlineUsers: Set<string>;
  sendMessage: (conversationId: string, content: string) => void;
  joinConversation: (conversationId: string) => void;
  leaveConversation: (conversationId: string) => void;
  isTyping: (conversationId: string, isTyping: boolean) => void;
  addMessage: (conversationId: string, message: Message) => void;
  clearConversationMessages: (conversationId: string) => void;
}

const MessageContext = createContext<MessageContextType | undefined>(undefined);

interface MessageProviderProps {
  children: ReactNode;
}

export const MessageProvider: React.FC<MessageProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Map<string, Message[]>>(new Map());
  const [typingUsers, setTypingUsers] = useState<Map<string, TypingUser[]>>(new Map());
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  // Initialize Socket.IO connection
  useEffect(() => {
    if (!user) {
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      return;
    }

    try {
      socketService.connect(token);

      // Set up message listeners
      socketService.onMessageReceived((message: Message) => {
        setMessages((prev) => {
          const conversationMessages = prev.get(message.conversationId) || [];
          return new Map(prev).set(message.conversationId, [...conversationMessages, message]);
        });
      });

      socketService.onUserTyping((data: TypingUser) => {
        setTypingUsers((prev) => {
          const conversationTyping = prev.get(data.conversationId) || [];
          const filtered = conversationTyping.filter((t) => t.userId !== data.userId);
          if (data.isTyping) {
            return new Map(prev).set(data.conversationId, [...filtered, data]);
          }
          return new Map(prev).set(data.conversationId, filtered);
        });
      });

      socketService.onUserJoined((data: ConversationUser) => {
        console.log(`User ${data.userId} joined conversation ${data.conversationId}`);
      });

      socketService.onUserLeft((data: ConversationUser) => {
        console.log(`User ${data.userId} left conversation ${data.conversationId}`);
      });

      socketService.onUserOnline((data: { userId: string }) => {
        setOnlineUsers((prev) => new Set(prev).add(data.userId));
      });

      socketService.onUserOffline((data: { userId: string }) => {
        setOnlineUsers((prev) => {
          const updated = new Set(prev);
          updated.delete(data.userId);
          return updated;
        });
      });

      return () => {
        socketService.removeAllListeners();
      };
    } catch (error) {
      console.error("Failed to initialize Socket.IO:", error);
    }
  }, [user]);

  const sendMessage = (conversationId: string, content: string) => {
    try {
      socketService.sendMessage(conversationId, content);
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  const joinConversation = (conversationId: string) => {
    try {
      socketService.joinConversation(conversationId);
    } catch (error) {
      console.error("Failed to join conversation:", error);
    }
  };

  const leaveConversation = (conversationId: string) => {
    try {
      socketService.leaveConversation(conversationId);
    } catch (error) {
      console.error("Failed to leave conversation:", error);
    }
  };

  const isTyping = (conversationId: string, typing: boolean) => {
    try {
      socketService.sendTypingIndicator(conversationId, typing);
    } catch (error) {
      console.error("Failed to send typing indicator:", error);
    }
  };

  const addMessage = (conversationId: string, message: Message) => {
    setMessages((prev) => {
      const conversationMessages = prev.get(conversationId) || [];
      return new Map(prev).set(conversationId, [...conversationMessages, message]);
    });
  };

  const clearConversationMessages = (conversationId: string) => {
    setMessages((prev) => {
      const updated = new Map(prev);
      updated.delete(conversationId);
      return updated;
    });
  };

  return (
    <MessageContext.Provider
      value={{
        messages,
        typingUsers,
        onlineUsers,
        sendMessage,
        joinConversation,
        leaveConversation,
        isTyping,
        addMessage,
        clearConversationMessages,
      }}
    >
      {children}
    </MessageContext.Provider>
  );
};

export const useMessages = (): MessageContextType => {
  const context = useContext(MessageContext);
  if (!context) {
    throw new Error("useMessages must be used within a MessageProvider");
  }
  return context;
};
