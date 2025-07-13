// Type definitions for the Slack API integration

export interface LinkedInProfile {
  fullName?: string;
  headline?: string;
  linkedinUrl?: string;
  companyName?: string;
  email?: string;
  mobileNumber?: string;
  companyWebsite?: string;
  location?: string;
  // Add other potential fields from Apify
}

export interface AirtableRecord {
  fields: {
    Name: string;
    Title: string;
    Company: string;
    LinkedIn_URL: string;
    Work_email: string;
    Phone_number: string;
    Company_domain: string;
    Email_valid?: string;
    Format_valid?: string;
    Has_MX?: string;
    SMTP_check?: string;
    Validation_details?: string;
  }
}

export interface ApifyRunResult {
  id: string;
  actId: string;
  defaultDatasetId: string;
  defaultKeyValueStoreId: string;
}

export interface SlackCommandRequest {
  command: string;
  text: string;
  userId: string;
}