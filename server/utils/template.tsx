import React from 'react';
import ReactDOMServer from 'react-dom/server';
import fs from 'fs';
import path from 'path';

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

// Function to detect and wrap Korean and Japanese text
function wrapAsianText(text: string): React.ReactElement {
  // Korean character ranges: \uAC00-\uD7AF (Hangul syllables) + \u1100-\u11FF (Hangul Jamo) + \u3130-\u318F (Hangul compatibility Jamo)
  // Japanese character ranges: \u3040-\u309F (Hiragana) + \u30A0-\u30FF (Katakana) + \u4E00-\u9FAF (CJK Unified Ideographs/Kanji)
  const asianRegex = /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+/g;
  
  const parts = text.split(asianRegex);
  const asianMatches = text.match(asianRegex) || [];
  
  let result: (string | React.ReactElement)[] = [];
  
  for (let i = 0; i < parts.length; i++) {
    if (parts[i]) {
      result.push(parts[i]);
    }
    if (asianMatches[i]) {
      result.push(
        <span 
          key={i}
          style={{
            fontFamily: 'Hahmlet, serif',
            backgroundColor: 'rgba(255, 215, 0, 0.9)', // Gold background
            color: '#000',
            padding: '0.2rem 0.5rem', // Slightly increased for bigger images
            borderRadius: '0.5rem',    // Slightly increased
            fontWeight: '400',
            display: 'inline-block',
            textShadow: 'none',
            margin: '0 0.2rem'
          }}
        >
          {asianMatches[i]}
        </span>
      );
    }
  }
  
  return <>{result}</>;
}

interface SlideProps {
  text: string;
  slideNumber: number;
  totalSlides: number;
  isHookSlide: boolean;
  isCtaSlide: boolean;
  backgroundImagePath?: string; // Pre-selected image path for this slide
}

const Slide: React.FC<SlideProps> = ({ text, slideNumber, totalSlides, isHookSlide, isCtaSlide, backgroundImagePath }) => {
  const fontCSS = generateFontCSS();
  
  // Use pre-selected background image path, or pick one if not provided
  let imagePath = backgroundImagePath;
  if (!imagePath) {
    let imageDir = 'assets/content-slides'; // Default to content slides
    if (isHookSlide) {
      imageDir = 'assets/hook-slides';
    }
    // CTA slides now use content-slides folder like other content slides
    imagePath = pickRandomImage(imageDir);
  }
  
  const backgroundBase64 = imagePath ? imageToBase64(imagePath) : '';

  const containerStyle: React.CSSProperties = {
    width: '1080px',  // Increased from 700px for crispness
    height: '1350px', // Increased from 800px - maintaining 4:5 aspect ratio
    position: 'relative',
    overflow: 'hidden',
    backgroundImage: backgroundBase64 ? `url(${backgroundBase64})` : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    fontFamily: 'TikTokSans, Arial Black, Helvetica, sans-serif',
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
    backgroundColor: 'rgba(0, 0, 0, 0.4)', // Dark tint for text legibility
    zIndex: 1
  };

  const textContainerStyle: React.CSSProperties = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '85%',
    maxWidth: '900px', // Increased from 600px
    zIndex: 10
  };

  const textBubbleStyle: React.CSSProperties = {
    padding: '3rem 2.5rem',  // Increased padding for bigger images
  };

  const textStyle: React.CSSProperties = {
    fontSize: '4rem', // Increased from 3.2rem for better crispness
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
    lineHeight: '1.3',
    margin: 0,
    fontFamily: 'TikTokSans, Arial Black, sans-serif',
    textShadow: '4px 4px 0px #000000, -4px -4px 0px #000000, 4px -4px 0px #000000, -4px 4px 0px #000000', // Increased shadow for bigger text
    WebkitTextStroke: '0px transparent'
  };

  const progressContainerStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: '2rem',   // Increased spacing
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    gap: '1rem',      // Increased gap
    zIndex: 10
  };

  const progressDotStyle = (isActive: boolean): React.CSSProperties => ({
    width: '16px',       // Increased from 12px
    height: '16px',      // Increased from 12px
    borderRadius: '50%',
    backgroundColor: isActive ? '#fff' : 'rgba(255, 255, 255, 0.5)',
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)' // Enhanced shadow
  });

  return (
    <html>
      <head>
        <style dangerouslySetInnerHTML={{ __html: fontCSS }} />
      </head>
      <body style={{ margin: 0, padding: 0 }}>
        <div style={containerStyle}>
          {/* Dark tint overlay */}
          <div style={overlayStyle} />
          
          {/* Text content */}
          <div style={textContainerStyle}>
            <div style={textBubbleStyle}>
              <div style={textStyle}>
                {wrapAsianText(text)}
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
};

export function renderSlidesToHTML(slides: any[]) {
  console.log(`[TEMPLATE] Rendering ${slides.length} slides with unique image system`);
  
  // Get shuffled content slide images for non-hook slides
  const contentImages = getShuffledImages('assets/content-slides');
  let contentImageIndex = 0;
  
  return slides.map((slide, index) => {
    const isHookSlide = index === 0; // First slide is hook slide
    const isCtaSlide = index === slides.length - 1; // Last slide is CTA slide
    
    let slideType = 'content';
    let backgroundImagePath: string | undefined;
    
    if (isHookSlide) {
      slideType = 'hook';
      // Hook slides pick their own random image from hook-slides
      backgroundImagePath = undefined;
    } else {
      // Content slides (including CTA) use shuffled content images
      slideType = isCtaSlide ? 'cta' : 'content';
      backgroundImagePath = isCtaSlide ? pickRandomImage('assets/cta-slides') : contentImages[contentImageIndex % contentImages.length];
      contentImageIndex++;
    }
    
    console.log(`[TEMPLATE] Rendering slide ${index + 1}: "${slide.text}" (${slideType} slide) with image: ${backgroundImagePath ? path.basename(backgroundImagePath) : 'random'}`);
    return ReactDOMServer.renderToString(
      <Slide 
        text={slide.text} 
        slideNumber={index}
        totalSlides={slides.length}
        isHookSlide={isHookSlide}
        isCtaSlide={isCtaSlide}
        backgroundImagePath={backgroundImagePath}
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