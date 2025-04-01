import mongoose, { type Document } from "mongoose";

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ["admin", "operator", "viewer"],
    default: "viewer",
    required: true,
  },
  accountStatus: {
    type: String,
    enum: ["active", "suspended"],
    default: "suspended",
    required: true,
  },
  logEntries: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: "LogEntry",
  },
  activeSessions: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: "Session",
  },
  clearanceLevel: {
    type: String,
    enum: ["level1", "level2", "level3"],
    default: "level1",
    required: true,
  },
  lastActive: {
    type: Date,
    default: Date.now,
  },
  lastLogin: {
    type: Date,
    default: Date.now,
  },
  lastPasswordChange: {
    type: Date,
    default: Date.now,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    required: true,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
    required: true,
  },
});

const User = mongoose.model("User", userSchema);

interface User extends Document {
  name: string;
  email: string;
  password: string;
  role: string;
  accountStatus: string;
  createdAt: Date;
  updatedAt: Date;
  clearanceLevel: string;
  lastActive: Date;
  lastLogin: Date;
  logEntries: mongoose.Types.ObjectId[];
  activeSessions: mongoose.Types.ObjectId[];
  lastPasswordChange: Date;
}

export default User;


