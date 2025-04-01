import Log, { type LogType } from "../models/log.model";
import type { CreateLogDTO } from "../services/log.services";
import User from "../models/user.model";

export class LogController {
    async createLog(log: CreateLogDTO) {
        // Create the log
        const newLog = await Log.create(log);
        
        // Update the user's logEntries array
        if (log.userId) {
            await User.findByIdAndUpdate(
                log.userId,
                { $push: { logEntries: newLog._id } },
                { new: true }
            );
        }
        
        return newLog;
    }
    async getLogsByUser(userId: string) {
        const logs = await Log.find({ userId });
        return logs;
    }
    async getLogById(id: string) {
        const log = await Log.findById(id);
        return log;
    }
    async updateLog(id: string, log: LogType) {
        const updatedLog = await Log.findByIdAndUpdate(id, log, { new: true });
        return updatedLog;
    }
    async deleteLog(id: string) {
        await Log.findByIdAndDelete(id);
        return { message: "Log deleted successfully" };
    }
}
