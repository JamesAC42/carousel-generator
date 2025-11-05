import React from 'react';
import ReactDOMServer from 'react-dom/server';
import fs from 'fs';
import path from 'path';
import {
  ClassicLessonSlideDocument,
  ClassicLessonSlideData
} from '../../shared/templates/classicLesson.tsx';

// Helper function to convert image to base64
function imageToBase64(imagePath: string): string {
  try {
    const imageBuffer = fs.readFileSync(imagePath);
    const ext = path.extname(imagePath).slice(1);
    const mimeType = ext === 'jpg' ? 'jpeg' : ext;
    return `data:image/${mimeType};base64,${imageBuffer.toString('base64')}`;
  } catch (error) {
    console.error(`[TEMPLATE] Error converting image to base64: ${imagePath}`, error);
    return '';
  }
}

// Helper function to convert font to base64
function fontToBase64(fontPath: string): string {
  try {
    const fontBuffer = fs.readFileSync(fontPath);
    return `data:font/truetype;base64,${fontBuffer.toString('base64')}`;
  } catch (error) {
    console.error(`[TEMPLATE] Error converting font to base64: ${fontPath}`, error);
    return '';
  }
}

// Generate CSS for embedded fonts
function generateFontCSS(): string {
  const fontsDir = 'assets/fonts';
  let fontCSS = '';
  
  try {
    if (fs.existsSync(fontsDir)) {
      const fontFiles = fs.readdirSync(fontsDir).filter(f => f.match(/\.(ttf|otf)$/i));
      
      fontFiles.forEach(fontFile => {
        const fontPath = path.join(fontsDir, fontFile);
        const fontBase64 = fontToBase64(fontPath);
        
        if (fontBase64) {
          // Extract font name (remove extension and format)
          const fontName = path.basename(fontFile, path.extname(fontFile));
          
          fontCSS += `
            @font-face {
              font-family: '${fontName}';
              src: url('${fontBase64}') format('truetype');
              font-display: block;
            }
          `;
          
          console.log(`[TEMPLATE] Loaded font: ${fontName}`);
        }
      });
    }
  } catch (error) {
    console.error('[TEMPLATE] Error loading fonts:', error);
  }
  
  return fontCSS;
}

// Function to pick random image from directory
function pickRandomImage(dir: string): string {
  try {
    if (!fs.existsSync(dir)) {
      console.error(`[TEMPLATE] Directory ${dir} does not exist`);
      return '';
    }
    
    const files = fs.readdirSync(dir).filter(f => f.match(/\.(png|jpg|jpeg)$/i));
    if (files.length === 0) {
      console.error(`[TEMPLATE] No images found in ${dir}`);
      return '';
    }
    
    const chosen = files[Math.floor(Math.random() * files.length)];
    console.log(`[TEMPLATE] Picked image ${chosen} from ${dir}`);
    return path.join(dir, chosen);
  } catch (error) {
    console.error(`[TEMPLATE] Error picking image from ${dir}:`, error);
    return '';
  }
}

// Function to get all images from directory and shuffle them
function getShuffledImages(dir: string): string[] {
  try {
    if (!fs.existsSync(dir)) {
      console.error(`[TEMPLATE] Directory ${dir} does not exist`);
      return [];
    }
    
    const files = fs.readdirSync(dir).filter(f => f.match(/\.(png|jpg|jpeg)$/i));
    if (files.length === 0) {
      console.error(`[TEMPLATE] No images found in ${dir}`);
      return [];
    }
    
    // Shuffle the array using Fisher-Yates algorithm
    const shuffled = [...files];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    // Return full paths
    const fullPaths = shuffled.map(file => path.join(dir, file));
    console.log(`[TEMPLATE] Shuffled ${fullPaths.length} images from ${dir}`);
    return fullPaths;
  } catch (error) {
    console.error(`[TEMPLATE] Error getting shuffled images from ${dir}:`, error);
    return [];
  }
}

export function renderSlidesToHTML(slides: any[]) {
  console.log(`[TEMPLATE] Rendering ${slides.length} slides with unique image system`);
  
  // Get shuffled content slide images for non-hook slides
  const contentImages = getShuffledImages('assets/content-slides');
  let contentImageIndex = 0;
  const fontCSS = generateFontCSS();
  
  return slides.map((slide, index) => {
    const isHookSlide = index === 0; // First slide is hook slide
    const isCtaSlide = index === slides.length - 1; // Last slide is CTA slide
    
    let slideType = 'content';
    let backgroundImagePath: string | undefined;
    
    if (isHookSlide) {
      slideType = 'hook';
      backgroundImagePath = pickRandomImage('assets/hook-slides');
    } else {
      // Content slides (including CTA) use shuffled content images
      slideType = isCtaSlide ? 'cta' : 'content';
      if (isCtaSlide) {
        backgroundImagePath = pickRandomImage('assets/cta-slides');
      } else if (contentImages.length > 0) {
        backgroundImagePath = contentImages[contentImageIndex % contentImages.length];
        contentImageIndex++;
      }
    }
    
    console.log(`[TEMPLATE] Rendering slide ${index + 1}: "${slide.text}" (${slideType} slide) with image: ${backgroundImagePath ? path.basename(backgroundImagePath) : 'random'}`);
    const backgroundImageData = backgroundImagePath ? imageToBase64(backgroundImagePath) : undefined;
    const slideData: ClassicLessonSlideData = {
      text: slide.text,
      type: slide.type
    };

    return ReactDOMServer.renderToString(
      <ClassicLessonSlideDocument
        slide={slideData}
        slideNumber={index}
        totalSlides={slides.length}
        visual={{ backgroundImage: backgroundImageData }}
        fontCSS={fontCSS}
      />
    );
  });
}

// Cheat Sheet Slide Component
interface CheatSheetSlideProps {
  slideData: any;
  slideNumber: number;
  totalSlides: number;
  backgroundImagePath: string;
}

const CheatSheetSlide: React.FC<CheatSheetSlideProps> = ({ slideData, slideNumber, totalSlides, backgroundImagePath }) => {
  const fontCSS = generateFontCSS();
  const backgroundBase64 = imageToBase64(backgroundImagePath);

  const containerStyle: React.CSSProperties = {
    width: '1080px',
    height: '1350px',
    position: 'relative',
    overflow: 'hidden',
    backgroundImage: backgroundBase64 ? `url(${backgroundBase64})` : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    fontFamily: 'Fredoka, Arial, Helvetica, sans-serif',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center'
  };

  // Dark tint overlay
  const overlayStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1
  };

  const contentStyle: React.CSSProperties = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '85%',
    maxWidth: '900px',
    zIndex: 10,
    textAlign: 'center'
  };

  // Progress dots
  const progressContainerStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: '2rem',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    gap: '0.5rem',
    zIndex: 10
  };

  const progressDotStyle = (isActive: boolean): React.CSSProperties => ({
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    backgroundColor: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.5)',
    border: '2px solid rgba(255, 255, 255, 0.8)'
  });

  const renderTitleSlide = () => (
    <div style={{
      padding: '3rem 2.5rem',
      borderRadius: '2rem',
    }}>
      <h1 style={{
        fontSize: '4.5rem',
        fontWeight: 'bold',
        color: '#1a1a1a',
        margin: '0',
        fontFamily: 'Fredoka, Arial, Helvetica, sans-serif',
        lineHeight: '1.1',
        textShadow: '2px 2px 4px rgba(0,0,0,0.1)'
      }}>
        {slideData.text}
      </h1>
    </div>
  );

  const renderCategorySlide = () => (
    <div style={{
      padding: '3rem 2.5rem',
      borderRadius: '2rem',
    }}>
      <h2 style={{
        fontSize: '4.1rem',
        fontWeight: 'bold',
        color: '#000000',
        margin: '0',
        fontFamily: 'Fredoka, Arial, Helvetica, sans-serif',
        lineHeight: '1.2',
        textShadow: '2px 2px 4px rgba(0,0,0,0.1)'
      }}>
        {slideData.text}
      </h2>
    </div>
  );

  const renderCtaSlide = () => (
    <div style={{
      padding: '3rem 2.5rem',
      borderRadius: '2rem',
    }}>
      <h2 style={{
        fontSize: '3.8rem',
        fontWeight: 'bold',
        color: '#000000',
        margin: '0',
        fontFamily: 'Fredoka, Arial, Helvetica, sans-serif',
        lineHeight: '1.2',
        textAlign: 'center'
      }}>
        {slideData.text}
      </h2>
    </div>
  );

  const renderVocabularySlide = () => {
    const gridStyle: React.CSSProperties = {
      padding: '3rem 2rem',
      borderRadius: '2rem',
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: '1.5rem',
      maxHeight: '70vh',
      overflowY: 'auto'
    };

    const itemStyle: React.CSSProperties = {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '1rem',
      backgroundColor: 'rgba(249, 250, 251, 0.8)',
      borderRadius: '1rem',
      border: '2px solid rgba(229, 231, 235, 0.6)',
      transition: 'all 0.2s'
    };

    const koreanStyle: React.CSSProperties = {
      fontSize: '3rem', // was 3.5rem
      fontWeight: '500',
      color: '#1f2937',
      marginBottom: '0.3rem',
      fontFamily: 'Jua, serif',
      textAlign: 'center'
    };

    const romanizationStyle: React.CSSProperties = {
      fontSize: '1.4rem', // was 1.7rem
      color: '#7f8999',
      opacity: 0.7,
      fontFamily: 'Fredoka, Arial, Helvetica, sans-serif',
      textAlign: 'center',
      fontWeight: '400',
      marginBottom: '0.4rem',
      fontStyle: 'italic'
    };

    const englishStyle: React.CSSProperties = {
      fontSize: '2rem', // was 2.3rem
      color: '#6b7280',
      fontFamily: 'Fredoka, Arial, Helvetica, sans-serif',
      textAlign: 'center',
      fontWeight: '500'
    };

    return (
      <div style={gridStyle}>
        {slideData.items.map((item: any, index: number) => (
          <div key={index} style={itemStyle}>
            <div style={koreanStyle}>{item.korean}</div>
            {item.romanization && (
              <div style={romanizationStyle}>{item.romanization}</div>
            )}
            <div style={englishStyle}>{item.english}</div>
          </div>
        ))}
      </div>
    );
  };

  const renderContent = () => {
    switch (slideData.type) {
      case 'title':
        return renderTitleSlide();
      case 'category':
        return renderCategorySlide();
      case 'vocabulary':
        return renderVocabularySlide();
      case 'cta':
        return renderCtaSlide();
      default:
        return renderTitleSlide();
    }
  };

  return (
    <html>
      <head>
        <style dangerouslySetInnerHTML={{ __html: fontCSS }} />
      </head>
      <body style={{ margin: 0, padding: 0 }}>
        <div style={containerStyle}>
          <div style={overlayStyle} />
          <div style={contentStyle}>
            {renderContent()}
          </div>
        </div>
      </body>
    </html>
  );
};

export function renderCheatSheetToHTML(slides: any[]) {
  console.log(`[TEMPLATE] Rendering ${slides.length} cheat sheet slides`);
  
  // Pick a random background image from cheat-sheet-backgrounds for non-first slides
  const backgroundImages = getShuffledImages('assets/cheat-sheet-backgrounds');
  const defaultBackgroundImage = backgroundImages.length > 0 ? backgroundImages[0] : 'assets/content-slides/21ea88b8bf820dfb025abf789d9c0618.jpg';
  
  return slides.map((slide, index) => {
    // First slide uses random image from cheat-sheet-hook folder
    const backgroundImage = index === 0 
      ? pickRandomImage('assets/cheat-sheet-hook')
      : defaultBackgroundImage;
    
    console.log(`[TEMPLATE] Rendering cheat sheet slide ${index + 1}: type=${slide.type}, background=${index === 0 ? 'cheat-sheet-hook' : 'cheat-sheet-backgrounds'}`);
    return ReactDOMServer.renderToString(
      <CheatSheetSlide 
        slideData={slide}
        slideNumber={index}
        totalSlides={slides.length}
        backgroundImagePath={backgroundImage}
      />
    );
  });
}

// Sentence Analysis Components and Renderer
interface SentenceAnalysisSlideProps {
  analysis: any; // full JSON
  token: any;    // current token being analyzed
  tokenIndex: number; // index of current token
  slideNumber: number;
  totalSlides: number;
}

const SentenceAnalysisSlide: React.FC<SentenceAnalysisSlideProps> = ({ analysis, token, tokenIndex, slideNumber, totalSlides }) => {
  const fontCSS = generateFontCSS();

  // Colors and theme
  const primary = analysis?.render_hints?.primary_color || '#F2C14E';
  const secondary = analysis?.render_hints?.secondary_color || '#8FA3BF';
  const theme = analysis?.render_hints?.theme || 'notebook_dark_overlay';

  const containerStyle: React.CSSProperties = {
    width: '1080px',
    height: '1350px',
    position: 'relative',
    overflow: 'hidden',
    background: theme === 'notebook_dark_overlay' ? '#0f172a' : '#111827',
    fontFamily: 'TikTokSans, Arial Black, Helvetica, sans-serif',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center'
  };

  const contentStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    zIndex: 10,
    padding: '3rem',
    boxSizing: 'border-box',
    display: 'flex',
    alignItems: 'stretch',
    justifyContent: 'stretch'
  };

  const cardStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    background: 'transparent',
    border: 'none',
    borderRadius: '0',
    padding: '0',
    boxShadow: 'none'
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '1.5rem'
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '4rem',
    color: '#fff',
    fontWeight: 700,
    margin: 0
  };

  const sentenceStyle: React.CSSProperties = {
    fontSize: '4rem',
    color: '#fff',
    fontFamily: 'Hahmlet, serif',
    lineHeight: 1.3 as unknown as string,
    margin: '0 0 2rem 0'
  };

  const subStyle: React.CSSProperties = {
    fontSize: '2rem',
    color: 'rgba(255,255,255,0.8)',
    margin: '0 0 0.5rem 0'
  };

  const badgeStyle = (bg: string): React.CSSProperties => ({
    display: 'inline-block',
    fontSize: '1.25rem',
    color: '#111827',
    background: bg,
    padding: '0.4rem 0.8rem',
    borderRadius: '0.6rem',
    fontWeight: 700
  });

  const textStyle: React.CSSProperties = {
    fontSize: '2.6rem',
    color: '#e5e7eb'
  };

  const progressContainerStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: '2rem',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    gap: '0.6rem',
    zIndex: 10
  };
  const progressDotStyle = (isActive: boolean): React.CSSProperties => ({
    width: '18px',
    height: '18px',
    borderRadius: '9999px',
    backgroundColor: isActive ? primary : 'rgba(255,255,255,0.25)',
    border: `3px solid ${isActive ? '#fff' : 'rgba(255,255,255,0.4)'}`
  });

  // Helper to get token color from highlight_map
  const getTokenColor = (token: any) => {
    const highlightMap = analysis?.render_hints?.highlight_map || {};
    return highlightMap[token.role] || primary;
  };

  // Render sentence with highlighted current token
  const renderHighlightedSentence = () => {
    const tokens = analysis?.tokens || [];
    const sentence = analysis?.sentence?.hangul || '';
    
    return (
      <div style={{ 
        fontSize: '3.5rem', 
        color: '#fff', 
        fontFamily: 'Hahmlet, serif',
        lineHeight: 1.4,
        marginBottom: '2rem',
        textAlign: 'center'
      }}>
        {tokens.map((t: any, i: number) => (
          <span 
            key={i}
            style={{
              color: i === tokenIndex ? getTokenColor(token) : '#fff',
              backgroundColor: i === tokenIndex ? 'rgba(255,255,255,0.1)' : 'transparent',
              padding: i === tokenIndex ? '0.2rem 0.4rem' : '0',
              borderRadius: i === tokenIndex ? '0.5rem' : '0',
              fontWeight: i === tokenIndex ? 700 : 400,
              position: 'relative'
            }}
          >
            {t.surface}
            {i === tokenIndex && (
              <div style={{
                position: 'absolute',
                bottom: '-1rem',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '0.2rem',
                height: '3rem',
                backgroundColor: getTokenColor(token),
                borderRadius: '0.1rem'
              }} />
            )}
          </span>
        ))}
      </div>
    );
  };

  const renderTokenAnalysis = () => (
    <div style={cardStyle}>
      <div style={headerStyle}>
        <h3 style={titleStyle}>Token Analysis</h3>
        <span style={badgeStyle(getTokenColor(token))}>{token?.pos || 'Token'}</span>
      </div>
      
      {/* Translation at the top */}
      <div style={{ 
        fontSize: '2.4rem', 
        color: 'rgba(255,255,255,0.9)', 
        marginBottom: '3rem',
        textAlign: 'center',
        fontStyle: 'italic'
      }}>
        {analysis?.sentence?.translation?.natural_en}
      </div>

      {/* Highlighted sentence */}
      {renderHighlightedSentence()}

      {/* Token information box */}
      <div style={{
        background: 'rgba(31,41,55,0.9)',
        border: `2px solid ${getTokenColor(token)}`,
        borderRadius: '1.5rem',
        padding: '2.5rem',
        marginTop: '2rem',
        position: 'relative'
      }}>
        {/* Connection line from highlighted token to info box */}
        <div style={{
          position: 'absolute',
          top: '-2rem',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '0.3rem',
          height: '2rem',
          backgroundColor: getTokenColor(token),
          borderRadius: '0.15rem'
        }} />
        
        <div style={{ 
          fontSize: '4.5rem', 
          color: '#fff', 
          fontFamily: 'Hahmlet, serif',
          marginBottom: '1rem',
          textAlign: 'center'
        }}>
          {token?.surface}
        </div>
        
        <div style={{ 
          fontSize: '2.2rem', 
          color: 'rgba(255,255,255,0.8)',
          textAlign: 'center',
          marginBottom: '1.5rem'
        }}>
          {token?.romanization}
        </div>
        
        <div style={{ 
          display: 'flex',
          justifyContent: 'center',
          gap: '1rem',
          marginBottom: '1.5rem'
        }}>
          <span style={badgeStyle(secondary)}>{token?.pos}</span>
          <span style={badgeStyle(getTokenColor(token))}>{token?.role}</span>
        </div>
        
        {token?.gloss_en && (
          <div style={{ 
            fontSize: '2.4rem', 
            color: '#e5e7eb', 
            textAlign: 'center',
            marginBottom: '1rem',
            fontWeight: 600
          }}>
            {token.gloss_en}
          </div>
        )}
        
        {token?.morphology && Object.keys(token.morphology).length > 0 && (
          <div style={{ 
            fontSize: '1.8rem', 
            color: 'rgba(255,255,255,0.75)',
            textAlign: 'center',
            marginBottom: '1rem'
          }}>
            {Object.entries(token.morphology).map(([key, value]) => (
              `${key}: ${value}`
            )).join(' • ')}
          </div>
        )}
        
        {token?.notes && (
          <div style={{ 
            fontSize: '1.6rem', 
            color: 'rgba(255,255,255,0.75)',
            textAlign: 'center',
            fontStyle: 'italic'
          }}>
            {token.notes}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <html>
      <head>
        <style dangerouslySetInnerHTML={{ __html: fontCSS }} />
      </head>
      <body style={{ margin: 0, padding: 0 }}>
        <div style={containerStyle}>
          <div style={contentStyle}>{renderTokenAnalysis()}</div>
          <div style={progressContainerStyle}>
            {Array.from({ length: totalSlides }).map((_, i) => (
              <div key={i} style={progressDotStyle(i === slideNumber)} />
            ))}
          </div>
        </div>
      </body>
    </html>
  );
};

export function renderSentenceAnalysisToHTML(analysis: any) {
  const tokens = analysis?.tokens || [];
  console.log(`[TEMPLATE] Rendering ${tokens.length} token slides for sentence analysis`);
  console.log(`[TEMPLATE] Tokens:`, tokens.map((t: any) => t.surface).join(', '));
  
  // Generate one slide per token
  const slides = tokens.map((token: any, index: number) => {
    console.log(`[TEMPLATE] Rendering slide ${index + 1} for token: ${token.surface}`);
    return ReactDOMServer.renderToString(
      <SentenceAnalysisSlide
        analysis={analysis}
        token={token}
        tokenIndex={index}
        slideNumber={index}
        totalSlides={tokens.length}
      />
    );
  });
  
  console.log(`[TEMPLATE] Generated ${slides.length} slides total`);
  return slides;
}