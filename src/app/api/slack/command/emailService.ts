// Email validation service with disposable email detection
import dns from 'dns';
import { promisify } from 'util';

// Promisify DNS methods
const resolveMx = promisify(dns.resolveMx);

// Define types for validation responses
interface EmailValidationResponse {
  isValid: boolean;
  hasMx: boolean;
  formatValid: boolean;
  isDisposable: boolean;
  domain: string;
  details: string;
}

interface DisposableCheckResponse {
  isDisposable: boolean;
  domain: string;
  message?: string;
}

/**
 * Validates an email through format check, MX record validation, and disposable email detection
 */
export async function validateEmail(email: string): Promise<EmailValidationResponse> {
  // Default response
  const result: EmailValidationResponse = {
    isValid: false,
    hasMx: false,
    formatValid: false,
    isDisposable: false,
    domain: '',
    details: ''
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
    
    // Step 2: Extract domain
    const [, domain] = email.split('@');
    result.domain = domain;
    
    // Step 3: Check for disposable email domain
    try {
      const disposableCheck = await checkDisposableEmail(domain);
      result.isDisposable = disposableCheck.isDisposable;
      
      if (result.isDisposable) {
        result.details = `Disposable email domain detected: ${domain}`;
        console.log(result.details);
      }
    } catch (disposableError) {
      console.error('Error checking disposable email:', disposableError);
      // Continue with validation even if disposable check fails
    }
    
    // Step 4: Check MX records
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
    
    // Email is considered valid if:
    // 1. Format is valid
    // 2. Either has MX records or MX check failed but format is valid
    // 3. Not a disposable email (unless disposable check failed)
    result.isValid = result.formatValid && 
                    (result.hasMx || result.details.includes('MX lookup error')) && 
                    !result.isDisposable;
    
    if (result.isValid) {
      result.details = 'Email appears valid';
      if (result.hasMx) result.details += ', MX records found';
      if (!result.isDisposable) result.details += ', not disposable';
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

/**
 * Checks if an email domain is disposable using EmailListVerify API
 */
async function checkDisposableEmail(domain: string): Promise<DisposableCheckResponse> {
  try {
    // First, check common known domains that are definitely not disposable
    const safedomains = [
      'gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com', 
      'icloud.com', 'aol.com', 'protonmail.com', 'mail.com',
      'zoho.com', 'yandex.com', 'gmx.com', 'live.com'
    ];
    
    if (safedomains.includes(domain.toLowerCase())) {
      console.log(`Domain ${domain} is a known safe email provider`);
      return {
        isDisposable: false,
        domain,
        message: 'Known safe email provider'
      };
    }
    
    // For other domains, check with EmailListVerify API
    console.log(`Checking if ${domain} is a disposable email domain`);
    
    // Use the EmailListVerify API to check
    const EMAIL_LIST_VERIFY_API_KEY = process.env.EMAIL_LIST_VERIFY_API_KEY
    const response = await fetch(`https://apps.emaillistverify.com/api/verifyEmail?secret=${EMAIL_LIST_VERIFY_API_KEY}&email=test@${domain}`);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const result = await response.text();
    domain = "pacfut.com"
    console.log(`Disposable check result for ${domain}:`, result);
    
    // EmailListVerify API returns different status codes
    // "disposable" means it's a disposable email
    const isDisposable = result.includes('email_disabled');
    
    return {
      isDisposable,
      domain,
      message: result
    };
    
  } catch (error) {
    console.error(`Error checking disposable email for ${domain}:`, error);
    // If API check fails, we'll assume it's not disposable to avoid false positives
    return {
      isDisposable: false,
      domain,
      message: `Error checking: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
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

/**
 * Fallback method that just checks email format, for environments where network calls are restricted
 */
export function validateEmailFormat(email: string): {isValid: boolean, domain: string} {
  if (!email || !email.includes('@')) {
    return { isValid: false, domain: '' };
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isValid = emailRegex.test(email);
  const domain = isValid ? email.split('@')[1] : '';
  
  return { isValid, domain };
}