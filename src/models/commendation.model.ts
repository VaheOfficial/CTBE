import mongoose, { Document, type ObjectId } from "mongoose";

const commendationSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },  
    awardee: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    revoked: { type: Boolean, default: false },
    revokedDate: { type: Date, default: null },
    reason: { type: String, default: null },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});

const Commendation = mongoose.model('Commendation', commendationSchema);

export interface CommendationType extends Document {
    id: number;
    name: string;
    description: string;
    awardee: ObjectId;
    revoked: boolean;
    revokedDate: Date;
    reason: string;
    createdAt: Date;
    updatedAt: Date;
}

export default Commendation;