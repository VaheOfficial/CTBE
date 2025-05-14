import { Router } from "express";
import { GlobalController } from "../controllers/global.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();
const globalController = new GlobalController();

router.post("/", authenticate, globalController.createGlobal);
router.get("/", authenticate, globalController.getGlobal);

// Launch routes
router.get('/launch', authenticate, globalController.getLaunches);
router.post('/launch', authenticate, globalController.createLaunch);
router.put('/launch/:id', authenticate, globalController.updateLaunchStatus);
router.put('/launch/revoke/:id', authenticate, globalController.revokeLaunch);

// Mission routes
router.get('/mission', authenticate, globalController.getMissions);
router.post('/mission', authenticate, globalController.createMission);
router.put('/mission/:id', authenticate, globalController.updateMission);
router.put('/mission/add-participants/:id', authenticate, globalController.addParticipants);
router.put('/mission/add-commendations/:id', authenticate, globalController.addCommendations);
router.put('/mission/add-launch/:id', authenticate, globalController.addLaunch);

// Commendation routes
router.get('/commendation', authenticate, globalController.getCommendations);
router.post('/commendation', authenticate, globalController.createCommendation);
router.put('/commendation/:id', authenticate, globalController.updateCommendation);
router.put('/commendation/revoke/:id', authenticate, globalController.revokeCommendation);

export default router;
