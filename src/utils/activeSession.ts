import ActiveSession from "../models/activeSession.model";
import { v4 as uuidv4 } from "uuid";
import mongoose from "mongoose";
import { generateLog } from "./generateLog";

export const generateActiveSession = async (userId: string, browser: string, device: string, ipAddress: string, location: string) => {
    const activeSession = await ActiveSession.create({
        userId: new mongoose.Types.ObjectId(userId),
        sessionId: uuidv4(),
        browser,
        device,
        ipAddress,
        location,
        createdAt: new Date(),
        lastActive: new Date(),
    });
    await generateLog(userId, "website", "Active session created", "information", "resolved");
    return activeSession;
}

export const deleteActiveSession = async (userId: string, sessionId: string) => {
    await ActiveSession.deleteOne({ userId, sessionId });
    await generateLog(userId, "website", "Active session deleted", "information", "resolved");
}

export const getActiveSessions = async (userId: string) => {
    const activeSessions = await ActiveSession.find({ userId });
    return activeSessions;
}

export const updateActiveSession = async (userId: string, sessionId: string, browser: string, device: string, ipAddress: string, location: string) => {
    await ActiveSession.updateOne({ userId, sessionId }, { browser, device, ipAddress, location, lastActive: new Date() });
    await generateLog(userId, "website", "Active session updated", "information", "resolved");
}





