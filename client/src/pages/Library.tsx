import React from 'react';
import { LessonLibrary } from '../components/LessonLibrary';
import { useLessons } from '../context/LessonsContext';

export const Library: React.FC = () => {
  const { lessons, refreshLessons } = useLessons();

  return (
    <section className="nb-card px-6 py-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold">📁 Library</h2>
          <p className="nb-muted">Browse generated lessons and cheat sheets.</p>
        </div>
        <button className="nb-button px-4 py-2" onClick={refreshLessons}>Refresh</button>
      </div>
      <LessonLibrary lessons={lessons} />
    </section>
  );
};

