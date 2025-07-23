import { NextRequest, NextResponse } from 'next/server';
import { extractLinkedInUrl, processLinkedInProfile } from './linkedinService';
// import { SlackCommandRequest } from './types';

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
    
    // Process the command
    let response = '';
    
    // Handle different command types
    if (text.includes('restart')) {
      response = "🔄 Starting LinkedIn profile fetch...";
    } else if (text.includes('linkedin')) {
      try {
        // Extract the LinkedIn URL
        const profileUrl = extractLinkedInUrl(text);
        
        console.log('LinkedIn URL found:', profileUrl);
        
        if (!profileUrl) {
          return NextResponse.json({
            response_type: 'in_channel',
            text: "⚠️ Please provide a valid LinkedIn profile URL. Example: `/service linkedin https://www.linkedin.com/in/username`"
          });
        }
        
        // Process the LinkedIn profile
        const result = await processLinkedInProfile(profileUrl);
        response = result.response;
        
        const SLACK_HOOK_URL = process.env.SLACK_HOOK_URL
        fetch(`${SLACK_HOOK_URL}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            text: '✅Linkedin scraping was successful.'
          })
        })
          .then(response => {
            console.log(`Status: ${response.status}`);
            return response.text();
          })
          .then(data => console.log('Response:', data))
          .catch(error => console.error('Error:', error));
      } catch (e) {
        console.error('Command processing error:', e);
        return NextResponse.json({
          response_type: 'in_channel',
          text: "⚠️ Error processing request. Please try again later."
        });
      }
    } else if (text.includes('metrics')) {
      response = "✅ Web Server (nginx): Running\n✅ Database (PostgreSQL): Running\
      \n✅ Cache (Redis): Running\n⚠️ Queue Worker: High Load\n✅ API Gateway: Healthy"
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
    console.error('Error processing Slack command:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ 
      response_type: 'in_channel',
      text: `Error: ${error instanceof Error ? error.message : 'Internal server error'}`
    });
  }
}