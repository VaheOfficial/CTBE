import express from "express";
import { errorResponse } from "./utils/response";
import { connectDB } from "./config/db";
import cors from "cors";
import cookieParser from "cookie-parser";
import http from "node:http";
import { WebSocketServer } from "ws";
import { streamAudioFileToClient } from "./services/audioStreaming.service";
import { globalCleanUp } from "./services/global.service";

// Middleware imports
import { detectDeviceInfo } from "./middleware/deviceInfo.middleware";

// Route imports
import testRoutes from "./routes/test.routes";
import authRoutes from "./routes/auth.route";
import userRoutes from "./routes/user.route";
import globalRoutes from "./routes/global.route";

// Connect to the database.
connectDB();

// Create an HTTP server for the WebSocket server.
const WS_PORT = 8080;
const wsServerHttp = http.createServer();
const wss = new WebSocketServer({ server: wsServerHttp });

// Start streaming the audio file to every WebSocket client.
streamAudioFileToClient(wss);

// Run globalCleanUp every minute (60000 milliseconds)
setInterval(globalCleanUp, 60000);

// Start the WebSocket server.
wsServerHttp.listen(WS_PORT, () => {
  console.log(`WebSocket Audio Server is running on port ${WS_PORT}`);
});

// Create and configure the Express server.
const app = express();
const port = process.env.PORT ?? 5000;

const corsOptions = {
  origin: ["http://localhost:3000", "http://localhost:3001"],
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

// Catch-all route.
app.use((req, res) => {
  errorResponse(res, "Not Found", 404);
});

// Start the Express HTTP server.
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
