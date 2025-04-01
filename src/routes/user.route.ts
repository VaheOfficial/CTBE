import { Router } from "express";
import { UserController } from "../controllers/user.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();
const userController = new UserController();


// Protected routes
router.get('/me', authenticate, userController.getUserProfile);
router.delete('/sessions/:sessionId', authenticate, userController.deleteSession);
router.get('/all', authenticate, userController.getUsers);
router.put('/admin/reset-password/:id', authenticate, userController.resetPasswordAsAdmin);
router.put('/admin/:id', authenticate, userController.updateUserAsAdmin);
router.get('/:id', authenticate, userController.getUserById);
router.put('/:id', authenticate, userController.updateUser);

export default router;

