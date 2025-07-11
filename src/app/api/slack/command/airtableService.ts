import { LinkedInProfile, AirtableRecord } from './types';
import { validateEmail } from './emailService';

export async function saveToAirtable(profile: LinkedInProfile): Promise<boolean> {
  try {
    const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
    const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
    const AIRTABLE_TABLE_ID = process.env.AIRTABLE_TABLE_ID;
    
    if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID || !AIRTABLE_TABLE_ID) {
      console.error('Airtable credentials missing - need API key, base ID, and table ID');
      console.log('Available env vars:', {
        hasApiKey: !!AIRTABLE_API_KEY,
        hasBaseId: !!AIRTABLE_BASE_ID,
        hasTableId: !!AIRTABLE_TABLE_ID
      });
      return false;
    }

    let emailValidationResult = { isValid: false };
    let emailStatus = "Not found";
    if (profile.email) {
      emailValidationResult = await validateEmail(profile.email);
      emailStatus = emailValidationResult.isValid ? "✓ Valid" : "❌ Invalid";
      console.log(`Email ${profile.email} validation result:`, emailValidationResult.isValid ? 'Valid' : 'Invalid');
    }

    // Format the data for Airtable
    const record: AirtableRecord = {
      fields: {
        Name: profile.fullName || '',
        Title: profile.headline || '',
        Company: profile.companyName || '',
        LinkedIn_URL: profile.linkedinUrl || '',
        Work_email: profile.email || '',
        Phone_number: profile.mobileNumber || '',
        Company_domain: profile.companyWebsite || '',
        Email_status: emailStatus || ''
      }
    };
    
    // Use the direct table ID in the URL
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}`;
    console.log('Airtable API URL:', url);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(record)
    });
    
    const responseText = await response.text();
    console.log('Airtable response status:', response.status);
    
    if (!response.ok) {
      console.error('Airtable API error:', responseText);
      return false;
    }
    
    console.log('Airtable save successful');
    return true;
    
  } catch (error) {
    console.error('Error saving to Airtable:', error instanceof Error ? error.message : 'Unknown error');
    return false;
  }
}