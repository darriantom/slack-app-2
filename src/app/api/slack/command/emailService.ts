// Email validation service with DNS MX record validation
import dns from 'dns';
import { promisify } from 'util';

// Promisify DNS methods
const resolveMx = promisify(dns.resolveMx);

// Define a specific type for the email validation response
interface EmailValidationResponse {
  isValid: boolean;
  hasMx: boolean;
  formatValid: boolean;
  domain: string;
  details: string;
}

/**
 * Validates an email through format check and MX record validation
 * @param email The email address to validate
 * @returns Validation results
 */
export async function validateEmail(email: string): Promise<EmailValidationResponse> {
  // Default response
  const result: EmailValidationResponse = {
    isValid: false,
    hasMx: false,
    formatValid: false,
    domain: '',
    details: ''
  };
  // email = "bill.gates@gatesfoundation.org"
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
      // Don't return here - we'll consider format validation as sufficient if MX check fails
      result.hasMx = false;
    }
    
    // If format check passed and either MX check passed or was skipped due to error,
    // consider the email valid
    result.isValid = result.formatValid && (result.hasMx || result.details.includes('MX lookup error'));
    
    if (result.isValid) {
      result.details = 'Email format valid' + (result.hasMx ? ', MX records found' : '');
    }
    
    return result;
    
  } catch (error) {
    console.error('Error validating email:', error instanceof Error ? error.message : 'Unknown error');
    result.details = `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    
    // If we have a domain and format is valid, we'll consider it potentially valid
    // even if other checks failed
    if (result.formatValid && result.domain) {
      result.isValid = true;
      result.details += ' (Partial validation only)';
    }
    
    return result;
  }
}

// Simple in-memory cache for validated emails
const emailCache: Record<string, {result: EmailValidationResponse, timestamp: number}> = {};

/**
 * Validates an email with caching to avoid repeated checks
 */
export async function validateEmailWithCache(email: string): Promise<EmailValidationResponse> {
  // Check cache first (cache entries expire after 1 day)
  
  // email = "bill.gates@gatesfoundation.org"
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

/**
 * Fallback method that just checks email format, for environments where DNS lookups are restricted
 */
export function validateEmailFormat(email: string): {isValid: boolean, domain: string} {
  if (!email || !email.includes('@')) {
    return { isValid: false, domain: '' };
  }
  
  // email = "bill.gates@gatesfoundation.org"
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isValid = emailRegex.test(email);
  const domain = isValid ? email.split('@')[1] : '';
  
  return { isValid, domain };
}