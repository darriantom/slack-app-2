import { NextRequest, NextResponse } from 'next/server';
import { ApifyClient } from 'apify-client';

// Initialize the ApifyClient with API token
// This function processes incoming Slack slash commands
export async function POST(request: NextRequest) {
  try {
    // Verify that the request is coming from Slack
    // if (!verifySlackRequest(request)) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }
    
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
    
    // Add a default timeout for the API requests
    const timeout = 30000; // 30 seconds timeout
    
    // Example service-related command processing based on input text
    if (text.includes('restart')) {
        response = "⚠️ Error fetching LinkedIn profile. Please check that your APIFY_API_TOKEN is set correctly in environment variables.";
    } else if (text.includes('linkedin')) {
      try {
        const client = new ApifyClient({
            token: process.env.APIFY_API_TOKEN || '',
        });
        
        // Extract LinkedIn profile URL from the command text
        const urlMatch = text.match(/(https?:\/\/[^\s]+)/);
        const profileUrl = urlMatch ? urlMatch[0] : null;
        
        if (!profileUrl || !profileUrl.includes('linkedin.com/in/')) {
          return NextResponse.json({
            response_type: 'in_channel',
            text: "⚠️ Please provide a valid LinkedIn profile URL. Example: `/service linkedin https://www.linkedin.com/in/username`"
          });
        }
        
        // Prepare Actor input with the extracted URL
        const input = {
            "profileUrls": [profileUrl]
        };
        
        response = "🔄 Starting LinkedIn profile fetch...";
        
        // Define the type for the Apify run result
        type ApifyRunResult = {
          id: string;
          actId: string;
          defaultDatasetId: string;
          defaultKeyValueStoreId: string;
        };
        
        // Call the Apify actor with timeout and proper typing
        const run = await Promise.race([
          client.actor("2SyF0bVxmgGr8IVCZ").call(input) as Promise<ApifyRunResult>,
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error("operation_timeout")), timeout)
          )
        ]);

        // Fetch and print Actor results from the run's dataset (if any)
        console.log('Results from dataset');
        const { items } = await client.dataset(run.defaultDatasetId).listItems();
        
        if (items && items.length > 0) {
          response = "LinkedIn profile fetched successfully:\n";
          items.forEach((item) => {
              response += `\n• ${item.fullName} - ${item.headline}`;
          }); 
        } else {
          response += "\nNo profiles found.";
        }
      } catch (apiError) {
        console.error('Apify API error:', apiError);
        if (apiError.message === "operation_timeout") {
          return NextResponse.json({
            response_type: 'in_channel',
            text: "⚠️ Operation timed out. The LinkedIn profile request took too long to complete."
          });
        }
        response = "⚠️ Error fetching LinkedIn profiles. Please check server logs.";
      }
    } else if (text.includes('metrics')) {
      response = "metrics";
    } else if (text.includes('help')) {
      response = "Available commands:\n- linkedin [URL]: Fetch LinkedIn profile\n- restart: Restart the service\n- metrics: View service metrics\n- help: Show this help message";
    } else {
      response = `Unknown command. Type \`${command} help\` for available commands.`;
    }
    
    // Return response to Slack
    return NextResponse.json({
      response_type: 'in_channel', // 'in_channel' makes the response visible to everyone
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