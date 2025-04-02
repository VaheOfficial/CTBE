import type { Request, Response, NextFunction } from 'express';
import type { RequestWithUser } from 'express';
import { logger } from '../utils/logger';
import { generateLog } from '../utils/generateLog';
// import { logSecurityObservation } from '../utils/securityLogger';

// Known suspicious user agent patterns
const SUSPICIOUS_USER_AGENTS = [
  'botnet', 'crawler', 'spider', 'worm', 'scan', 'wget', 'curl', 'python-requests', 
  'go-http-client', 'python-urllib', 'nmap', 'nikto', 'sqlmap'
];

// Known proxy/VPN services
const KNOWN_PROXIES = [
  '35.', // Google Cloud
  '34.', // Google Cloud  
  '18.', // AWS
  '3.', // AWS
  '162.158.', // Cloudflare
  '104.28.', // Cloudflare
  '104.16.', // Various VPNs
  '104.17.', // Various VPNs
];

/**
 * Middleware to detect device, browser, IP and location information
 * and attach it to the request body. Also performs security monitoring.
 */
export const detectDeviceInfo = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // Get user agent string
    const userAgent = req.headers['user-agent'] || 'Unknown';
    const securityFlags: string[] = [];
    
    
    // Extract browser information
    let browser = 'Unknown';
    if (userAgent.includes('Firefox')) {
      browser = 'Firefox';
    } else if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
      browser = 'Chrome';
    } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
      browser = 'Safari';
    } else if (userAgent.includes('Edg')) {
      browser = 'Edge';
    } else if (userAgent.includes('Opera') || userAgent.includes('OPR')) {
      browser = 'Opera';
    } else if (userAgent.includes('Postman')) {
      browser = 'Postman';
    } else if (userAgent.includes('curl')) {
      browser = 'curl';
    } else if (browser === 'Unknown' && userAgent !== 'Unknown') {
      // Potentially suspicious if browser can't be identified but has a user agent
      securityFlags.push('unknown_browser');
    }
    
    // Extract device information
    let device = 'Desktop';
    if (userAgent.includes('Mobile')) {
      device = 'Mobile';
    } else if (userAgent.includes('Tablet')) {
      device = 'Tablet';
    } else if (userAgent.includes('iPad')) {
      device = 'iPad';
    } else if (userAgent.includes('iPhone')) {
      device = 'iPhone';
    } else if (userAgent.includes('Android')) {
      device = 'Android';
    } else if (userAgent.includes('Postman')) {
      device = 'API Client';
    } else if (userAgent.includes('curl')) {
      device = 'Terminal';
    }
    
    // Get IP address (enhanced with localhost detection)
    let ipAddress = 'Unknown';
    try {
      const xForwardedFor = req.headers['x-forwarded-for'];
      if (typeof xForwardedFor === 'string') {
        ipAddress = xForwardedFor.split(',')[0].trim();
      } else if (req.socket && req.socket.remoteAddress) {
        ipAddress = req.socket.remoteAddress;
        
        // Special handling for localhost/development IPs
        if (ipAddress === '::1' || ipAddress === '127.0.0.1') {
          // Don't flag localhost connections as suspicious
          if (browser !== 'Postman' && browser !== 'curl') {
            browser = browser === 'Unknown' ? 'Development Browser' : browser;
            device = device === 'Unknown' ? 'Development Device' : device;
          }
        }
      }
    } catch (err) {
      logger.error(`Error getting IP address: ${err}`);
    }
    
    // Determine location (with special case for development)
    let location = 'Unknown';
    if (ipAddress === '::1' || ipAddress === '127.0.0.1') {
      location = 'Development Environment';
    }
    
    // Initialize request.body if it doesn't exist
    if (!req.body) {
      req.body = {};
    }
    
    // Attach the information to the request body
    req.body.browser = req.body.browser || browser;
    req.body.device = req.body.device || device;
    req.body.ipAddress = req.body.ipAddress || ipAddress;
    req.body.location = req.body.location || location;
    
    
    // Security monitoring - Skip most checks for localhost in development
    const isLocalhost = ipAddress === '::1' || ipAddress === '127.0.0.1';
    
    if (!isLocalhost) {
      // Check for suspicious user agent patterns
      const lowerUserAgent = userAgent.toLowerCase();
      for (const pattern of SUSPICIOUS_USER_AGENTS) {
        if (lowerUserAgent.includes(pattern)) {
          securityFlags.push('suspicious_user_agent');
          break;
        }
      }
      
      // Check for missing user agent
      if (!userAgent || userAgent === 'Unknown') {
        securityFlags.push('missing_user_agent');
      }
      
      // Check for suspiciously short user agent
      if (userAgent.length < 20 && userAgent !== 'Unknown') {
        securityFlags.push('short_user_agent');
      }
      
      // Check for known proxy/VPN IP patterns
      for (const proxyPattern of KNOWN_PROXIES) {
        if (ipAddress.startsWith(proxyPattern)) {
          securityFlags.push('potential_proxy');
          break;
        }
      }
      
      // Check for inconsistent browser and OS markers in user agent
      if (userAgent.includes('iPhone') && !userAgent.includes('Safari')) {
        securityFlags.push('inconsistent_platform');
      }
      if (userAgent.includes('Android') && userAgent.includes('iPhone')) {
        securityFlags.push('spoofed_platform');
      }
      
      // Check for automation frameworks
      if (
        lowerUserAgent.includes('headless') || 
        lowerUserAgent.includes('selenium') || 
        lowerUserAgent.includes('puppeteer') || 
        lowerUserAgent.includes('webdriver') ||
        lowerUserAgent.includes('playwright')
      ) {
        securityFlags.push('automation_tool');
      }
    } else if (browser === 'Unknown' && !userAgent.includes('Postman') && !userAgent.includes('curl')) {
      // For localhost, only flag unknown browser if it's not a known API tool
      securityFlags.push('unknown_browser');
    }
    
    // Add security flags to the request for controllers to use
    req.body.securityFlags = securityFlags;
    
    if (securityFlags.length > 0) {
      logger.warn(`Security flags detected: ${securityFlags.join(', ')} from ${ipAddress}`);
    }
    
    logger.info(`Device info detected: Browser: ${browser}, Device: ${device}, IP: ${ipAddress}`);
    
    // Continue to next middleware
    next();
  } catch (error) {
    logger.error(`Error detecting device info: ${error}`);
    console.error(`[deviceInfo] Error: ${error}`);
    // Continue even if device detection fails
    next();
  }
}; 