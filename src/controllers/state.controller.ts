import type { Request, Response } from "express";

interface VideoState {
    isPlaying: boolean;
    link: string;
}

interface AudioState {
    isPlaying: boolean;
    link: string;
}

interface LaunchState {
    timer: number;
    launching: boolean;
    prelaunch: boolean;
    abort: boolean;
    post: boolean;
    channel: "low" | "normal" | "high";
}

const videoState: VideoState = {
    "isPlaying": false,
    "link": ""
}

const audioState: AudioState = {
    "isPlaying": false,
    "link": ""
}

const launchState: LaunchState = {
    "timer": 0,
    "launching": false,
    "prelaunch": false,
    "abort": false,
    "post": false,
    "channel": "low", 
}

export const state = {
    "video": videoState,
    "audio": audioState,
    "launch": launchState
}

async function rocketState() {
    
}
