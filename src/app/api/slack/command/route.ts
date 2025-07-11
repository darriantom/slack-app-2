import { NextRequest, NextResponse } from 'next/server';
import { ApifyClient } from 'apify-client';

// This function processes incoming Slack slash commands
export async function POST(request: NextRequest) {
  try {
    // Parse the request body as form data (Slack sends data as form/url-encoded)
    const formData = await request.formData();
    
    // Extract relevant information from the Slack command
    const command = formData.get('command') as string;
    const text = formData.get('text') as string;
    const userId = formData.get('user_id') as string;
    
    // Basic validation
    if (!command || !userId) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
    
    console.log('Command:', command);
    console.log('Text:', text);
    
    // Process the command - this is where you'd add your service-related logic
    let response = '';
    
    // Example service-related command processing based on input text
    if (text.includes('restart')) {
        response = "Service restart command received.";
    } else if (text.includes('linkedin')) {
      try {
        // Extract the LinkedIn URL with a more flexible regex pattern
        // This pattern matches any URL containing linkedin.com/in/
        const urlMatch = text.match(/(https?:\/\/[^\s]*linkedin\.com\/in\/[^\s]*)/i);
        const profileUrl = urlMatch ? urlMatch[0] : null;
        
        console.log('LinkedIn URL found:', profileUrl);
        
        if (!profileUrl) {
          return NextResponse.json({
            response_type: 'in_channel',
            text: "⚠️ Please provide a valid LinkedIn profile URL. Example: `/service linkedin https://www.linkedin.com/in/username`"
          });
        }
        
        response = `🔄 Processing LinkedIn profile: ${profileUrl}`;
        
        const client = new ApifyClient({
            token: process.env.APIFY_API_TOKEN,
        });
        
        // Prepare Actor input
        const input = {
            "profileUrls": [
              profileUrl
            ]
        };
        
        interface ApifyRunResult {
          id: string;
          actId: string;
          defaultDatasetId: string;
          defaultKeyValueStoreId: string;
        }

        const run = await client.task("DbOcm7dOF7sYdld3P").call(input) as ApifyRunResult;
        
        // Fetch Actor results from the run's dataset
        console.log('Results from dataset');
        const { items } = await client.dataset(run.defaultDatasetId).listItems();
        
        if (items && items.length > 0) {
          const profile = items[0];
          
          // Save the profile to Airtable
          const success = await saveToAirtable(profile);
          
          // Format the response
          response = `✅ LinkedIn profile processed successfully:\n\n`;
          response += `*Name:* ${profile.fullName || 'N/A'}\n`;
          response += `*Headline:* ${profile.headline || 'N/A'}\n`;
          if (profile.location) response += `*Location:* ${profile.location}\n`;
          
          if (success) {
            response += `\nProfile saved to Airtable ✓`;
          } else {
            response += `\n⚠️ Profile could not be saved to Airtable`;
          }
        } else {
          response = "⚠️ No profile data found. The profile might be private or the URL is incorrect.";
        }
        
      } catch (e) {
        console.error('LinkedIn processing error:', e);
        return NextResponse.json({
          response_type: 'in_channel',
          text: "⚠️ Error processing LinkedIn request. Please try again later."
        });
      }
    } else if (text.includes('metrics')) {
      response = "metrics";
    } else if (text.includes('help')) {
      response = "Available commands:\n- linkedin [URL]: Fetch LinkedIn profile and save to Airtable\n- restart: Restart the service\n- metrics: View service metrics\n- help: Show this help message";
    } else {
      response = `Unknown command. Type \`${command} help\` for available commands.`;
    }
    
    // Return response to Slack
    return NextResponse.json({
      response_type: 'in_channel',
      text: response
    });
    
  } catch (error) {
    console.error('Error processing Slack command:', error);
    return NextResponse.json({ 
      response_type: 'in_channel',
      text: `Error: ${error instanceof Error ? error.message : 'Internal server error'}`
    });
  }
}
interface LinkedInProfile {
  fullName?: string;
  headline?: string;
  linkedinUrl?: string;
  companyName?: string;
  email?: string;
  mobileNumber?: string;
  companyWebsite?: string;
  // Add other potential fields that might be returned by Apify
}

interface AirtableRecord {
  fields: {
    Name: string;
    Title: string;
    Company: string;
    LinkedIn_URL: string;
    Work_email: string;
    Phone_number: string;
    Company_domain: string;
  }
}

async function saveToAirtable(profile: LinkedInProfile): Promise<boolean> {
  try {
    const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
    const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
    const AIRTABLE_TABLE_ID = process.env.AIRTABLE_TABLE_ID; // Use table ID instead of name
    if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID || !AIRTABLE_TABLE_ID) {
      console.error('Airtable credentials missing - need API key, base ID, and table ID');
      console.log('Available env vars:', {
        hasApiKey: !!AIRTABLE_API_KEY,
        hasBaseId: !!AIRTABLE_BASE_ID,
        hasTableId: !!AIRTABLE_TABLE_ID
      });
      return false;
    }
    
    // Format the data for Airtable - use simpler field names
    const record: AirtableRecord = {
      fields: {
        Name: profile.fullName || '',
        Title: profile.headline || '',
        Company: profile.companyName || '',
        LinkedIn_URL: profile.linkedinUrl || '',
        Work_email: profile.email || '',
        Phone_number: profile.mobileNumber || '',
        Company_domain: profile.companyWebsite || ''
      }
    };
    
    // Use the direct table ID in the URL - this is more reliable
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
    console.error('Error saving to Airtable:', error);
    return false;
  }
}