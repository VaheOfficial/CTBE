import express from "express";
import { getAudio, getAudioSources, getAudioState } from "../controllers/audio.controller";

const router = express.Router();

router.get("/", (req, res) => {
    getAudioSources(req, res);
});

router.get("/play", (req, res) => {
    getAudio(req, res);
});

export default router;