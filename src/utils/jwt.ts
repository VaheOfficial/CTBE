import jwt, { type SignOptions } from 'jsonwebtoken';
import { logger } from './logger';

// Environment variables should be properly set in a .env file and loaded
// For now we're using static values, but in production these should come from environment variables
const JWT_SECRET = process.env.JWT_SECRET ?? 'your-secret-jwt-key';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? 'your-refresh-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? 15 * 60 * 1000; // 15 minutes by default
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN ?? 7 * 24 * 60 * 60 * 1000; // 7 days by default

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

/**
 * Generate an access token
 */
export const generateAccessToken = (payload: TokenPayload): string => {
  try {
    const options: SignOptions = { expiresIn: Number(JWT_EXPIRES_IN) };
    return jwt.sign(payload, JWT_SECRET, options);
  } catch (error) {
    logger.error(`Error generating access token: ${error}`);
    throw new Error('Failed to generate access token');
  }
};

/**
 * Generate a refresh token
 */
export const generateRefreshToken = (payload: TokenPayload): string => {
  try {
    const options: SignOptions = { expiresIn: Number(JWT_REFRESH_EXPIRES_IN) };
    const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, options);
    return refreshToken;
  } catch (error) {
    logger.error(`Error generating refresh token: ${error}`);
    throw new Error('Failed to generate refresh token');
  }
};

/**
 * Verify an access token
 */
export const verifyAccessToken = (token: string): TokenPayload => {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (error) {
    logger.error(`Error verifying access token: ${error}`);
    throw new Error('Invalid or expired access token');
  }
};

/**
 * Verify a refresh token
 * @param token The refresh token to verify
 * @param ignoreExpiration Whether to ignore token expiration
 */
export const verifyRefreshToken = (token: string, ignoreExpiration = false): TokenPayload => {
  try {
    const options = ignoreExpiration ? { ignoreExpiration: true } : undefined;
    return jwt.verify(token, JWT_REFRESH_SECRET, options) as TokenPayload;
  } catch (error) {
    logger.error(`Error verifying refresh token: ${error}`);
    throw new Error('Invalid or expired refresh token');
  }
}; 