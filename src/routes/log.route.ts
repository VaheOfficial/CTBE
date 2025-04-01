import { Router, type RequestWithUser } from "express";
import { LogController } from "../controllers/log.controller";
import { authenticate } from "../middleware/auth.middleware";
import { errorResponse } from "../utils/response";

const router = Router();
const logController = new LogController();

router.post('/', authenticate, (req: RequestWithUser, res: Response) => {
    const user = req.user;
    if(!user) {
        return errorResponse(res, "Unauthorized", 401);
    }
    logController.createLog(req.body);
});


export default router;
