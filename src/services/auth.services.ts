import User from "../models/user.model";
import bcrypt from "bcrypt";
import { generateAccessToken, generateRefreshToken, type TokenPayload, verifyRefreshToken } from "../utils/jwt";
import { logger } from "../utils/logger";
import { deleteActiveSession, getActiveSessions } from "../utils/activeSession";
import { generateLog } from "../utils/generateLog";

// Token blacklist for revoked refresh tokens
const tokenBlacklist = new Set<string>();

/**
 * Login a user with email and password
 */
export const loginUser = async (email: string, password: string) => {
  // Find the user by email
  const user = await User.findOne({ email });
  if (!user) {
    throw new Error("Invalid email or password");
  }

  // Check if the user account is active
  if (user.accountStatus !== "active") {
    throw new Error("Account is suspended. Please contact an administrator.");
  }

  // Compare the password
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new Error("Invalid email or password");
  }

  // Create token payload
  const payload: TokenPayload = {
    userId: user._id.toString(),
    email: user.email,
    role: user.role
  };

  // Generate tokens
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  // Update last login time
  await User.findByIdAndUpdate(user._id, { 
    lastLogin: new Date(),
    lastActive: new Date()
  });

  return {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      accountStatus: user.accountStatus
    },
    accessToken,
    refreshToken
  };
};

/**
 * Register a new user
 */
export const registerUser = async (userData: User) => {
  // Check if user already exists
  const existingUser = await User.findOne({ email: userData.email });
  if (existingUser) {
    throw new Error("User with this email already exists");
  }

  // Hash the password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(userData.password, salt);

  // Create new user with hashed password
  const user = await User.create({
    ...userData,
    password: hashedPassword
  });

  // Create token payload
  const payload: TokenPayload = {
    userId: user._id.toString(),
    email: user.email,
    role: user.role
  };

  // Generate tokens
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  return {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      accountStatus: user.accountStatus
    },
    accessToken,
    refreshToken
  };
};

/**
 * Refresh access token using refresh token
 */
export const refreshAccessToken = async (refreshToken: string) => {
  // Check if token is blacklisted
  if (tokenBlacklist.has(refreshToken)) {
    throw new Error("Refresh token has been revoked");
  }

  try {
    // Verify the refresh token
    const decoded = verifyRefreshToken(refreshToken);
    
    // Get user from database
    const user = await User.findById(decoded.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Check if the user account is active
    if (user.accountStatus !== "active") {
      throw new Error("Account is suspended");
    }

    // Create token payload
    const payload: TokenPayload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role
    };

    // Generate new access token
    const newAccessToken = generateAccessToken(payload);

    return {
      accessToken: newAccessToken
    };
  } catch (error) {
    logger.error(`Error refreshing token: ${error}`);
    
    // Try to extract the token payload despite error to clean up sessions
    try {
      const decoded = verifyRefreshToken(refreshToken, true); // Pass a flag to bypass validation
      if (decoded?.userId) {
        // Clean up user sessions when token expires
        cleanupUserSessions(decoded.userId);
      }
    } catch {
      // Silently fail if we can't decode the token
    }
    
    throw new Error("Invalid or expired refresh token");
  }
};

/**
 * Logout by blacklisting refresh token and cleaning up sessions
 */
export const logoutUser = async (refreshToken: string, deviceInfo?: { browser: string, device: string }) => {
  // Add token to blacklist
  tokenBlacklist.add(refreshToken);
  
  try {
    // Try to extract the user ID from the token
    const decoded = verifyRefreshToken(refreshToken);
    
    if (decoded?.userId) {
      if (deviceInfo) {
        // If device info provided, only delete that specific session
        const sessions = await getActiveSessions(decoded.userId);
        const session = sessions.find(s => 
          s.device === deviceInfo.device && 
          s.browser === deviceInfo.browser
        );
        
        if (session) {
          await deleteActiveSession(decoded.userId, session.sessionId);
          await generateLog(decoded.userId, "website", "Session ended on logout", "information", "resolved");
        }
      }
    }
  } catch (error) {
    logger.error(`Error during logout: ${error}`);
    // Continue even if we can't decode the token
  }
  
  return true;
};

/**
 * Helper function to clean up user sessions when tokens expire
 */
const cleanupUserSessions = async (userId: string) => {
  try {
    // Get all user sessions
    const sessions = await getActiveSessions(userId);
    
    // We could add additional logic here to selectively delete sessions
    // For now, we'll log that the token expired
    await generateLog(userId, "system", "Token expired - sessions may be invalid", "information", "resolved");
    
  } catch (error) {
    logger.error(`Error cleaning up sessions: ${error}`);
  }
}; 