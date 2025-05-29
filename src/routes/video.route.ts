import express from "express";
import { getVideoSources, getPreviews, streamVideo } from "../controllers/video.controller";

const router = express.Router();

// Get all available video sources
router.get("/", (req, res) => {
    getVideoSources(req, res);
});

// Get preview images for all video sources
router.get('/previews', (req, res) => {
    getPreviews(req, res);
});

// Stream specific video by name
router.get('/stream/:streamName', (req, res) => {
    streamVideo(req, res);
});

export default router;
