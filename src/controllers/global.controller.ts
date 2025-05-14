import { errorResponse, successResponse } from "../utils/response";
import type { Request, RequestWithUser, Response } from "express";
import Global from "../models/global.model";
import Launch from "../models/launch.model";
import Mission from "../models/mission.model";
import Commendation from "../models/commendation.model";
export class GlobalController {
    // Global website state
    async createGlobal(req: RequestWithUser, res: Response) {
        const { state, reason, associatedUser } = req.body;
        let timeout = 0;
        if(state === "critical") {
            timeout = 1000 * 60 * 60 * 24; // 24 hours
        } else if(state === "warning") {
            timeout = 1000 * 60 * 60 * 12; // 12 hours
        } else {
            timeout = 1000 * 60 * 60 * 1; // 1 hour
        }
        const global = await Global.create({ state, reason, timeout, timeoutStop: new Date(Date.now() + timeout), createdUser: req.user.userId, associatedUser: associatedUser });
        return successResponse(res, "Global created successfully", 200, global);
    }
    async getGlobal(req: Request, res: Response) {
        const global = await Global.find();
        return successResponse(res, "Global retrieved successfully", 200, global);
    }
    async updateGlobal(req: Request, res: Response) {
        const { state, reason } = req.body;
        const global = await Global.findByIdAndUpdate(req.params.id, { state, reason }, { new: true });
        return successResponse(res, "Global updated successfully", 200, global);
    }
    async deleteGlobal(req: Request, res: Response) {
        await Global.findByIdAndDelete(req.params.id);
        return successResponse(res, "Global deleted successfully", 200);
    }

    /**
     * Get all launches
     */
    async getLaunches(req: Request, res: Response) {
        const launches = await Launch.find();
        return successResponse(res, "Launches retrieved successfully", 200, launches);
    }
    /**
     * Create a new launch
     */
    async createLaunch(req: RequestWithUser, res: Response) {
        if(req.user.role !== "admin") {
            return errorResponse(res, "You are not authorized to create launches", 403);
        }
        const { date, site, status, description, vehicle, payload, mass } = req.body;
        const launch = await Launch.create({ date, site, status, description, vehicle, payload, mass });
        return successResponse(res, "Launch created successfully", 200, launch);
    }
    /**
     * Update the status of a launch
     */
    async updateLaunchStatus(req: RequestWithUser, res: Response) {
        if(req.user.role !== "admin") {
            return errorResponse(res, "You are not authorized to update launch status", 403);
        }
        const { status } = req.body;
        const launch = await Launch.findById(req.params.id);
        if(!launch) {
            return errorResponse(res, "Launch not found", 404);
        }
        if(launch.status === 'revoked') {
            return errorResponse(res, "Launch is revoked", 400);
        }
        if(launch.status === 'launching' || launch.status === 'success' || launch.status === 'failed') {
            return errorResponse(res, "Launch is already in progress", 400);
        }
        const updatedLaunch = await Launch.findByIdAndUpdate(req.params.id, { status }, { new: true });
        return successResponse(res, "Launch status updated successfully", 200, updatedLaunch);
    }
    /**
     * Revoke a launch
     */
    async revokeLaunch(req: RequestWithUser, res: Response) {
        if(req.user.role !== "admin") {
            return successResponse(res, "You are not authorized to revoke launches", 403);
        }
        const { reason } = req.body;
        const launch = await Launch.findByIdAndUpdate(req.params.id, { status: 'revoked', revoked: true, revokedDate: new Date(), reason }, { new: true });
        return successResponse(res, "Launch revoked successfully", 200, launch);
    }

    /**
     * Create a new mission
     */
    async createMission(req: RequestWithUser, res: Response) {
        if(req.user.role !== "admin") {
            return errorResponse(res, "You are not authorized to create missions", 403);
        }
        const { name, description, status } = req.body;
        const mission = await Mission.create({ name, description, status });
        return successResponse(res, "Mission created successfully", 200, mission);
    }
    /**
     * Add participants to a mission
     */
    async addParticipants(req: RequestWithUser, res: Response) {
        if(req.user.role !== "admin") {
            return errorResponse(res, "You are not authorized to add participants to missions", 403);
        }
        const { participants } = req.body;
        const mission = await Mission.findByIdAndUpdate(req.params.id, { participants }, { new: true });
        return successResponse(res, "Participants added successfully", 200, mission);
    }
    /**
     * Add commendations to a mission
     */
    async addCommendations(req: RequestWithUser, res: Response) {
        if(req.user.role !== "admin") {
            return errorResponse(res, "You are not authorized to add commendations to missions", 403);
        }
        const { commendations } = req.body;
        const mission = await Mission.findByIdAndUpdate(req.params.id, { commendations }, { new: true });
        return successResponse(res, "Commendations added successfully", 200, mission);
    }
    /**
     * Add a launch to a mission
     */
    async addLaunch(req: RequestWithUser, res: Response) {
        if(req.user.role !== "admin") {
            return errorResponse(res, "You are not authorized to add a launch to a mission", 403);
        }
        const { launchId } = req.body;
        const mission = await Mission.findByIdAndUpdate(req.params.id, { launch: launchId }, { new: true });
        return successResponse(res, "Launch added successfully", 200, mission);
    }
    /**
     * Get all missions
     */
    async getMissions(req: RequestWithUser, res: Response) {
        const missions = await Mission.find();
        return successResponse(res, "Missions retrieved successfully", 200, missions);
    }
    /**
     * Get a mission by id
     */
    async getMission(req: RequestWithUser, res: Response) {
        const mission = await Mission.findById(req.params.id);
        return successResponse(res, "Mission retrieved successfully", 200, mission);
    }
    /**
     * Update a mission
     */
    async updateMission(req: RequestWithUser, res: Response) {
        const { name, description, status } = req.body;
        const mission = await Mission.findByIdAndUpdate(req.params.id, { name, description, status }, { new: true });
        return successResponse(res, "Mission updated successfully", 200, mission);
    }
    /**
     * Create a new commendation
     */
    async createCommendation(req: RequestWithUser, res: Response) {
        if(req.user.role !== "admin") {
            return successResponse(res, "You are not authorized to create commendations", 403);
        }
        const { name, description, awardee } = req.body;
        const commendation = await Commendation.create({ name, description, awardee });
        return successResponse(res, "Commendation created successfully", 200, commendation);
    }
    /**
     * Get all commendations
     */
    async getCommendations(req: RequestWithUser, res: Response) {
        if(req.user.role !== "admin") {
            return successResponse(res, "You are not authorized to get all commendations", 403);
        }
        const commendations = await Commendation.find();
        return successResponse(res, "Commendations retrieved successfully", 200, commendations);
    }
    /**
     * Update a commendation
     */
    async updateCommendation(req: RequestWithUser, res: Response) {
        if(req.user.role !== "admin") {
            return successResponse(res, "You are not authorized to update commendations", 403);
        }
        const { name, description } = req.body;
        const commendation = await Commendation.findByIdAndUpdate(req.params.id, { name, description }, { new: true });
        return successResponse(res, "Commendation updated successfully", 200, commendation);
    }
    /**
     * Revoke a commendation
     */
    async revokeCommendation(req: RequestWithUser, res: Response) {
        if(req.user.role !== "admin") {
            return successResponse(res, "You are not authorized to revoke commendations", 403);
        }
        const { reason } = req.body;
        const commendation = await Commendation.findByIdAndUpdate(req.params.id, { revoked: true, revokedDate: new Date(), reason, awardee: null }, { new: true });
        return successResponse(res, "Commendation revoked successfully", 200, commendation);
    }
}
