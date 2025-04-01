import type { Document } from "mongoose";
import type mongoose from "mongoose";

export interface User {
  name: string;
  email: string;
  password: string;
  role: string;
  accountStatus: string;
  clearanceLevel: string;
  lastActive: Date;
  lastLogin: Date;
  missions: mongoose.Types.ObjectId[];
  logEntries: mongoose.Types.ObjectId[];
  commendations: mongoose.Types.ObjectId[];
  activeSessions: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

export interface UserDocument extends User, Document {}
