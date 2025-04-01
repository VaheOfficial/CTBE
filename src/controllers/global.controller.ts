import { successResponse } from "../utils/response";
import type { Request, RequestWithUser, Response } from "express";
import Global from "../models/global.model";

export class GlobalController {
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
}
