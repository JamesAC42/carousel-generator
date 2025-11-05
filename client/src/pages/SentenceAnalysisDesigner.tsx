import React, { useMemo, useState } from 'react';

const DEFAULT_JSON = `{
  "version": "1.0",
  "id": "it-rained-so-i-went-home-early",
  "language": "korean",
  "topic": "Cause connector -아서/어서 with past tense",
  "sentence": {
    "hangul": "어제 비가 와서 저는 집에 일찍 갔어요.",
    "romanization": "eoje biga waseo jeoneun jibe iljjik gasseoyo",
    "translation": {
      "natural_en": "I went home early because it rained yesterday.",
      "literal_en": "Yesterday rain came, so I to home early went."
    }
  },
  "tokens": [
    {
      "surface": "어제",
      "romanization": "eoje",
      "lemma": "어제",
      "pos": "Adverb",
      "role": "time",
      "gloss_en": "yesterday",
      "notes": "Time adverbs usually appear near the start."
    },
    {
      "surface": "비가",
      "romanization": "bi-ga",
      "lemma": "비",
      "pos": "Noun + Subject particle",
      "role": "subject",
      "morphology": { "base": "비", "particle": "가 (subject)" },
      "gloss_en": "rain (as subject)"
    },
    {
      "surface": "와서",
      "romanization": "waseo",
      "lemma": "오다",
      "pos": "Verb connective",
      "role": "cause_connector",
      "morphology": {
        "base": "오- (come)",
        "ending": "-아서/어서",
        "selected": "-아서 → 와서 (오 + 아 → 와)"
      },
      "gloss_en": "because (it) came → ‘because it rained’",
      "notes": "With weather noun ‘비’, 오다 expresses ‘to rain’."
    },
    {
      "surface": "저는",
      "romanization": "jeo-neun",
      "lemma": "저",
      "pos": "Pronoun + Topic particle",
      "role": "topic",
      "morphology": { "base": "저 (I, polite)", "particle": "는 (topic)" },
      "gloss_en": "as for me (I)"
    },
    {
      "surface": "집에",
      "romanization": "jib-e",
      "lemma": "집",
      "pos": "Noun + Location particle",
      "role": "destination",
      "morphology": { "base": "집 (home)", "particle": "에 (to/at)" },
      "gloss_en": "to home"
    },
    {
      "surface": "일찍",
      "romanization": "iljjik",
      "lemma": "일찍",
      "pos": "Adverb",
      "role": "manner",
      "gloss_en": "early"
    },
    {
      "surface": "갔어요",
      "romanization": "gasseoyo",
      "lemma": "가다",
      "pos": "Verb (past polite)",
      "role": "predicate",
      "morphology": {
        "base": "가- (go)",
        "tense": "-았/었- (past) → -았-",
        "politeness": "-어요",
        "phonology": "가 + 았 + 어요 → 갔어요"
      },
      "gloss_en": "went (polite past)"
    }
  ],
  "chunks": [
    {
      "label": "cause_clause",
      "hangul": "비가 와서",
      "romanization": "biga waseo",
      "function": "states cause",
      "translation_en": "because it rained"
    },
    {
      "label": "main_clause",
      "hangul": "저는 집에 일찍 갔어요",
      "romanization": "jeoneun jibe iljjik gasseoyo",
      "function": "main result",
      "translation_en": "I went home early"
    }
  ],
  "quiz": {
    "prompt_en": "Fill the blank: 비가 ____ 저는 집에 일찍 갔어요.",
    "answer_hangul": "와서",
    "answer_romanization": "waseo",
    "explanation_en": "Use -아서/어서 to mark cause: 와서 = because (it) came → because it rained."
  },
  "slides": [
    {
      "type": "translation",
      "text": "I went home early because it rained yesterday.",
      "highlight": { "chunk": "cause_clause" }
    },
    {
      "type": "analysis",
      "text": "비가 (bi-ga): 비 + 가 marks ‘rain’ as the subject.",
      "highlight": { "token_index": 1 }
    },
    {
      "type": "analysis",
      "text": "와서 (waseo): 오다 + -아서 → ‘because (it) rained’ (cause connector).",
      "highlight": { "token_index": 2 }
    },
    {
      "type": "analysis",
      "text": "집에 (jib-e): destination ‘to home’. 일찍 (iljjik): adverb ‘early’.",
      "highlight": { "token_index": 4 }
    },
    {
      "type": "analysis",
      "text": "갔어요 (gasseoyo): 가- + -았- (past) + -어요 → ‘went’ (polite).",
      "highlight": { "token_index": 6 }
    },
    {
      "type": "quiz",
      "text": "Fill the blank: 비가 ____ 저는 집에 일찍 갔어요.",
      "answer": "와서 (waseo)",
      "cta": "Full breakdown + audio on Hanbok"
    }
  ],
  "render_hints": {
    "theme": "notebook_dark_overlay",
    "primary_color": "#F2C14E",
    "secondary_color": "#8FA3BF",
    "font_scale": 1.0,
    "highlight_map": {
      "subject": "#F2C14E",
      "connector": "#7AD3A8",
      "destination": "#8FA3BF",
      "verb": "#E58888"
    }
  },
  "created_at": "2025-08-08T18:20:00Z"
}`;

// Lightweight client-side renderer that mirrors server template: we fetch server-rendered HTML fragment preview.
// For local designer, we approximate by sending JSON to a preview endpoint via POST if available; otherwise we render minimal JSX.

export const SentenceAnalysisDesigner: React.FC = () => {
  const [jsonInput, setJsonInput] = useState<string>(DEFAULT_JSON);
  const [slideIndex, setSlideIndex] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [sentence, setSentence] = useState<string>('어제 비가 와서 저는 집에 일찍 갔어요.');
  const [busy, setBusy] = useState<boolean>(false);

  const parsed = useMemo(() => {
    try {
      const obj = JSON.parse(jsonInput);
      setError(null);
      return obj;
    } catch (e: any) {
      setError(e?.message || 'Invalid JSON');
      return null;
    }
  }, [jsonInput]);

  const slides = parsed?.slides || [];
  const total = slides.length || 1;
  const currentSlide = slides[Math.max(0, Math.min(slideIndex, total - 1))] || null;
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const previewRef = React.useRef<HTMLIFrameElement | null>(null);

  const refreshPreview = async () => {
    if (!parsed) return;
    try {
      const res = await fetch('/api/sentence-analysis/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysis: parsed, index: slideIndex })
      });
      const html = await res.text();
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      setPreviewUrl((old) => {
        if (old) URL.revokeObjectURL(old);
        return url;
      });
    } catch (e) {
      // ignore
    }
  };

  React.useEffect(() => {
    refreshPreview();
    return () => {
      setPreviewUrl((old) => {
        if (old) URL.revokeObjectURL(old);
        return '';
      });
    };
  }, [jsonInput, slideIndex]);

  const goPrev = () => setSlideIndex((i) => Math.max(0, i - 1));
  const goNext = () => setSlideIndex((i) => Math.min(total - 1, i + 1));

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sentence.trim()) return;
    setBusy(true);
    try {
      const res = await fetch('/api/sentence-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sentence })
      });
      if (res.ok) {
        // Poll lessons for this generated item by type
        let tries = 0;
        const max = 60;
        const timer = setInterval(async () => {
          tries++;
          if (tries >= max) {
            clearInterval(timer);
            setBusy(false);
            return;
          }
          try {
            const response = await fetch('/api/lessons');
            const all = await response.json();
            const found = all.find((l: any) => l.type === 'sentence-analysis');
            if (found) {
              clearInterval(timer);
              setBusy(false);
            }
          } catch {
            // ignore
          }
        }, 1000);
      } else {
        setBusy(false);
      }
    } catch (err) {
      setBusy(false);
    }
  };

  // Local preview mimicking server template look
  const primary = parsed?.render_hints?.primary_color || '#F2C14E';
  const secondary = parsed?.render_hints?.secondary_color || '#8FA3BF';
  const theme = parsed?.render_hints?.theme || 'notebook_dark_overlay';

  return (
    <>
      <section className="nb-card px-6 py-6 animate-fade-in-up">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="flex flex-col" style={{ height: '70vh' }}>
            <label className="nb-label mb-2 block">Designer JSON (live preview)</label>
            <div className="flex-1">
              <textarea
                className="nb-input h-full"
                style={{ height: '100%' }}
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
              />
            </div>
            {error && <div className="text-red-500 text-sm mt-2">{error}</div>}
          </div>
          <div className="flex flex-col" style={{ height: '70vh' }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Preview</h3>
              <div className="flex items-center gap-2">
                <button className="nb-button px-3 py-2 opacity-60 hover:opacity-100 transition-opacity" onClick={goPrev} disabled={slideIndex === 0}>← Prev</button>
                <div className="nb-muted">{total ? slideIndex + 1 : 0} / {total}</div>
                <button className="nb-button px-3 py-2 opacity-60 hover:opacity-100 transition-opacity" onClick={goNext} disabled={slideIndex >= total - 1}>Next →</button>
              </div>
            </div>

            {/* Server-rendered preview (same template used in production) */}
            <div className="flex-1 relative flex items-center justify-center overflow-hidden">
              <div style={{ height: '100%', maxHeight: '100%', maxWidth: '100%', aspectRatio: '4 / 5' }}>
                <iframe ref={previewRef} title="preview" src={previewUrl} style={{ width: '100%', height: '100%', border: '0.125rem solid var(--nb-border)', borderRadius: '1rem', background: theme === 'notebook_dark_overlay' ? '#0f172a' : '#111827', overflow: 'hidden' }} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="nb-card px-6 py-6 animate-fade-in-up" style={{ animationDelay: '60ms' }}>
        <h2 className="text-xl font-bold mb-4">🧩 Sentence Analysis Slideshow</h2>
        <p className="nb-muted mb-6">Enter a Korean sentence to generate an analysis slideshow (PNG output) using the same template as the preview above.</p>
        <form onSubmit={handleGenerate} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="md:col-span-2">
            <label className="nb-label mb-2 block">Korean Sentence</label>
            <input className="nb-input h-[3rem]" value={sentence} onChange={(e) => setSentence(e.target.value)} placeholder="예) 어제 비가 와서 저는 집에 일찍 갔어요." />
          </div>
          <button type="submit" className="nb-button px-6 py-3 h-[3rem]" disabled={busy}>{busy ? 'Generating...' : 'Generate'}</button>
        </form>
      </section>
    </>
  );
};

