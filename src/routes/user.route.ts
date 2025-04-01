import { Router } from "express";
import { UserController } from "../controllers/user.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();
const userController = new UserController();


// Protected routes
router.get('/me', authenticate, userController.getUserProfile);
router.delete('/sessions/:sessionId', authenticate, userController.deleteSession);
router.get('/:id', authenticate, userController.getUserById);
router.put('/:id', authenticate, userController.updateUser);
router.get('/all', authenticate, userController.getUsers);

export default router;

