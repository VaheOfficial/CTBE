import mongoose, { type Document } from "mongoose";

const globalSchema = new mongoose.Schema({
    createdUser: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },
    associatedUser: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },
    state: {
        type: String,
        enum: ["normal", "warning", "critical"],
        default: "normal",
    },
    reason: {
        type: String,
        default: "",
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
    timeout: {
        type: Number,
        default: 0,
    },
    timeoutStop: {
        type: Date,
        default: null,
    },
    timeoutReason: {
        type: String,
        default: "",
    },
});

const Global = mongoose.model("Global", globalSchema);

export interface GlobalType extends Document {
    state: string;
    createdAt: Date;
    updatedAt: Date;
    timeout: number;
    timeoutStop: Date;
    timeoutReason: string;
}

export default Global;