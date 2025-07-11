import { NextRequest, NextResponse } from 'next/server';

// This function processes incoming Slack slash commands
export async function POST(request: NextRequest) {
  try {
    // Parse the request body as form data (Slack sends data as form/url-encoded)
    const formData = await request.formData();
    
    // Extract relevant information from the Slack command
    const command = formData.get('command') as string;
    const text = formData.get('text') as string;
    const userId = formData.get('user_id') as string;
    // const responseUrl = formData.get('response_url') as string;
    
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
        
        // For now, we'll just acknowledge receiving the URL since the linkedin-processor endpoint was deleted
        response = `✅ LinkedIn profile URL received: ${profileUrl}\n\nProfile processing is currently disabled to prevent timeouts. Please check back later.`;
        
      } catch (e) {
        console.error('LinkedIn processing error:', e);
        return NextResponse.json({
          response_type: 'in_channel',
          text: "⚠️ Error processing LinkedIn request."
        });
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