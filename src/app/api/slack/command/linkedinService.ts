import { ApifyClient } from 'apify-client';
import { LinkedInProfile, ApifyRunResult } from './types';
import { saveToAirtable } from './airtableService';
import { validateEmail } from './emailService';

export function extractLinkedInUrl(text: string): string | null {
  const urlMatch = text.match(/(https?:\/\/[^\s]*linkedin\.com\/in\/[^\s]*)/i);
  return urlMatch ? urlMatch[0] : null;
}

export async function processLinkedInProfile(profileUrl: string): Promise<{
  success: boolean;
  response: string;
  profile?: LinkedInProfile;
}> {
  try {
    const client = new ApifyClient({
      token: process.env.APIFY_API_TOKEN,
    });
    
    // Prepare Actor input
    const input = {
      "profileUrls": [
        profileUrl
      ]
    };
    
    // Call the Apify task
    const run = await client.task("DbOcm7dOF7sYdld3P").call(input) as ApifyRunResult;
    
    // Fetch results from the dataset
    console.log('Fetching results from dataset');
    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    
    if (items && items.length > 0) {
      const profile = items[0] as unknown as LinkedInProfile;
      
      let emailStatus = "Not found";
      if (profile.email) {
        const emailValidation = await validateEmail(profile.email);
        emailStatus = emailValidation.isValid ? "✓ Valid" : "❌ Invalid";
        console.log("email data ->",emailValidation,"<-")
      }
      // Save the profile to Airtable
      const success = await saveToAirtable(profile);
      
      // Format the response
      let response = `✅ LinkedIn profile processed successfully:\n\n`;
      response += `*Name:* ${profile.fullName || 'N/A'}\n`;
      response += `*Title:* ${profile.headline || 'N/A'}\n`;
      if (profile.companyName) response += `*Company:* ${profile.companyName}\n`;
      if (profile.location) response += `*Location:* ${profile.location}\n`;
      if (profile.email) response += `*Email:* ${profile.email} (${emailStatus})\n`;
      
      if (success) {
        response += `\nProfile saved to Airtable ✓`;
      } else {
        response += `\n⚠️ Profile could not be saved to Airtable`;
      }
      
      return { success: true, response, profile };
    } else {
      return { 
        success: false, 
        response: "⚠️ No profile data found. The profile might be private or the URL is incorrect." 
      };
    }
    
  } catch (error) {
    console.error('LinkedIn processing error:', error instanceof Error ? error.message : 'Unknown error');
    return { 
      success: false, 
      response: "⚠️ Error processing LinkedIn request. Please try again later." 
    };
  }
}