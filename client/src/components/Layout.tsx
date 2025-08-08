import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const isLesson = location.pathname.startsWith('/generate/lesson');
  const isCheat = location.pathname.startsWith('/generate/cheat-sheet');

  // Monochrome accents per mode (hover is darker for better contrast)
  const accent = isLesson ? '#9AA4B2' : isCheat ? '#B0B0B0' : '#9AA4B2';
  const accentHover = isLesson ? '#6b7480' : isCheat ? '#8a8a8a' : '#6b7480';

  return (
    <div
      className="min-h-screen bg-[var(--nb-bg)] text-[var(--nb-text)]"
      style={{
        // Dynamic accent colors per mode
        ['--nb-accent' as any]: accent,
        ['--nb-accent-hover' as any]: accentHover,
      }}
    >
      <div className="mx-auto max-w-screen-2xl px-6 py-8">
        <header className="mb-8">
          <div className="flex items-center justify-between nb-card px-6 py-4">
            <div className="flex items-center gap-3">
              <div
                className="h-10 w-10 rounded-md"
                style={{
                  background: 'linear-gradient(180deg, var(--nb-accent), var(--nb-accent))',
                  border: '0.125rem solid var(--nb-border)',
                  boxShadow: 'var(--nb-shadow)'
                }}
              />
              <h1 className="text-2xl font-extrabold tracking-tight">
                Carousel Generator
              </h1>
            </div>
            <nav className="flex gap-3">
              <NavLink
                to="/generate/lesson"
                className={({ isActive }) => `nb-nav ${isActive ? 'nb-nav--active' : ''}`}
              >
                Lesson Generator
              </NavLink>
              <NavLink
                to="/generate/cheat-sheet"
                className={({ isActive }) => `nb-nav ${isActive ? 'nb-nav--active' : ''}`}
              >
                Cheat Sheet
              </NavLink>
            </nav>
          </div>
        </header>

        <main className="grid grid-cols-1 gap-6 animate-fade-in-up">{children}</main>
      </div>
    </div>
  );
};

