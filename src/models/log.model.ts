import mongoose, { type Document } from "mongoose";

const logSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    location: {
        type: String,
        required: true,
    },
    date: {
        type: Date,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    type: {
        type: String,
        enum: ["incident", "observation", "information", "other"],
        required: true,
    },
    status: {
        type: String,
        enum: ["pending", "resolved", "escalated"],
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
});

const Log = mongoose.model("Log", logSchema);

export interface LogType extends Document {
    userId: mongoose.Types.ObjectId;
    location: string;
    date: Date;
    description: string;
    type: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
}

export default Log;