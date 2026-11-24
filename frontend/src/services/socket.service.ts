import io, { Socket } from "socket.io-client";

let socket: Socket | null = null;

export const socketService = {
  /**
   * Connect to Socket.IO server
   */
  connect: (token: string): Socket => {
    if (socket?.connected) {
      return socket;
    }

    const apiBaseUrl =
      import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";
    const backendUrl = new URL(apiBaseUrl, window.location.origin).origin;

    socket = io(backendUrl, {
      auth: {
        token,
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    socket.on("connect", () => {
      console.log("Connected to Socket.IO server");
    });

    socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
    });

    socket.on("disconnect", () => {
      console.log("Disconnected from Socket.IO server");
    });

    return socket;
  },

  /**
   * Get existing socket connection
   */
  getSocket: (): Socket | null => {
    return socket;
  },

  /**
   * Disconnect socket
   */
  disconnect: () => {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
  },

  /**
   * Join a conversation
   */
  joinConversation: (conversationId: string) => {
    if (!socket) {
      throw new Error("Socket not connected");
    }
    socket.emit("JOIN_CONVERSATION", { conversationId });
  },

  /**
   * Leave a conversation
   */
  leaveConversation: (conversationId: string) => {
    if (!socket) {
      throw new Error("Socket not connected");
    }
    socket.emit("LEAVE_CONVERSATION", { conversationId });
  },

  /**
   * Send a message
   */
  sendMessage: (conversationId: string, content: string) => {
    if (!socket) {
      throw new Error("Socket not connected");
    }
    socket.emit("SEND_MESSAGE", { conversationId, content });
  },

  /**
   * Send typing indicator
   */
  sendTypingIndicator: (conversationId: string, isTyping: boolean) => {
    if (!socket) {
      throw new Error("Socket not connected");
    }
    socket.emit("TYPING", { conversationId, isTyping });
  },

  /**
   * Listen to messages
   */
  onMessageReceived: (callback: (message: any) => void) => {
    if (!socket) {
      throw new Error("Socket not connected");
    }
    socket.on("message_received", callback);
  },

  /**
   * Listen to user typing
   */
  onUserTyping: (callback: (data: any) => void) => {
    if (!socket) {
      throw new Error("Socket not connected");
    }
    socket.on("user_typing", callback);
  },

  /**
   * Listen to user joined
   */
  onUserJoined: (callback: (data: any) => void) => {
    if (!socket) {
      throw new Error("Socket not connected");
    }
    socket.on("user_joined", callback);
  },

  /**
   * Listen to user left
   */
  onUserLeft: (callback: (data: any) => void) => {
    if (!socket) {
      throw new Error("Socket not connected");
    }
    socket.on("user_left", callback);
  },

  /**
   * Listen to user online
   */
  onUserOnline: (callback: (data: any) => void) => {
    if (!socket) {
      throw new Error("Socket not connected");
    }
    socket.on("user_online", callback);
  },

  /**
   * Listen to user offline
   */
  onUserOffline: (callback: (data: any) => void) => {
    if (!socket) {
      throw new Error("Socket not connected");
    }
    socket.on("user_offline", callback);
  },

  /**
   * Remove listener
   */
  removeListener: (event: string) => {
    if (!socket) {
      throw new Error("Socket not connected");
    }
    socket.off(event);
  },

  /**
   * Remove all listeners
   */
  removeAllListeners: () => {
    if (!socket) {
      throw new Error("Socket not connected");
    }
    socket.removeAllListeners();
  },
};
