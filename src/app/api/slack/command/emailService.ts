// Email validation service using Mail.so API

// Define a specific type for the email validation response
interface EmailValidationResponse {
    status?: string;
    score?: number;
    domain?: string;
    isDisposable?: boolean;
    isFree?: boolean;
    hasInvalidFormat?: boolean;
    hasMxRecords?: boolean;
    [key: string]: unknown; // For any other properties returned by the API
  }
  
  /**
   * Validates an email address using the Mail.so API
   * @param email The email address to validate
   * @returns An object with validation results
   */
  export async function validateEmail(email: string): Promise<{
    isValid: boolean;
    score?: number;
    details?: EmailValidationResponse;
  }> {
    if (!email || email.trim() === '') {
      return { isValid: false };
    }
    
    try {
      const MAILSO_API_KEY = process.env.MAILSO_API_KEY; // Your API key
      
      const response = await fetch(`https://api.mail.so/api/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${MAILSO_API_KEY}`
        },
        body: JSON.stringify({ email })
      });
      
      if (!response.ok) {
        console.error('Email validation API error:', response.status);
        return { isValid: false };
      }
      
      const data = await response.json();
      console.log('Email validation result:', data);
      
      // Determine validity based on the API response
      // Adjust the criteria based on Mail.so API documentation
      const isValid = data.status === 'valid' || data.score > 0.7;
      
      return {
        isValid,
        score: data.score,
        details: data
      };
      
    } catch (error) {
      console.error('Error validating email:', error instanceof Error ? error.message : 'Unknown error');
      // If validation fails, we still proceed but mark it as invalid
      return { isValid: false };
    }
  }