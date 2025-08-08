import React, { useState } from 'react';

interface CheatSheetProps {
  onGenerate: () => void;
}

export const CheatSheet: React.FC<CheatSheetProps> = ({ onGenerate }) => {
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log(`[CLIENT] 🎯 CheatSheet form submitted! Topic: ${topic}`);
    
    if (!topic.trim()) {
      console.error('[CLIENT] ❌ No topic provided');
      return;
    }
    
    setLoading(true);
    console.log(`[CLIENT] 🚀 Starting cheat sheet generation for topic: ${topic}`);
    
    try {
      console.log('[CLIENT] 📤 Sending POST request to /api/cheat-sheet...');
      const response = await fetch('/api/cheat-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic })
      });
      
      console.log(`[CLIENT] 📨 Response received - Status: ${response.status}`);
      
      if (response.ok) {
        console.log('[CLIENT] ✅ Cheat sheet generation request sent successfully');
        const responseData = await response.json();
        console.log('[CLIENT] 📋 Response data:', responseData);
      } else {
        console.error('[CLIENT] ❌ Generation request failed:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('[CLIENT] Error response:', errorText);
      }
    } catch (error) {
      console.error('[CLIENT] 💥 Error sending generation request:', error);
      setLoading(false);
      return;
    }
    
    // Poll for completion
    let pollCount = 0;
    const maxPolls = 60;
    const checkStatus = setInterval(async () => {
      pollCount++;
      console.log(`[CLIENT] Polling attempt ${pollCount}/${maxPolls} - checking for cheat sheet: ${topic}`);
      
      // Timeout after maxPolls attempts
      if (pollCount >= maxPolls) {
        console.log(`[CLIENT] ⏰ Polling timeout after ${maxPolls} attempts`);
        clearInterval(checkStatus);
        setLoading(false);
        return;
      }
      
      try {
        const response = await fetch('/api/lessons');
        const lessons = await response.json();
        console.log(`[CLIENT] Received ${lessons.length} lessons:`, lessons.map((l: any) => l.topic));
        
        if (lessons.some((l: any) => l.topic === topic && l.type === 'cheat-sheet')) {
          console.log(`[CLIENT] ✅ Found completed cheat sheet for topic: ${topic}`);
          clearInterval(checkStatus);
          setLoading(false);
          onGenerate();
          setTopic('');
        }
      } catch (error) {
        console.error('[CLIENT] Error polling lessons:', error);
      }
    }, 1000);
  };

  return (
    <div className="mb-8">
      <h2 className="text-2xl font-bold mb-4">📋 Korean Vocabulary Cheat Sheet</h2>
      <p className="text-gray-600 mb-6">Generate a vocabulary cheat sheet for any topic</p>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Topic Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Cheat Sheet Topic
          </label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Enter topic (e.g., ordering food, weather, colors, emotions)..."
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            required
          />
          <p className="text-sm text-gray-500 mt-2">
            Examples: Restaurant Menu, Weather Words, Family Members, Numbers 1-20, Emotions, Colors, etc.
          </p>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full px-6 py-3 bg-green-500 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-green-600 transition-colors font-medium"
        >
          {loading ? 'Generating Cheat Sheet...' : 'Generate Korean Cheat Sheet'}
        </button>
      </form>
    </div>
  );
}; 