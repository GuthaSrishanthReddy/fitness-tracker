import { useEffect, useState, useCallback, useRef } from "react";
import { useMessages } from "../context/MessageContext";

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
}

export const useConversationMessages = (conversationId: string) => {
  const { messages: allMessages, typingUsers: allTypingUsers, joinConversation, leaveConversation } = useMessages();
  const [conversationMessages, setConversationMessages] = useState<Message[]>([]);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);

  // Join conversation on mount
  useEffect(() => {
    joinConversation(conversationId);

    return () => {
      leaveConversation(conversationId);
    };
  }, [conversationId, joinConversation, leaveConversation]);

  // Update conversation messages when global messages change
  useEffect(() => {
    setConversationMessages(allMessages.get(conversationId) || []);
  }, [allMessages, conversationId]);

  // Update typing users when global typing users change
  useEffect(() => {
    setTypingUsers(allTypingUsers.get(conversationId) || []);
  }, [allTypingUsers, conversationId]);

  const isAnyoneTyping = useCallback(() => {
    return typingUsers.length > 0;
  }, [typingUsers]);

  const getTypingUserNames = useCallback((senderNames: Map<string, string>): string[] => {
    return typingUsers.map((user) => senderNames.get(user.userId) || "Someone").filter((name) => name !== "You");
  }, [typingUsers]);

  return {
    messages: conversationMessages,
    typingUsers,
    isAnyoneTyping,
    getTypingUserNames,
  };
};

export const useMessageSender = (conversationId: string) => {
  const { sendMessage, isTyping } = useMessages();
  const [isLoading, setIsLoading] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSendMessage = useCallback(
    async (content: string) => {
      if (!content.trim()) {
        return;
      }

      setIsLoading(true);
      try {
        sendMessage(conversationId, content);
        // Stop typing indicator when message is sent
        isTyping(conversationId, false);
      } catch (error) {
        console.error("Error sending message:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [conversationId, sendMessage, isTyping]
  );

  const handleTyping = useCallback(
    (isUserTyping: boolean) => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      isTyping(conversationId, isUserTyping);

      if (isUserTyping) {
        typingTimeoutRef.current = setTimeout(() => {
          isTyping(conversationId, false);
        }, 3000); // Stop typing indicator after 3 seconds of inactivity
      }
    },
    [conversationId, isTyping]
  );

  return {
    sendMessage: handleSendMessage,
    setTyping: handleTyping,
    isLoading,
  };
};
