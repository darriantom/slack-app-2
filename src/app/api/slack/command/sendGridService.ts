// src/app/api/slack/command/sendGridService.ts
import { LinkedInProfile } from './types';

/**
 * Send an email using SendGrid API
 */
export async function sendEmail(to: string, subject: string, text: string, html?: string): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
    const SENDGRID_VERIFIED_SENDER = process.env.SENDGRID_VERIFIED_SENDER;
    
    if (!SENDGRID_API_KEY || !SENDGRID_VERIFIED_SENDER) {
      console.error('SendGrid credentials missing - need API key and verified sender email');
      console.log('Available env vars:', {
        hasApiKey: !!SENDGRID_API_KEY,
        hasVerifiedSender: !!SENDGRID_VERIFIED_SENDER
      });
      return {
        success: false,
        message: "SendGrid credentials missing - cannot send email"
      };
    }
    
    // Create the email payload
    const data = {
      personalizations: [
        {
          to: [{ email: to }]
        }
      ],
      from: { email: SENDGRID_VERIFIED_SENDER },
      subject: subject,
      content: [
        {
          type: "text/plain",
          value: text
        }
      ]
    };
    
    // Add HTML content if provided
    if (html) {
      data.content.push({
        type: "text/html",
        value: html
      });
    }
    
    console.log(`Sending email to ${to} with subject: ${subject}`);
    
    // Make API request to SendGrid
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    
    // Handle response
    if (response.status === 202) {
      console.log('Email sent successfully');
      return {
        success: true,
        message: "Email sent successfully"
      };
    } else {
      const responseText = await response.text();
      console.error('SendGrid API error:', responseText);
      return {
        success: false,
        message: `Failed to send email: ${response.status} ${responseText}`
      };
    }
  } catch (error) {
    console.error('Error sending email:', error instanceof Error ? error.message : 'Unknown error');
    return {
      success: false,
      message: `Error sending email: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Send a LinkedIn profile as an email
 */
export async function sendProfileEmail(to: string, profile: LinkedInProfile): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    if (!profile) {
      return {
        success: false,
        message: "No profile data to send"
      };
    }
    
    const subject = `LinkedIn Profile: ${profile.fullName || 'Contact'}`;
    
    // Create text email body
    let text = `LinkedIn Profile Information:\n\n`;
    text += `Name: ${profile.fullName || 'N/A'}\n`;
    text += `Title: ${profile.headline || 'N/A'}\n`;
    if (profile.companyName) text += `Company: ${profile.companyName}\n`;
    if (profile.location) text += `Location: ${profile.location}\n`;
    if (profile.email) text += `Email: ${profile.email}\n`;
    if (profile.mobileNumber) text += `Phone: ${profile.mobileNumber}\n`;
    if (profile.linkedinUrl) text += `LinkedIn URL: ${profile.linkedinUrl}\n`;
    if (profile.companyWebsite) text += `Company Website: ${profile.companyWebsite}\n`;
    
    // Create HTML email body
    let html = `<h2>LinkedIn Profile Information</h2>`;
    html += `<p><strong>Name:</strong> ${profile.fullName || 'N/A'}</p>`;
    html += `<p><strong>Title:</strong> ${profile.headline || 'N/A'}</p>`;
    if (profile.companyName) html += `<p><strong>Company:</strong> ${profile.companyName}</p>`;
    if (profile.location) html += `<p><strong>Location:</strong> ${profile.location}</p>`;
    if (profile.email) html += `<p><strong>Email:</strong> ${profile.email}</p>`;
    if (profile.mobileNumber) html += `<p><strong>Phone:</strong> ${profile.mobileNumber}</p>`;
    if (profile.linkedinUrl) html += `<p><strong>LinkedIn URL:</strong> <a href="${profile.linkedinUrl}">${profile.linkedinUrl}</a></p>`;
    if (profile.companyWebsite) html += `<p><strong>Company Website:</strong> <a href="${profile.companyWebsite}">${profile.companyWebsite}</a></p>`;
    
    // Send the email
    return await sendEmail(to, subject, text, html);
  } catch (error) {
    console.error('Error sending profile email:', error instanceof Error ? error.message : 'Unknown error');
    return {
      success: false,
      message: `Error sending profile email: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}