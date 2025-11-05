import React from 'react';
import styles from './SentenceAnalysisTemplate.module.css';
import { SandboxSlideCanvas, SandboxSlideData } from '@shared/templates/sandboxTemplate.tsx';

const SAMPLE_JSON = `{
  "headline": "Stop saying 'annyeong' to every elder",
  "lead": "안녕하세요 keeps things respectful. Think of it as asking 'Are you at peace?'",
  "supporting": "Flip between friendly and formal depending on who you're talking to.",
  "badge": {
    "text": "Politeness Tip",
    "align": "right"
  },
  "bullets": [
    {
      "title": "안녕 👋",
      "body": "Casual. Use with friends, siblings, younger folks."
    },
    {
      "title": "안녕하세요 🙇‍♀️",
      "body": "Formal. For elders, teachers, strangers."
    },
    {
      "title": "Mix and switch",
      "body": "Drop to 안녕 mid-chat when the vibe softens."
    }
  ],
  "footer": "Need more examples? HanbokStudy has the full breakdown.",
  "theme": {
    "background": "linear-gradient(135deg, #3a1d71 0%, #0f172a 100%)",
    "accent": "#f2c14e"
  }
}`;

const DATA_SCHEMA = `interface SandboxSlideData {
  headline: string;
  lead?: string;
  supporting?: string;
  badge?: {
    text: string;
    align?: 'left' | 'center' | 'right';
    color?: string;
  };
  bullets?: Array<{
    title: string;
    body?: string;
    accent?: string;
  }>;
  footer?: string;
  theme?: {
    background?: string;
    overlay?: string;
    accent?: string;
    foreground?: string;
    muted?: string;
    fontFamily?: string;
    panel?: string;
    bulletBackground?: string;
  };
}`;

export const SentenceAnalysisTemplate: React.FC = () => {
  const [jsonInput, setJsonInput] = React.useState<string>(SAMPLE_JSON);
  const [parsedData, setParsedData] = React.useState<SandboxSlideData | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const previewRef = React.useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = React.useState<number>(0.4);

  React.useEffect(() => {
    const updateScale = () => {
      if (!previewRef.current) return;
      const width = previewRef.current.clientWidth;
      const ratio = width / 1080;
      setScale(ratio);
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  const handleRender = () => {
    try {
      const parsed = JSON.parse(jsonInput) as SandboxSlideData;
      setParsedData(parsed);
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Invalid JSON');
      setParsedData(null);
    }
  };

  const handleReset = () => {
    setJsonInput(SAMPLE_JSON);
    setParsedData(null);
    setError(null);
  };

  return (
    <div className={styles.page}>
      <section className={`nb-card px-6 py-6 animate-fade-in-up ${styles.panel}`}>
        <header>
          <h2 className="text-xl font-bold mb-2">🎨 Slide Template Playground</h2>
          <p className="nb-muted">
            Paste JSON for a single slide on the left, then click
            <span className={styles.inlineCode}> Render Slide</span>. The preview uses the template exported from
            <span className={styles.inlineCode}> shared/templates/sandboxTemplate.tsx</span>.
          </p>
        </header>

        <div className={styles.editorShell}>
          <label className="nb-label mb-2 block">Slide JSON</label>
          <textarea
            className={`${styles.editor} nb-input`}
            value={jsonInput}
            onChange={(event) => setJsonInput(event.target.value)}
          />
        </div>

        <div className={styles.buttonRow}>
          <button type="button" className="nb-button px-4 py-2" onClick={handleRender}>
            Render Slide
          </button>
          <button type="button" className="nb-button px-4 py-2" onClick={handleReset}>
            Reset Example JSON
          </button>
        </div>

        {error ? (
          <div className={styles.errorBox}>
            <strong>Parse error:</strong>
            <span>{error}</span>
          </div>
        ) : (
          <p className="nb-muted" style={{ fontSize: '0.9rem' }}>
            Editing is free-form. Rendering only happens when you press the button.
          </p>
        )}

        <div>
          <h4 className="font-semibold mb-2">Template Schema</h4>
          <p className="nb-muted" style={{ marginBottom: '0.75rem', fontSize: '0.9rem' }}>
            Modify the interface in <code>shared/templates/sandboxTemplate.tsx</code> to define your own schema.
            Keep the server-side renderer in sync if you ship the new shape.
          </p>
          <pre className={styles.code}>{DATA_SCHEMA}</pre>
        </div>
      </section>

      <section
        className={`nb-card px-6 py-6 animate-fade-in-up ${styles.panel}`}
        style={{ animationDelay: '60ms' }}
      >
        <h3 className="text-lg font-semibold mb-3">Rendered Slide</h3>
        <div ref={previewRef} className={styles.previewViewport}>
          {parsedData ? (
            (() => {
              const scaledWidth = 1080 * scale;
              const scaledHeight = 1350 * scale;
              return (
                <div
                  className={styles.previewStage}
                  style={{
                    width: `${scaledWidth}px`,
                    height: `${scaledHeight}px`,
                    marginLeft: `${-scaledWidth / 2}px`,
                    marginTop: `${-scaledHeight / 2}px`
                  }}
                >
                  <div
                    className={styles.previewInner}
                    style={{ transform: `scale(${scale})` }}
                  >
                    <SandboxSlideCanvas data={parsedData} />
                  </div>
                </div>
              );
            })()
          ) : (
            <div className={styles.placeholder}>
              <p className="nb-muted">Nothing rendered yet. Paste JSON and hit Render.</p>
            </div>
          )}
        </div>

        <p className="nb-muted" style={{ fontSize: '0.9rem' }}>
          This viewport scales the 1080×1350 canvas exactly like production. Edit the template file to
          change layout, fonts, or theming, then re-render to see the effect.
        </p>
      </section>
    </div>
  );
};