 'use client';

import { useState } from 'react';

export default function SlackUI() {
  const [text, setText] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const formData = new FormData();
      formData.append('command', "command");
      formData.append('text', text);
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
          <select 
            value={text} 
            onChange={(e) => setText(e.target.value)}
            className="w-full p-2 border rounded"
          >
            <option value="linkedin">linkedin</option>
            <option value="restart">Restart Service</option>
            <option value="metrics">View Metrics</option>
            <option value="help">Help</option>
          </select>
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