import type { Request, Response, NextFunction, RequestWithUser } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { errorResponse } from '../utils/response';
import { logger } from '../utils/logger';

// Extend Express Request interface to include user object
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        role: string;
      };
    }
  }
}

/**
 * Authentication middleware that verifies the JWT access token from
 * the Authorization header and adds the user to the request object
 */
export const authenticate = (req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
    // Check if the Authorization header exists
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return errorResponse(res, 'Authorization header is required', 401);
    }

    // Split the Bearer token
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return errorResponse(res, 'Authorization header must be in the format: Bearer [token]', 401);
    }

    const token = parts[1];
    if (!token) {
      return errorResponse(res, 'Token is required', 401);
    }
    // Verify the token
    const decoded = verifyAccessToken(token);
    
    // Add the user to the request object
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role
    };
    
    next();
  } catch (error) {
    logger.error(`Authentication error: ${error}`);
    return errorResponse(res, 'Invalid or expired token', 401);
  }
};

/**
 * Authorization middleware that checks if the user has the required role
 */
export const authorize = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return errorResponse(res, 'Unauthorized: User not authenticated', 401);
      }
      
      if (!roles.includes(req.user.role)) {
        return errorResponse(res, `Forbidden: Required role: ${roles.join(' or ')}`, 403);
      }
      
      next();
    } catch (error) {
      logger.error(`Authorization error: ${error}`);
      return errorResponse(res, 'Permission denied', 403);
    }
  };
};
