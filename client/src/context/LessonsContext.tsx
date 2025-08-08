import React, { createContext, useContext, useEffect, useState } from 'react';

interface Lesson {
  id: string;
  topic: string;
  title: string;
  slides: number;
  language: string;
  episodeNumber: number;
  type: string;
}

interface LessonsContextValue {
  lessons: Lesson[];
  refreshLessons: () => Promise<void>;
}

const LessonsContext = createContext<LessonsContextValue | undefined>(undefined);

export const LessonsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lessons, setLessons] = useState<Lesson[]>([]);

  const refreshLessons = async () => {
    const response = await fetch('/api/lessons');
    const data = await response.json();
    setLessons(data);
  };

  useEffect(() => {
    void refreshLessons();
  }, []);

  return (
    <LessonsContext.Provider value={{ lessons, refreshLessons }}>
      {children}
    </LessonsContext.Provider>
  );
};

export const useLessons = () => {
  const ctx = useContext(LessonsContext);
  if (!ctx) throw new Error('useLessons must be used within LessonsProvider');
  return ctx;
};

