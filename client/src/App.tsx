import React, { useState, useEffect } from 'react';
import { NewLesson } from './components/NewLesson';
import { CheatSheet } from './components/CheatSheet';
import { LessonLibrary } from './components/LessonLibrary';

function App() {
  const [lessons, setLessons] = useState([]);

  const fetchLessons = async () => {
    const response = await fetch('/api/lessons');
    setLessons(await response.json());
  };

  useEffect(() => {
    fetchLessons();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8">Asian Language Lessons</h1>
        
        {/* Lesson Generator Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div>
            <NewLesson onGenerate={fetchLessons} />
          </div>
          <div>
            <CheatSheet onGenerate={fetchLessons} />
          </div>
        </div>
        
        <LessonLibrary lessons={lessons} />
      </div>
    </div>
  );
}

export default App;