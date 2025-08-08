import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface Lesson {
  id: string;
  topic: string;
  title: string;
  slides: number;
  language: string;
  episodeNumber: number;
  type: string; // 'lesson' or 'cheat-sheet'
}

interface LessonLibraryProps {
  lessons: Lesson[];
}

export const LessonLibrary: React.FC<LessonLibraryProps> = ({ lessons }) => {
  const [selected, setSelected] = useState<Lesson | null>(null);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {lessons.map(lesson => (
          <div
            key={lesson.id}
            onClick={() => setSelected(lesson)}
            className="nb-card p-4 cursor-pointer hover:brightness-110 transition"
          >
            <div className="relative">
              <img 
                src={`/output/${lesson.id}/slide-1.png`} 
                alt={lesson.title || lesson.topic}
                className="w-full h-48 object-cover rounded"
              />
              <div className="absolute top-2 left-2 flex gap-2">
                {/* Language indicator */}
                <div className="rounded-full px-2 py-1 text-sm bg-[var(--nb-panel)] border-2 border-[var(--nb-border)]">
                  {lesson.language === 'japanese' ? '🇯🇵' : '🇰🇷'}
                </div>
                {/* Type indicator */}
                <div className={`rounded-full px-2 py-1 text-sm text-black font-medium border-2 border-[var(--nb-border)] ${
                  lesson.type === 'cheat-sheet' ? 'bg-emerald-400' : 'bg-violet-400'
                }`}>
                  {lesson.type === 'cheat-sheet' ? '📋' : '📚'}
                </div>
              </div>
            </div>
            <h3 className="mt-2 font-semibold">{lesson.title || lesson.topic}</h3>
            <p className="nb-muted">
              {lesson.type === 'cheat-sheet' ? (
                `📋 Cheat Sheet • ${lesson.slides} slides • ${lesson.language === 'japanese' ? 'Japanese' : 'Korean'}`
              ) : (
                `Ep. ${lesson.episodeNumber || 1} • ${lesson.slides} slides • ${lesson.language === 'japanese' ? 'Japanese' : 'Korean'}`
              )}
            </p>
          </div>
        ))}
      </div>

      {selected && createPortal(
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" role="dialog" aria-modal="true" onClick={() => setSelected(null)}>
          <div className="nb-card-alt p-8 w-full max-w-3xl md:max-w-4xl max-h-[calc(100vh-6rem)] overflow-y-auto mx-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-2xl font-bold">{selected.title || selected.topic}</h2>
              <div className={`rounded-full px-3 py-1 text-sm text-black font-medium border-2 border-[var(--nb-border)] ${
                selected.type === 'cheat-sheet' ? 'bg-emerald-400' : 'bg-violet-400'
              }`}>
                {selected.type === 'cheat-sheet' ? '📋 Cheat Sheet' : '📚 Lesson'}
              </div>
            </div>
            <div className="space-y-4">
              {Array.from({ length: selected.slides }).map((_, i) => (
                <img 
                  key={i} 
                  src={`/output/${selected.id}/slide-${i+1}.png`} 
                  alt={`Slide ${i+1}`}
                  className="w-full"
                />
              ))}
            </div>
            <button
              onClick={() => setSelected(null)}
              className="mt-4 px-4 py-2 nb-button"
            >
              Close
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};