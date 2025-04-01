import { Router } from "express";
import type { Request, Response, RequestHandler, NextFunction, RequestWithUser } from "express";
import { UserController } from "../controllers/user.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();
const userController = new UserController();

// Register a new user
router.post("/register", ((req: Request, res: Response, next: NextFunction) =>
    userController.registerUser(req, res).catch(next)
) as RequestHandler);

// Login a user
router.post("/login", ((req: Request, res: Response, next: NextFunction) =>
    userController.loginUser(req, res).catch(next)
) as RequestHandler);

// Refresh access token using refresh token
router.get("/refresh-token", ((req: Request, res: Response, next: NextFunction) =>
    userController.refreshToken(req, res).catch(next)
) as RequestHandler);

// Logout a user
router.get("/logout", authenticate, ((req: RequestWithUser, res: Response, next: NextFunction) =>
    userController.logout(req, res).catch(next)
) as RequestHandler);

// Protected route to get the current user's profile
router.get("/me", authenticate, ((req: RequestWithUser, res: Response, next: NextFunction) =>
    userController.getUserProfile(req, res).catch(next)
) as RequestHandler);

router.get("/delete-session", authenticate, ((req: RequestWithUser, res: Response, next: NextFunction) =>
    userController.deleteSession(req, res).catch(next)
) as RequestHandler);

router.post("/change-password", authenticate, ((req: RequestWithUser, res: Response, next: NextFunction) =>
    userController.changePassword(req, res).catch(next)
) as RequestHandler);

export default router;
