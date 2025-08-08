import React, { useState, useEffect } from 'react';

interface Language {
  id: string;
  name: string;
  flag: string;
}

interface NewLessonProps {
  onGenerate: () => void;
}

export const NewLesson: React.FC<NewLessonProps> = ({ onGenerate }) => {
  const [topic, setTopic] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('korean');
  const [languages, setLanguages] = useState<Language[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingLanguages, setLoadingLanguages] = useState(true);

  // Fetch available languages on component mount
  useEffect(() => {
    fetchLanguages();
  }, []);

  const fetchLanguages = async () => {
    try {
      console.log('[CLIENT] Fetching available languages...');
      const response = await fetch('/api/generate/languages');
      if (response.ok) {
        const languagesData = await response.json();
        console.log('[CLIENT] Fetched languages:', languagesData);
        setLanguages(languagesData);
        // Korean is already selected by default
      } else {
        console.error('[CLIENT] Failed to fetch languages:', response.status);
      }
    } catch (error) {
      console.error('[CLIENT] Error fetching languages:', error);
    } finally {
      setLoadingLanguages(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log(`[CLIENT] 🎯 Form submitted! Topic: ${topic}, Language: ${selectedLanguage}`);
    
    if (!topic.trim()) {
      console.error('[CLIENT] ❌ No topic provided');
      return;
    }

    if (!selectedLanguage) {
      console.error('[CLIENT] ❌ No language selected');
      return;
    }
    
    setLoading(true);
    console.log(`[CLIENT] 🚀 Starting generation for topic: ${topic} in ${selectedLanguage}`);
    
    try {
      console.log('[CLIENT] 📤 Sending POST request to /api/generate...');
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, language: selectedLanguage })
      });
      
      console.log(`[CLIENT] 📨 Response received - Status: ${response.status}`);
      
      if (response.ok) {
        console.log('[CLIENT] ✅ Generation request sent successfully');
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
    const maxPolls = 60; // Maximum 60 seconds of polling
    const checkStatus = setInterval(async () => {
      pollCount++;
      console.log(`[CLIENT] Polling attempt ${pollCount}/${maxPolls} - checking for topic: ${topic}`);
      
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
        
        if (lessons.some((l: any) => l.topic === topic)) {
          console.log(`[CLIENT] ✅ Found completed lesson for topic: ${topic}`);
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

  const testConnection = async () => {
    console.log('[CLIENT] 🧪 Testing server connection...');
    try {
      const response = await fetch('/api/health');
      const data = await response.json();
      console.log('[CLIENT] ✅ Health check successful:', data);
    } catch (error) {
      console.error('[CLIENT] ❌ Health check failed:', error);
    }
  };

  const testGenerate = async () => {
    console.log('[CLIENT] 🧪 Testing generate route...');
    try {
      const response = await fetch('/api/generate-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: 'test-topic' })
      });
      const data = await response.json();
      console.log('[CLIENT] ✅ Generate test successful:', data);
    } catch (error) {
      console.error('[CLIENT] ❌ Generate test failed:', error);
    }
  };

  const getTopicPlaceholder = () => {
    return selectedLanguage === 'korean' 
      ? "Enter lesson topic (e.g., 한국 음식, Basic Greetings)..."
      : "Enter lesson topic (e.g., 日本料理, Basic Greetings)...";
  };

  return (
    <div className="mb-8">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Language Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Choose Language
          </label>
          {loadingLanguages ? (
            <div className="text-gray-500">Loading languages...</div>
          ) : (
            <div className="flex gap-4">
              {languages.map((language) => (
                <button
                  key={language.id}
                  type="button"
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${
                    selectedLanguage === language.id
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedLanguage(language.id)}
                >
                  <span className="text-xl">{language.flag}</span>
                  <span className="font-medium">{language.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Topic Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Lesson Topic
          </label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder={getTopicPlaceholder()}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || !selectedLanguage || loadingLanguages}
          className="w-full px-6 py-3 bg-blue-500 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-600 transition-colors font-medium"
        >
          {loading ? 'Generating...' : `Generate ${selectedLanguage === 'korean' ? 'Korean' : 'Japanese'} Lesson`}
        </button>
      </form>

      {/* Debug Buttons */}
      <div className="flex gap-2 mt-4">
        <button
          type="button"
          onClick={testConnection}
          className="px-4 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
        >
          Test Connection
        </button>
        <button
          type="button"
          onClick={testGenerate}
          className="px-4 py-1 bg-yellow-500 text-white rounded text-sm hover:bg-yellow-600"
        >
          Test Generate
        </button>
        <button
          type="button"
          onClick={() => console.log('[CLIENT] 🔍 Current state:', { topic, selectedLanguage })}
          className="px-4 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
        >
          Log State
        </button>
      </div>
    </div>
  );
};