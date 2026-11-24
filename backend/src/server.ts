import { createServer } from "http";
import app from "./app";
import { env } from "./config/env";
import { prisma } from "./config/db";
import { initializeSocket } from "./config/socket";
import { setupSocketEvents } from "./config/socketEvents";

const PORT = env.PORT;

/* -------------------- Create HTTP Server -------------------- */

const httpServer = createServer(app);

/* -------------------- Initialize Socket.IO -------------------- */

initializeSocket(httpServer);
setupSocketEvents();

/* -------------------- Start Server -------------------- */

const server = httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 WebSocket enabled for real-time messaging`);
});

/* -------------------- Graceful Shutdown -------------------- */

const shutdown = async (signal: string) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);

  server.close(async () => {
    try {
      await prisma.$disconnect();
      console.log("🛑 Server closed & Prisma disconnected");
      process.exit(0);
    } catch (error) {
      console.error("❌ Error during shutdown", error);
      process.exit(1);
    }
  });
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
