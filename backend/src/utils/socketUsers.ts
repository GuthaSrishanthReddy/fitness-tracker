/**
 * Map to track which users are connected via Socket.IO
 * Structure: { userId: socketId }
 */
const connectedUsers = new Map<string, string>();

export const socketUsers = {
  /**
   * Add a user connection
   */
  addUser: (userId: string, socketId: string) => {
    connectedUsers.set(userId, socketId);
  },

  /**
   * Remove a user connection
   */
  removeUser: (userId: string) => {
    connectedUsers.delete(userId);
  },

  /**
   * Get socket ID for a user
   */
  getSocketId: (userId: string): string | undefined => {
    return connectedUsers.get(userId);
  },

  /**
   * Check if a user is online
   */
  isUserOnline: (userId: string): boolean => {
    return connectedUsers.has(userId);
  },

  /**
   * Get all connected users
   */
  getAllUsers: () => {
    return Array.from(connectedUsers.entries());
  },

  /**
   * Clear all connections
   */
  clearAll: () => {
    connectedUsers.clear();
  },
};
