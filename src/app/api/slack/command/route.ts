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
    const responseUrl = formData.get('response_url') as string;
    
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
        // Check if we have a LinkedIn URL in the text
        const hasLinkedInUrl = text.match(/(https?:\/\/[^\s]+linkedin\.com\/in\/[^\s]+)/);
        
        if (!hasLinkedInUrl) {
          return NextResponse.json({
            response_type: 'in_channel',
            text: "⚠️ Please provide a valid LinkedIn profile URL. Example: `/service linkedin https://www.linkedin.com/in/username`"
          });
        }
        
        // Start the asynchronous processing in the background
        // We can't await this because Slack requires a response within 3 seconds
        const processorFormData = new FormData();
        processorFormData.append('text', text);
        processorFormData.append('response_url', responseUrl);
        
        // Fire and forget - don't await
        fetch('/api/slack/linkedin-processor', {
          method: 'POST',
          body: processorFormData,
        }).catch(err => {
          console.error('Error starting LinkedIn processor:', err);
        });
        
        // Immediately return a response to Slack
        return NextResponse.json({
          response_type: 'in_channel',
          text: "🔄 Processing LinkedIn profile request. This may take up to 2 minutes..."
        });
        
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