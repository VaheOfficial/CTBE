import Log from "../models/log.model";
import type { CreateLogDTO } from "../services/log.services";
import mongoose from "mongoose";
import { logger } from "./logger";

// Regular log generation
export const generateLog = async (userId: string, location: string, description: string, type: string, status: string) => {
    const log: CreateLogDTO = {
        userId: new mongoose.Types.ObjectId(userId),
        location: location,
        description: description,
        type: type,
        status: status,
        date: new Date(),
    }

    const newLog = await Log.create(log);
    return newLog;
}

// Security observation log specifically for suspicious activities
export const logSecurityObservation = async (
    userId: string, 
    location: string = 'browser',
    securityFlags: string[],
    userAgent: string = 'Unknown'
) => {
    try {
        if (securityFlags.length === 0) return;
        
        const description = `Security observation: ${securityFlags.join(', ')}`;
        
        // Create a log entry in the database
        const log: CreateLogDTO = {
            userId: new mongoose.Types.ObjectId(userId),
            location: location,
            description: description,
            type: 'observation',
            status: 'pending',
            date: new Date(),
        };
        
        // Also log to system logger
        logger.warn(`${description} from user ${userId} - UserAgent: ${userAgent}`);
        
        // Save to database
        const newLog = await Log.create(log);
        return newLog;
    } catch (error) {
        logger.error(`Failed to create security observation log: ${error}`);
    }
};
