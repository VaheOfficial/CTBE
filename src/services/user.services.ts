import User from "../models/user.model";
import type { UserDocument } from "../types/user.types";
import { LogController } from "../controllers/log.controller";
import type { LogType } from "../models/log.model";
import { getActiveSessions } from "../utils/activeSession";

const logController = new LogController();

export const createUser = async (userData: UserDocument) => {
  const user = await User.create(userData);
  return user;
};

export const getUsers = async () => {
  const users = await User.find();
  return users;
};

export const getUserById = async (id: string) => {
  const user = await User.findById(id);
  return user;
};

export const updateUser = async (id: string, userData: UserDocument) => {
  const user = await User.findByIdAndUpdate(id, userData, { new: true });
  return user;
};

export const deactivateUser = async (id: string) => {
  const user = await User.findByIdAndUpdate(id, { accountStatus: "suspended" }, { new: true });
  return user;
};

export const activateUser = async (id: string) => {
  const user = await User.findByIdAndUpdate(id, { accountStatus: "active" }, { new: true });
  return user;
};

export const getUserWithInfo = async (id: string) => {
  // Fetch the user
  const user = await User.findById(id);
  if (!user) return null;
  
  // Fetch logs if they exist
  let logEntries = [];
  if(user.logEntries && user.logEntries.length > 0) {
    const logs = await logController.getLogsByUser(user.id);
    logEntries = logs.map((log: LogType) => log.toObject());
  }
  
  // Fetch active sessions
  const activeSessions = await getActiveSessions(user.id);
  
  // Combine all information
  const userWithInfo = {
    ...user.toObject(),
    logEntries,
    activeSessions
  };
  
  return userWithInfo;
};










