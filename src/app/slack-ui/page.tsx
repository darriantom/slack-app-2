'use client';

import { useState } from 'react';

export default function SlackUI() {
  // const [text, setText] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [commandType, setCommandType] = useState('linkedin');
  const [linkedinUrl, setLinkedinUrl] = useState('https://www.linkedin.com/in/oleksandr-steciuk-70992b356/');
  const [emailData, setEmailData] = useState({
    recipient: '',
    subject: '',
    message: ''
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    
    // Construct the command text based on the selected type
    let commandText = commandType;
    if (commandType === 'linkedin') {
      commandText = `linkedin ${linkedinUrl}`;
    } else if (commandType === 'email') {
      commandText = `email ${emailData.recipient} ${emailData.subject} ${emailData.message}`;
    }
    
    try {
      const formData = new FormData();
      formData.append('command', '/service');
      formData.append('text', commandText);
      formData.append('user_id', 'U12345678');
      
      const res = await fetch('/api/slack/command', {
        method: 'POST',
        body: formData,
      });
      
      const data = await res.json();
      setResponse(data.text || JSON.stringify(data, null, 2));
    } catch (err) {
      setResponse('Error: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 border rounded-lg shadow-sm">
      <h1 className="text-2xl font-bold mb-6">Slack Command Control</h1>
      
      <form onSubmit={handleSubmit} className="mb-6">
        <div className="mb-4">
          <label className="block mb-2 font-medium">Command Type:</label>
          <select 
            value={commandType} 
            onChange={(e) => setCommandType(e.target.value)}
            className="w-full p-2 border rounded mb-3"
          >
            <option value="linkedin">LinkedIn Profile</option>
            <option value="email">Send Email</option>
            <option value="restart">Restart Service</option>
            <option value="metrics">View Metrics</option>
            <option value="help">Help</option>
          </select>
          
          {commandType === 'linkedin' && (
            <div>
              <label className="block mb-2 font-medium">LinkedIn URL:</label>
              <input
                type="text"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                className="w-full p-2 border rounded"
                placeholder="https://www.linkedin.com/in/username/"
              />
            </div>
          )}

          {commandType === 'email' && (
            <div className="space-y-3">
              <div>
                <label className="block mb-2 font-medium">Recipient:</label>
                <input
                  type="email"
                  value={emailData.recipient}
                  onChange={(e) => setEmailData({...emailData, recipient: e.target.value})}
                  className="w-full p-2 border rounded"
                  placeholder="recipient@example.com"
                  required
                />
              </div>
              <div>
                <label className="block mb-2 font-medium">Subject:</label>
                <input
                  type="text"
                  value={emailData.subject}
                  onChange={(e) => setEmailData({...emailData, subject: e.target.value})}
                  className="w-full p-2 border rounded"
                  placeholder="Email subject"
                  required
                />
              </div>
              <div>
                <label className="block mb-2 font-medium">Message:</label>
                <textarea
                  value={emailData.message}
                  onChange={(e) => setEmailData({...emailData, message: e.target.value})}
                  className="w-full p-2 border rounded"
                  placeholder="Your email message"
                  rows={4}
                  required
                />
              </div>
            </div>
          )}
        </div>
        
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white p-2 rounded"
        >
          {loading ? 'Sending...' : 'Run Command'}
        </button>
      </form>
      
      {response && (
        <div className="p-4 bg-black-100 rounded-lg whitespace-pre-line">
          {response}
        </div>
      )}
    </div>
  );
}