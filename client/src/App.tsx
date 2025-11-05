import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout.tsx';
import { LessonGenerator } from './pages/LessonGenerator';
import { CheatSheetGenerator } from './pages/CheatSheetGenerator';
import { SentenceAnalysisDesigner } from './pages/SentenceAnalysisDesigner';
import { LessonsProvider } from './context/LessonsContext';
import { SentenceAnalysisTemplate } from './pages/SentenceAnalysisTemplate';

function App() {
  return (
    <LessonsProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Navigate to="/generate/lesson" replace />} />
            <Route path="/generate/lesson" element={<LessonGenerator />} />
            <Route path="/generate/cheat-sheet" element={<CheatSheetGenerator />} />
            <Route path="/generate/sentence-template" element={<SentenceAnalysisTemplate />} />
            <Route path="/generate/sentence" element={<SentenceAnalysisDesigner />} />
            <Route path="*" element={<Navigate to="/generate/lesson" replace />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </LessonsProvider>
  );
}

export default App;