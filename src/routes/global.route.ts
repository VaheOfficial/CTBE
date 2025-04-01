import { Router } from "express";
import { GlobalController } from "../controllers/global.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();
const globalController = new GlobalController();

router.post("/", authenticate, globalController.createGlobal);
router.get("/", authenticate, globalController.getGlobal);

export default router;
