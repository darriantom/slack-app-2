// Email validation service with SMTP and MX record validation
import dns from 'dns';
import net from 'net';
import { promisify } from 'util';

// Promisify DNS methods
const resolveMx = promisify(dns.resolveMx);

// Define a specific type for the email validation response
interface EmailValidationResponse {
  isValid: boolean;
  hasMx: boolean;
  smtpCheck: boolean;
  formatValid: boolean;
  domain: string;
  details: string;
}

/**
 * Validates an email through format check, MX record validation, and SMTP check
 * @param email The email address to validate
 * @returns Validation results
 */
export async function validateEmail(email: string): Promise<EmailValidationResponse> {
  // Default response
  const result: EmailValidationResponse = {
    isValid: false,
    hasMx: false,
    smtpCheck: false,
    formatValid: false,
    domain: '',
    details: '',
  };
  
  if (!email || email.trim() === '') {
    result.details = 'Empty email provided';
    return result;
  }
  
  try {
    console.log(`Validating email: ${email}`);
    
    // Step 1: Validate email format using regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    result.formatValid = emailRegex.test(email);
    
    if (!result.formatValid) {
      result.details = 'Invalid email format';
      return result;
    }
    
    // Step 2: Extract domain and check MX records
    const [, domain] = email.split('@');
    result.domain = domain;
    
    try {
      const mxRecords = await resolveMx(domain);
      result.hasMx = Array.isArray(mxRecords) && mxRecords.length > 0;
      console.log(`MX records for ${domain}:`, mxRecords);
      
      if (!result.hasMx) {
        result.details = 'No MX records found for domain';
        return result;
      }
    } catch (mxError) {
      console.error('Error checking MX records:', mxError);
      result.details = `MX lookup error: ${mxError instanceof Error ? mxError.message : 'Unknown error'}`;
      return result;
    }
    
    // Step 3: Perform a basic SMTP check
    try {
      // We'll just check if we can connect to the mail server
      // Full SMTP validation would require sending actual SMTP commands
      const smtpCheck = await checkSMTPConnection(domain);
      result.smtpCheck = smtpCheck;
      
      if (!smtpCheck) {
        result.details = 'Could not connect to SMTP server';
        return result;
      }
    } catch (smtpError) {
      console.error('Error during SMTP check:', smtpError);
      result.details = `SMTP check error: ${smtpError instanceof Error ? smtpError.message : 'Unknown error'}`;
      return result;
    }
    
    // If all checks passed, the email is considered valid
    result.isValid = result.formatValid && result.hasMx && result.smtpCheck;
    result.details = 'All checks passed';
    
    return result;
    
  } catch (error) {
    console.error('Error validating email:', error instanceof Error ? error.message : 'Unknown error');
    result.details = `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    return result;
  }
}

/**
 * Checks if a connection can be established to the domain's mail server
 */
async function checkSMTPConnection(domain: string): Promise<boolean> {
  try {
    // Get MX records
    const mxRecords = await resolveMx(domain);
    
    if (!mxRecords || mxRecords.length === 0) {
      return false;
    }
    
    // Sort MX records by priority (lower number = higher priority)
    const sortedMxs = mxRecords.sort((a, b) => a.priority - b.priority);
    const highestPriorityMx = sortedMxs[0].exchange;
    
    // Try to connect to the SMTP server
    return new Promise((resolve) => {
      console.log(`Attempting SMTP connection to ${highestPriorityMx}:25`);
      
      const socket = net.createConnection({
        host: highestPriorityMx,
        port: 25, // Standard SMTP port
        timeout: 5000 // 5 second timeout
      });
      
      // Set up event listeners
      socket.on('connect', () => {
        console.log('SMTP connection successful');
        socket.end(); // Close connection
        resolve(true);
      });
      
      socket.on('error', (err) => {
        console.error('SMTP connection error:', err);
        resolve(false);
      });
      
      socket.on('timeout', () => {
        console.error('SMTP connection timeout');
        socket.destroy();
        resolve(false);
      });
    });
  } catch (error) {
    console.error('Error checking SMTP connection:', error);
    return false;
  }
}

// Simple in-memory cache for validated emails
const emailCache: Record<string, {result: EmailValidationResponse, timestamp: number}> = {};

/**
 * Validates an email with caching to avoid repeated checks
 */
export async function validateEmailWithCache(email: string): Promise<EmailValidationResponse> {
  // Check cache first (cache entries expire after 1 day)
  const now = Date.now();
  const cacheEntry = emailCache[email];
  const oneDayMs = 24 * 60 * 60 * 1000;
  
  if (cacheEntry && now - cacheEntry.timestamp < oneDayMs) {
    console.log(`Using cached validation for ${email}: ${cacheEntry.result.isValid}`);
    return cacheEntry.result;
  }
  
  // If not in cache or expired, validate and update cache
  const result = await validateEmail(email);
  emailCache[email] = { 
    result, 
    timestamp: now 
  };
  
  return result;
}