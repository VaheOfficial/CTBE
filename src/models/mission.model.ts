import mongoose, { Document, type ObjectId } from "mongoose";

const missionSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    status: { 
        type: String, 
        required: true,
        enum: ['pending', 'in-progress', 'completed', 'failed']
    },
    participants: { type: [mongoose.Schema.Types.ObjectId], ref: 'User' },
    commendations: { type: [mongoose.Schema.Types.ObjectId], ref: 'Commendation' },
    launch: { type: mongoose.Schema.Types.ObjectId, ref: 'Launch' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});

const Mission = mongoose.model('Mission', missionSchema);

export interface MissionType extends Document {
    name: string;
    description: string;
    status: string;
    participants: ObjectId[];
    commendations: ObjectId[];
    launch: ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

export default Mission;