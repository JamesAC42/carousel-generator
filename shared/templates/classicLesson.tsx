import React from 'react';

export type ClassicSlideType = 'hook' | 'content' | 'cta';

export interface ClassicLessonSlideData {
  text: string;
  type?: ClassicSlideType;
}

export interface ClassicLessonVisualOptions {
  /**
   * Background image URL or data URI. If omitted, a default gradient is used.
   */
  backgroundImage?: string;
  /**
   * Optional overlay tint color applied on top of the background.
   */
  overlayColor?: string;
  /**
   * Main typeface to apply to the slide text.
   */
  displayFontFamily?: string;
  /**
   * Color for the primary text.
   */
  textColor?: string;
  /**
   * Text shadow applied to copy for readability.
   */
  textShadow?: string;
}

export interface ClassicLessonSlideProps {
  slide: ClassicLessonSlideData;
  slideNumber: number;
  totalSlides: number;
  visual?: ClassicLessonVisualOptions;
  /**
   * Optional font CSS (usually @font-face declarations) injected into the document head.
   */
  fontCSS?: string;
}

const DEFAULT_FONT = 'TikTokSans, Arial Black, Helvetica, sans-serif';
const DEFAULT_OVERLAY = 'rgba(0, 0, 0, 0.4)';
const DEFAULT_TEXT_COLOR = '#ffffff';
const DEFAULT_TEXT_SHADOW = '4px 4px 0px #000000, -4px -4px 0px #000000, 4px -4px 0px #000000, -4px 4px 0px #000000';
const DEFAULT_BACKGROUND = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';

const containerStyle: React.CSSProperties = {
  width: '1080px',
  height: '1350px',
  position: 'relative',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center'
};

const overlayStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  zIndex: 1
};

const textContainerStyle: React.CSSProperties = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '85%',
  maxWidth: '900px',
  zIndex: 10
};

const bubbleStyle: React.CSSProperties = {
  padding: '3rem 2.5rem'
};

const sentenceStyle: React.CSSProperties = {
  fontSize: '4rem',
  fontWeight: 600,
  textAlign: 'center',
  lineHeight: '1.3',
  margin: 0
};

const progressContainerStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: '2rem',
  left: '50%',
  transform: 'translateX(-50%)',
  display: 'flex',
  gap: '1rem',
  zIndex: 10
};

const progressDotStyle = (isActive: boolean): React.CSSProperties => ({
  width: '16px',
  height: '16px',
  borderRadius: '50%',
  backgroundColor: isActive ? '#fff' : 'rgba(255, 255, 255, 0.5)',
  boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)'
});

const asianRegex = /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+/g;

export function wrapAsianText(text: string): React.ReactNode {
  const parts = text.split(asianRegex);
  const matches = text.match(asianRegex) || [];

  const nodes: React.ReactNode[] = [];

  for (let i = 0; i < parts.length; i++) {
    if (parts[i]) nodes.push(parts[i]);
    if (matches[i]) {
      nodes.push(
        <span
          key={`asian-${i}`}
          style={{
            fontFamily: 'Hahmlet, serif',
            backgroundColor: 'rgba(255, 215, 0, 0.9)',
            color: '#000',
            padding: '0.2rem 0.5rem',
            borderRadius: '0.5rem',
            fontWeight: 400,
            display: 'inline-block',
            textShadow: 'none',
            margin: '0 0.2rem'
          }}
        >
          {matches[i]}
        </span>
      );
    }
  }

  return <>{nodes}</>;
}

export const ClassicLessonSlideCanvas: React.FC<ClassicLessonSlideProps> = ({
  slide,
  slideNumber,
  totalSlides,
  visual
}) => {
  const backgroundImage = visual?.backgroundImage || DEFAULT_BACKGROUND;
  const overlayColor = visual?.overlayColor ?? DEFAULT_OVERLAY;
  const textColor = visual?.textColor ?? DEFAULT_TEXT_COLOR;
  const textShadow = visual?.textShadow ?? DEFAULT_TEXT_SHADOW;
  const fontFamily = visual?.displayFontFamily ?? DEFAULT_FONT;

  const backgroundStyle: React.CSSProperties = {
    ...containerStyle,
    backgroundImage: backgroundImage.startsWith('data:') || backgroundImage.startsWith('linear') || backgroundImage.startsWith('radial') || backgroundImage.startsWith('#')
      ? backgroundImage
      : `url(${backgroundImage})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    fontFamily
  };

  return (
    <div style={backgroundStyle}>
      <div style={{ ...overlayStyle, backgroundColor: overlayColor }} />
      <div style={textContainerStyle}>
        <div style={bubbleStyle}>
          <p style={{ ...sentenceStyle, color: textColor, textShadow }}>{wrapAsianText(slide.text)}</p>
        </div>
      </div>

      <div style={progressContainerStyle}>
        {Array.from({ length: totalSlides }).map((_, index) => (
          <div key={index} style={progressDotStyle(index === slideNumber)} />
        ))}
      </div>
    </div>
  );
};

export const ClassicLessonSlideDocument: React.FC<ClassicLessonSlideProps> = ({
  slide,
  slideNumber,
  totalSlides,
  visual,
  fontCSS
}) => (
  <html>
    <head>
      {fontCSS ? <style dangerouslySetInnerHTML={{ __html: fontCSS }} /> : null}
    </head>
    <body style={{ margin: 0, padding: 0 }}>
      <ClassicLessonSlideCanvas
        slide={slide}
        slideNumber={slideNumber}
        totalSlides={totalSlides}
        visual={visual}
      />
    </body>
  </html>
);




