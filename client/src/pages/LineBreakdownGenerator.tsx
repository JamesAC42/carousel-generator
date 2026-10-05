import React from 'react';
import { LineBreakdown } from '../components/LineBreakdown';
import { useLessons } from '../context/LessonsContext';
import { LessonLibrary } from '../components/LessonLibrary';

export const LineBreakdownGenerator: React.FC = () => {
  const { lessons, refreshLessons } = useLessons();
  const breakdowns = lessons.filter(l => l.type === 'line-breakdown');

  return (
    <>
      <section className="nb-card px-6 py-6 animate-fade-in-up">
        <h2 className="text-xl font-bold mb-4">🎬 What They Actually Said</h2>
        <p className="nb-muted mb-6">Break down a real line from a drama, song or meme. One slide per piece of the line, 2 alternate hook covers and a caption.</p>
        <LineBreakdown onGenerate={refreshLessons} />
      </section>
      <section className="nb-card px-6 py-6 animate-fade-in-up" style={{animationDelay: '60ms'}}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Recent Breakdowns</h3>
          <button className="nb-button px-3 py-2" onClick={refreshLessons}>Refresh</button>
        </div>
        <LessonLibrary lessons={breakdowns} />
      </section>
    </>
  );
};
