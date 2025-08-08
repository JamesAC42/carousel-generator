import React from 'react';
import { CheatSheet } from '../components/CheatSheet';
import { useLessons } from '../context/LessonsContext';
import { LessonLibrary } from '../components/LessonLibrary';

export const CheatSheetGenerator: React.FC = () => {
  const { refreshLessons } = useLessons();
  const { lessons } = useLessons();
  const cheatsOnly = lessons.filter(l => l.type === 'cheat-sheet');

  return (
    <>
      <section className="nb-card px-6 py-6 animate-fade-in-up">
        <h2 className="text-xl font-bold mb-4">📋 Cheat Sheet Generator</h2>
        <p className="nb-muted mb-6">Generate a focused vocabulary cheat sheet.</p>
        <CheatSheet onGenerate={refreshLessons} />
      </section>
      <section className="nb-card px-6 py-6 animate-fade-in-up" style={{animationDelay: '60ms'}}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Recent Cheat Sheets</h3>
          <button className="nb-button px-3 py-2" onClick={refreshLessons}>Refresh</button>
        </div>
        <LessonLibrary lessons={cheatsOnly} />
      </section>
    </>
  );
};

