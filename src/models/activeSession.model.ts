import mongoose, { type Document } from "mongoose";

const activeSessionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    sessionId: { type: String, required: true },
    browser: { type: String, required: true },
    device: { type: String, required: true },
    ipAddress: { type: String, required: true },
    location: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    lastActive: { type: Date, default: Date.now },
});

const ActiveSession = mongoose.model("ActiveSession", activeSessionSchema);

export interface ActiveSessionType extends Document {
    userId: mongoose.Types.ObjectId;
    sessionId: string;
    browser: string;
    device: string;
    ipAddress: string;
    location: string;
    createdAt: Date;
    lastActive: Date;
}

export default ActiveSession;
