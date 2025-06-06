import express from "express";
import { errorResponse } from "./utils/response";
import { connectDB } from "./config/db";
import cors from "cors";
import cookieParser from "cookie-parser";
import http from "node:http";
import { WebSocketServer } from "ws";
import { globalCleanUp } from "./services/global.service";
import path from "node:path";

// Middleware imports
import { detectDeviceInfo } from "./middleware/deviceInfo.middleware";

// Route imports
import testRoutes from "./routes/test.routes";
import authRoutes from "./routes/auth.route";
import userRoutes from "./routes/user.route";
import globalRoutes from "./routes/global.route";
import weatherRoutes from "./routes/weather.route";
import videoRoutes from "./routes/video.route";
import audioRoutes from "./routes/audio.route";
import adminRoutes from "./routes/admin.route";

// Connect to the database.
connectDB();

// Create an HTTP server for the WebSocket server.
const WS_PORT = 8081;
const wsServerHttp = http.createServer();
const wss = new WebSocketServer({ server: wsServerHttp });

// Run globalCleanUp every minute (60000 milliseconds)
setInterval(globalCleanUp, 60000);

// Start the WebSocket server.
wsServerHttp.listen(WS_PORT, () => {
  console.log(`WebSocket Server is running on port ${WS_PORT}`);
});

// Graceful shutdown handling
const shutdown = () => {
  console.log('Shutting down server...');
  process.exit(0);
};

// Handle termination signals
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Create and configure the Express server.
const app = express();
const port = process.env.PORT ?? 5000;

const corsOptions = {
  origin: ["http://localhost:3000", "http://localhost:3001", "http://192.168.1.51:3000", "https://app.deadsec.ai"],
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true, // Allow cookies to be sent with requests.
};

app.use(express.json());
app.use(cookieParser());
app.use(cors(corsOptions));

// Serve static files from the public directory
app.use(express.static(path.join(process.cwd(), 'public')));

// Apply device detection middleware.
app.use(detectDeviceInfo);

// Routes.
app.use("/test", testRoutes);
app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/global", globalRoutes);
app.use("/weather", weatherRoutes);
app.use("/video", videoRoutes);
app.use("/audio", audioRoutes);
app.use("/admin", adminRoutes);

// Catch-all route.
app.use((req, res) => {
  errorResponse(res, "Not Found", 404);
});

// Start the Express HTTP server.
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
