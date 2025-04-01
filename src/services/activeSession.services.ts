import type { ActiveSessionType } from "../models/activeSession.model";
import ActiveSession from "../models/activeSession.model";
import { generateLog } from "../utils/generateLog";
export const createActiveSession = async (activeSession: ActiveSessionType) => {
    const newActiveSession = await ActiveSession.create(activeSession);
    await generateLog(newActiveSession.userId.toString(), "website", "Active session created", "information", "resolved");
    return newActiveSession;
}

export const getActiveSessionsByUserId = async (userId: string) => {
    const activeSessions = await ActiveSession.find({ userId });
    return activeSessions;
}

export const updateActiveSession = async (id: string, activeSession: ActiveSessionType) => {
    const updatedActiveSession = await ActiveSession.findByIdAndUpdate(id, activeSession, { new: true });
    if (updatedActiveSession) {
        await generateLog(updatedActiveSession.userId.toString(), "website", "Active session updated", "information", "resolved");
    }
    return updatedActiveSession;
}

export const deleteActiveSession = async (id: string) => {
    const deletedActiveSession = await ActiveSession.findByIdAndDelete(id);
    if (deletedActiveSession) {
        await generateLog(deletedActiveSession.userId.toString(), "website", "Active session deleted", "information", "resolved");
    }
    return deletedActiveSession;
}






