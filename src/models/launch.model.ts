import mongoose, { Document } from "mongoose";

const launchSchema = new mongoose.Schema({
    date: { type: Date, required: true },
    site: { type: String, required: true },
    status: { 
        type: String, 
        required: true,
        enum: ['pending', 'scheduled', 'good-to-go', 'launching', 'success', 'failed', 'revoked']
    },
    description: { type: String, required: true },
    vehicle: { type: String, required: true },
    payload: { type: String, required: true },
    mass: { type: Number, required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    revoked: { type: Boolean, default: false },
    revokedDate: { type: Date, default: null },
    reason: { type: String, default: null },
});

const Launch = mongoose.model('Launch', launchSchema);

export interface LaunchType extends Document {
    date: Date;
    site: string;
    status: string;
    description: string;
    vehicle: string;
    payload: string;
    mass: number;
    createdAt: Date;
    updatedAt: Date;
    revoked: boolean;
    revokedDate: Date;
    reason: string;
}

export default Launch;