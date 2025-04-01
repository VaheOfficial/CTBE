import { createReadStream, existsSync } from "node:fs";
import path from "node:path";
import { WebSocket, type WebSocketServer } from "ws";

// Configuration for the audio stream.
// Adjust these values as needed (these assume a constant bit rate MP3)
const AUDIO_CONFIG = {
  bitRate: 128000,        // in bits per second
  chunkDuration: 100,     // desired duration of each chunk in ms (used to calculate ideal chunk size)
};

const bytesPerSecond = AUDIO_CONFIG.bitRate / 8; // e.g., 128000/8 = 16000 bytes per second
// Calculate chunk size based on desired chunk duration.
const CHUNK_SIZE = Math.floor(bytesPerSecond * (AUDIO_CONFIG.chunkDuration / 1000)); // e.g., 16000 * 0.1 = 1600 bytes

// Adjust this path to point to your audio file.
const AUDIO_FILE_PATH = path.resolve("audio/comm.mp3");

/**
 * Streams the audio file to every new WebSocket client in real time.
 * For each client, we open a read stream with a controlled highWaterMark and delay sending chunks
 * so that playback occurs at the natural rate of the audio.
 */
export const streamAudioFileToClient = (wss: WebSocketServer) => {
  wss.on("connection", (ws: WebSocket, req) => {
    console.log(`New WebSocket client connected from ${req.socket.remoteAddress}`);

    // Function to stream audio from file for a single client.
    const streamAudio = () => {
      if (!existsSync(AUDIO_FILE_PATH)) {
        ws.send(JSON.stringify({ error: "Audio file not found." }));
        ws.close();
        return;
      }
      
      // Create a read stream with a highWaterMark equal to our calculated chunk size.
      const stream = createReadStream(AUDIO_FILE_PATH, { highWaterMark: CHUNK_SIZE });
      console.log("Starting audio stream for a client.");

      stream.on("data", (chunk: Buffer) => {
        // Pause the stream until this chunk has been sent and timed out.
        stream.pause();

        if (ws.readyState === WebSocket.OPEN) {
          ws.send(chunk);
        }

        // Calculate delay: chunk duration in ms = (chunk.length / bytesPerSecond) * 1000
        const delay = (chunk.length / bytesPerSecond) * 1000;
        // Resume reading after the delay to simulate natural playback speed.
        setTimeout(() => {
          stream.resume();
        }, delay);
      });

      stream.on("end", () => {
        console.log("Audio file ended; restarting stream for looping playback.");
        // Restart the stream after a short delay (e.g., 500ms)
        setTimeout(() => {
          if (ws.readyState === WebSocket.OPEN) {
            streamAudio();
          }
        }, 500);
      });

      stream.on("error", (err) => {
        console.error("Error reading audio file:", err);
        ws.close();
      });
    };

    // Start streaming audio to the connected client.
    streamAudio();

    ws.on("close", () => {
      console.log("WebSocket client disconnected.");
    });

    ws.on("error", (err) => {
      console.error("WebSocket error:", err);
    });
  });
};
