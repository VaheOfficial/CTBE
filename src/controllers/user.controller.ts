import type { Request, RequestWithUser, Response } from "express";
import { successResponse, errorResponse } from "../utils/response";
import { createUser, getUsers, getUserById, updateUser, deactivateUser, activateUser, getUserWithInfo } from "../services/user.services";
import { loginUser, refreshAccessToken, logoutUser, registerUser } from "../services/auth.services";
import type { LogType } from "../models/log.model";
import { generateLog } from "../utils/generateLog";
import type { ObjectId } from "mongoose";
import { generateActiveSession, getActiveSessions, updateActiveSession, deleteActiveSession } from "../utils/activeSession";
import type { ActiveSessionType } from "../models/activeSession.model";
import bcrypt from "bcrypt";

// Helper function for security checks
export class UserController {
  async createUser(req: Request, res: Response) {
    try {
      const user = await createUser(req.body);
      return successResponse(res, "User created successfully", 201, user);
    } catch (error) {
      return errorResponse(res, `Error creating user ${error}`);
    }
  }

  async registerUser(req: Request, res: Response) {
    try {
      const { user, accessToken, refreshToken } = await registerUser(req.body);
      
      // Log the registration
      await generateLog(user.id.toString(), "website", "User registered", "information", "resolved");
      
      // Check for security flags set by the deviceInfo middleware
      if (req.body.securityFlags && Array.isArray(req.body.securityFlags) && req.body.securityFlags.length > 0) {
        // Log security observation
        await generateLog(
          user.id.toString(),
          req.body.location || "browser",
          `Security observation during registration: ${req.body.securityFlags.join(', ')}`,
          "observation",
          "pending"
        );
      }
      
      await generateActiveSession(user.id.toString(), req.body.browser, req.body.device, req.body.ipAddress, req.body.location);
      // Set refresh token in cookie - httpOnly for security
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // use secure in production
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });
      
      return successResponse(res, 'User registered successfully', 201, { user, accessToken });
    } catch (error) {
      return errorResponse(res, `Registration failed: ${error}`);
    }
  }

  // Helper function to check for security threats and log them
  private checkSecurity(req: Request, userId: string): void {
    try {
      const userAgent = req.headers['user-agent'] ?? 'Unknown';
      const securityFlags: string[] = [];
      
      // Check for suspicious user agents
      if (userAgent.includes('curl') || 
          userAgent.includes('wget') ||
          userAgent.includes('python') ||
          userAgent.includes('bot') ||
          userAgent.includes('crawler') ||
          userAgent.includes('spider')) {
        securityFlags.push('suspicious_user_agent');
      }
      
      // Check for automation tools
      if (userAgent.includes('headless') || 
          userAgent.includes('selenium') || 
          userAgent.includes('playwright') ||
          userAgent.includes('puppeteer')) {
        securityFlags.push('automation_tool');
      }
      
      // Log any security flags
      if (securityFlags.length > 0) {
        const location = req.body.location || 'browser';
        generateLog(
          userId,
          location,
          `Security observation: ${securityFlags.join(', ')}`,
          'observation',
          'pending'
        ).catch(err => console.error(`Failed to log security: ${err}`));
      }
    } catch (error) {
      console.error('Error checking security:', error);
    }
  }

  async loginUser(req: Request, res: Response) {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return errorResponse(res, 'Email and password are required');
      }
      
      const { user, accessToken, refreshToken } = await loginUser(email, password);
      
      // Set refresh token in cookie - httpOnly for security
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // use secure in production
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      // Log the login
      await generateLog(user.id.toString(), "website", "User logged in", "information", "resolved");
      
      // Enhanced security logging - directly log the user agent and IP for debugging
      const userAgent = req.headers['user-agent'] || 'Unknown';
      const ipAddress = req.body.ipAddress || req.ip || 'Unknown';
      console.log(`Login detected - UserAgent: ${userAgent}, IP: ${ipAddress}`);
      
      // Force-check for suspicious patterns regardless of middleware flags
      const securityFlags: string[] = [];
      const lowerAgent = userAgent.toLowerCase();
      
      // Check for missing or generic user agent
      if (!userAgent || userAgent === 'Unknown' || userAgent.length < 20) {
        securityFlags.push('suspicious_user_agent');
      }
      
      // Check for automation tools
      if (lowerAgent.includes('headless') || lowerAgent.includes('selenium') || 
          lowerAgent.includes('puppet') || lowerAgent.includes('webdriver')) {
        securityFlags.push('automation_tool');
      }
      
      // Always log security check on login
      if (securityFlags.length > 0 || (req.body.securityFlags && req.body.securityFlags.length > 0)) {
        // Combine middleware flags with our own checks
        const allFlags = [...securityFlags];
        if (req.body.securityFlags && Array.isArray(req.body.securityFlags)) {
          allFlags.push(...req.body.securityFlags);
        }
        
        // Log to database with distinctive description
        await generateLog(
          user.id.toString(),
          req.body.location || "browser",
          `Security alert on login: ${allFlags.join(', ')} - Agent: ${userAgent.substring(0, 50)}`,
          "observation",
          "pending"
        );
        
        console.log(`Security flags detected and logged to database: ${allFlags.join(', ')}`);
      }
      
      // Check if a session already exists for this device
      const deviceInfo = {
        browser: req.body.browser || 'Unknown',
        device: req.body.device || 'Unknown',
        ipAddress: req.body.ipAddress || req.ip || 'Unknown',
        location: req.body.location || 'Unknown'
      };
      
      // Get existing sessions
      const activeSessions = await getActiveSessions(user.id.toString());
      
      // Check if there's a matching session for this device
      const existingSession = activeSessions.find(session => 
        session.device === deviceInfo.device && 
        session.browser === deviceInfo.browser
      );
      let currentSession = existingSession;
      // If no matching session, create a new one
      if (!existingSession) {
        currentSession = await generateActiveSession(
          user.id.toString(),
          deviceInfo.browser,
          deviceInfo.device,
          deviceInfo.ipAddress,
          deviceInfo.location
        );
      } else {
        // Update the existing session with new IP and location
        await updateActiveSession(
          user.id.toString(),
          existingSession.sessionId,
          deviceInfo.browser,
          deviceInfo.device,
          deviceInfo.ipAddress,
          deviceInfo.location
        );
      }
      return successResponse(res, 'Login successful', 200, { user, accessToken, sessionId: currentSession?.sessionId });
    } catch (error) {
      return errorResponse(res, `Login failed: ${error}`, 401);
    }
  }

  async refreshToken(req: Request, res: Response) {
    try {
      // Get refresh token from cookie or request body
      const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;
      
      if (!refreshToken) {
        return errorResponse(res, 'Refresh token is required', 401);
      }
      
      const { accessToken } = await refreshAccessToken(refreshToken);
      
      return successResponse(res, 'Token refreshed successfully', 200, { accessToken });
    } catch (error) {
      return errorResponse(res, `Failed to refresh token: ${error}`, 401);
    }
  }

  async logout(req: RequestWithUser, res: Response) {
    try {
      const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;
      
      // Get the current device info
      const deviceInfo = {
        browser: req.body.browser || 'Unknown',
        device: req.body.device || 'Unknown'
      };
      
      if (refreshToken) {
        // Blacklist the refresh token and clean up session
        await logoutUser(refreshToken, deviceInfo);
        
        // Clear the refresh token cookie
        res.clearCookie('refreshToken');
        
        // Log the user action if user info is available
        if (req.user?.userId) {
          await generateLog(req.user.userId, "website", "User logged out", "information", "resolved");
        }
      }
      
      return successResponse(res, 'Logged out successfully', 200);
    } catch (error) {
      return errorResponse(res, `Logout failed: ${error}`);
    }
  }

  async getUsers(req: Request, res: Response) {
    try {
      const users = await getUsers();
      return successResponse(res, "Users retrieved successfully", 200, users);
    } catch (error) {
      return errorResponse(res, `Error retrieving users ${error}`);
    }
  }

  async getUserById(req: Request, res: Response) {
    try {
      const userId = req.params.id;
      if (!userId) {
        return errorResponse(res, "User ID is required");
      }
      const user = await getUserById(userId);
      if (!user) {
        return errorResponse(res, "User not found");
      }
      return successResponse(res, "User retrieved successfully", 200, user);
    } catch (error) {
      return errorResponse(res, `Error retrieving user ${error}`);
    }
  }

  async updateUser(req: Request, res: Response) {
    try {
      const userId = req.params.id;
      if (!userId) {
        return errorResponse(res, "User ID is required");
      }
      const user = await updateUser(userId, req.body);
      if (!user) {
        return errorResponse(res, "User not found");
      }
      return successResponse(res, "User updated successfully", 200, user);
    } catch (error) {
      return errorResponse(res, `Error updating user ${error}`);
    }
  }

  async deactivateUser(req: Request, res: Response) {
    try {
      const userId = req.params.id;
      if (!userId) {
        return errorResponse(res, "User ID is required");
      }
      const user = await deactivateUser(userId);
      if (!user) {
        return errorResponse(res, "User not found");
      }
      return successResponse(res, "User deactivated successfully", 200, user);
    } catch (error) {
      return errorResponse(res, `Error deactivating user ${error}`);
    }
  }

  async activateUser(req: Request, res: Response) {
    try {
      const userId = req.params.id;
      if (!userId) {
        return errorResponse(res, "User ID is required");
      }
      const user = await activateUser(userId);
      if (!user) {
        return errorResponse(res, "User not found");
      }
      return successResponse(res, "User activated successfully", 200, user);
    } catch (error) {
      return errorResponse(res, `Error activating user ${error}`);
    }
  }

  async getUserProfile(req: RequestWithUser, res: Response) {
    try {
      if (!req.user || !req.user.userId) {
        return errorResponse(res, "Unauthorized", 401);
      }
      // Get user with populated logs and active sessions
      const user = await getUserWithInfo(req.user.userId);
      if (!user) {
        return errorResponse(res, "User not found", 404);
      }
      await generateLog(user._id.toString(), "website", "User profile retrieved", "information", "resolved");

      const formattedUser: ReturnUser = {
        name: user.name,
        email: user.email,
        role: user.role,
        clearanceLevel: user.clearanceLevel,
        accountStatus: user.accountStatus,
        lastActive: user.lastActive,
        lastLogin: user.lastLogin,
        logEntries: user.logEntries ? user.logEntries : [],
        activeSessions: user.activeSessions || [], // Include full active sessions, not just IDs
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        _id: user._id.toString(),
      }

      return successResponse(res, "User profile retrieved successfully", 200, formattedUser);
    } catch (error) {
      return errorResponse(res, `Error retrieving user profile: ${error}`, 500);
    }
  }

  /**
   * Delete a specific active session
   */
  async deleteSession(req: RequestWithUser, res: Response) {
    try {
      if (!req.user || !req.user.userId) {
        return errorResponse(res, "Unauthorized", 401);
      }
      
      const { sessionId } = req.params;
      
      if (!sessionId) {
        return errorResponse(res, "Session ID is required", 400);
      }
      
      // Get user's active sessions
      const activeSessions = await getActiveSessions(req.user.userId);
      
      // Check if the session belongs to the user
      const sessionToDelete = activeSessions.find(session => session.sessionId === sessionId);
      
      if (!sessionToDelete) {
        return errorResponse(res, "Session not found or doesn't belong to you", 404);
      }
      
      // Delete the session
      await deleteActiveSession(req.user.userId, sessionId);
      
      // Log the action
      await generateLog(req.user.userId, "website", "User deleted a session", "information", "resolved");
      
      return successResponse(res, "Session deleted successfully", 200);
    } catch (error) {
      return errorResponse(res, `Error deleting session: ${error}`, 500);
    }
  }

  async changePassword(req: RequestWithUser, res: Response) {
    try {
      const { oldPassword, newPassword } = req.body;
      
      if (!oldPassword || !newPassword) {
        return errorResponse(res, "All fields are required", 400);
      }

      const user = await getUserById(req.user.userId);
      if (!user) {
        return errorResponse(res, "User not found", 404);
      }

      const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
      if (!isPasswordValid) {
        return errorResponse(res, "Invalid old password", 401);
      }
      
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      user.password = hashedPassword;
      user.lastPasswordChange = new Date();
      await user.save();
      await generateLog(user._id.toString(), "website", "User changed their password", "observation", "resolved");
      return successResponse(res, "Password changed successfully", 200);
    } catch (error) {
      return errorResponse(res, `Error changing password: ${error}`, 500);
    }
  }


}


interface ReturnUser {
    name: string;
    email: string;
    role: string;
    clearanceLevel: string;
    accountStatus: string;
    lastActive: Date;
    lastLogin: Date;
    logEntries: LogType[];
    activeSessions: ActiveSessionType[];
    createdAt: Date;
    updatedAt: Date;
    _id: string | ObjectId;
}


