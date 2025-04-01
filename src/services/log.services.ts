import Log, { type LogType } from "../models/log.model";
import type { Types } from "mongoose";

// Type for creating a new log entry (only required fields)
export interface CreateLogDTO {
    userId: string | Types.ObjectId;
    location: string;
    date: Date;
    description: string;
    type: string;
    status: string;
}

export const createLog = async (log: CreateLogDTO) => {
    const newLog = await Log.create(log);
    return newLog;
}

export const getLogById = async (id: string) => {
    const log = await Log.findById(id);
    return log;
}

export const updateLog = async (id: string, log: LogType) => {
    const updatedLog = await Log.findByIdAndUpdate(id, log, { new: true });
    return updatedLog;
}

export const deleteLog = async (id: string) => {
    await Log.findByIdAndDelete(id);
    return { message: "Log deleted successfully" };
}

// Flexible filter interface that can handle any combination of log filters
interface LogFilter {
    userId?: string;
    location?: string;
    type?: string;
    status?: string;
    date?: Date;
    startDate?: Date;
    endDate?: Date;
}

// Define a type for MongoDB query object
interface MongoQuery {
    userId?: string;
    location?: string;
    type?: string;
    status?: string;
    date?: Date | {
        $gte?: Date;
        $lte?: Date;
    };
}

/**
 * Flexible query function that can replace all the specific filter functions
 * @param filter Object containing any combination of filter criteria
 * @returns Filtered logs based on provided criteria
 */
export const getLogs = async (filter: LogFilter = {}) => {
    const query: MongoQuery = {};
    
    // Add simple filters
    if (filter.userId) query.userId = filter.userId;
    if (filter.location) query.location = filter.location;
    if (filter.type) query.type = filter.type;
    if (filter.status) query.status = filter.status;
    if (filter.date) query.date = filter.date;
    
    // Handle date range
    if (filter.startDate || filter.endDate) {
        query.date = {};
        if (filter.startDate) query.date.$gte = filter.startDate;
        if (filter.endDate) query.date.$lte = filter.endDate;
    }
    
    const logs = await Log.find(query);
    return logs;
}

// For backward compatibility, keep the old functions but implement them using the new flexible query
export const getLogsByUser = async (userId: string) => getLogs({ userId });
export const getLogsByLocation = async (location: string) => getLogs({ location });
export const getLogsByDate = async (date: Date) => getLogs({ date });
export const getLogsByType = async (type: string) => getLogs({ type });
export const getLogsByStatus = async (status: string) => getLogs({ status });
export const getLogsByDateRange = async (startDate: Date, endDate: Date) => getLogs({ startDate, endDate });
export const getLogsByDateRangeAndLocation = async (startDate: Date, endDate: Date, location: string) => 
    getLogs({ startDate, endDate, location });
export const getLogsByDateRangeAndType = async (startDate: Date, endDate: Date, type: string) => 
    getLogs({ startDate, endDate, type });
export const getLogsByDateRangeAndStatus = async (startDate: Date, endDate: Date, status: string) => 
    getLogs({ startDate, endDate, status });







