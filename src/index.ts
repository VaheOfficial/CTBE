import express from "express";
import { errorResponse } from "./utils/response";
import { connectDB } from "./config/db";
import cors from "cors";
import cookieParser from "cookie-parser";
import http from "node:http";
import { WebSocketServer } from "ws";
import { streamAudioFileToClient } from "./services/audioStreaming.service";
import { initVideoStreamingServer, getVideoStreamingServer, stopVideoStreamingServer } from "./services/videoStreaming.service";
import { globalCleanUp } from "./services/global.service";
import { kerberosClient, kerberosServer } from "./services/kerberos.service";

// Middleware imports
import { detectDeviceInfo } from "./middleware/deviceInfo.middleware";

// Route imports
import testRoutes from "./routes/test.routes";
import authRoutes from "./routes/auth.route";
import userRoutes from "./routes/user.route";
import globalRoutes from "./routes/global.route";
import weatherRoutes from "./routes/weather.route";
// Connect to the database.
connectDB();

// Create an HTTP server for the WebSocket server.
const WS_PORT = 8081;
const wsServerHttp = http.createServer();
const wss = new WebSocketServer({ server: wsServerHttp });

// Initialize Kerberos server
// kerberosServer();

// Initialize video streaming with default streams
initVideoStreamingServer();
console.log(`Video streaming server initialized ${JSON.stringify(getVideoStreamingServer())}`);

// Start streaming the audio file to every WebSocket client.
streamAudioFileToClient(wss);
// streamVideoFileToClient(wss);

// Run globalCleanUp every minute (60000 milliseconds)
setInterval(globalCleanUp, 60000);

// Start the WebSocket server.
wsServerHttp.listen(WS_PORT, () => {
  console.log(`WebSocket Server is running on port ${WS_PORT}`);
});

// Graceful shutdown handling
const shutdown = () => {
  console.log('Shutting down server...');
  stopVideoStreamingServer();
  process.exit(0);
};

// Handle termination signals
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Create and configure the Express server.
const app = express();
const port = process.env.PORT ?? 5000;

const corsOptions = {
  origin: ["http://localhost:3000", "http://localhost:3001", "http://192.168.1.51:3000"],
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true, // Allow cookies to be sent with requests.
};

app.use(express.json());
app.use(cookieParser());
app.use(cors(corsOptions));

// Apply device detection middleware.
app.use(detectDeviceInfo);

// Routes.
app.use("/test", testRoutes);
app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/global", globalRoutes);
app.use("/weather", weatherRoutes);

// Catch-all route.
app.use((req, res) => {
  errorResponse(res, "Not Found", 404);
});

// Start the Express HTTP server.
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
