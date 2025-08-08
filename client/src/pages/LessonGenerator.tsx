import React from 'react';
import { NewLesson } from '../components/NewLesson';
import { useLessons } from '../context/LessonsContext';
import { LessonLibrary } from '../components/LessonLibrary';

export const LessonGenerator: React.FC = () => {
  const { refreshLessons } = useLessons();
  const { lessons } = useLessons();
  const lessonOnly = lessons.filter(l => l.type !== 'cheat-sheet');

  return (
    <>
      <section className="nb-card px-6 py-6 animate-fade-in-up">
        <h2 className="text-xl font-bold mb-4">📚 Language Lesson Generator</h2>
        <p className="nb-muted mb-6">Create a lesson carousel for a language and topic.</p>
        <NewLesson onGenerate={refreshLessons} />
      </section>
      <section className="nb-card px-6 py-6 animate-fade-in-up" style={{animationDelay: '60ms'}}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Recent Lessons</h3>
          <button className="nb-button px-3 py-2" onClick={refreshLessons}>Refresh</button>
        </div>
        <LessonLibrary lessons={lessonOnly} />
      </section>
    </>
  );
};

