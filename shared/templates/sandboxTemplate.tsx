import React from 'react';
import { wrapAsianText } from './classicLesson.tsx';

export type SandboxBadgeAlignment = 'left' | 'center' | 'right';

export interface SandboxBadgeConfig {
  text: string;
  align?: SandboxBadgeAlignment;
  color?: string;
}

export interface SandboxBulletItem {
  title: string;
  body?: string;
  accent?: string;
}

export interface SandboxThemeConfig {
  background?: string;
  overlay?: string;
  accent?: string;
  foreground?: string;
  muted?: string;
  fontFamily?: string;
  panel?: string;
  bulletBackground?: string;
}

export interface SandboxSlideData {
  headline: string;
  lead?: string;
  supporting?: string;
  badge?: SandboxBadgeConfig;
  bullets?: SandboxBulletItem[];
  footer?: string;
  theme?: SandboxThemeConfig;
}

export interface SandboxSlideProps {
  data: SandboxSlideData;
  fontCSS?: string;
}

const DEFAULT_THEME: Required<SandboxThemeConfig> = {
  background: 'linear-gradient(135deg, #312e81 0%, #0f172a 100%)',
  overlay: 'rgba(8, 16, 32, 0.58)',
  accent: '#f2c14e',
  foreground: '#ffffff',
  muted: 'rgba(255, 255, 255, 0.78)',
  fontFamily: 'TikTokSans, Arial Black, Helvetica, sans-serif',
  panel: 'rgba(8, 14, 28, 0.75)',
  bulletBackground: 'rgba(15, 23, 42, 0.64)'
};

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

const contentShellStyle: React.CSSProperties = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '85%',
  maxWidth: '920px',
  zIndex: 10
};

const panelStyle: React.CSSProperties = {
  borderRadius: '1.75rem',
  padding: '3.5rem 3rem',
  backdropFilter: 'blur(14px)',
  boxShadow: '0 2.5rem 4.5rem rgba(0, 0, 0, 0.4)'
};

const headlineStyle: React.CSSProperties = {
  fontSize: '4.8rem',
  lineHeight: 1.15,
  margin: 0,
  fontWeight: 700,
  textAlign: 'center'
};

const leadStyle: React.CSSProperties = {
  fontSize: '2.4rem',
  lineHeight: 1.4,
  margin: '1.5rem 0 0',
  textAlign: 'center'
};

const supportingStyle: React.CSSProperties = {
  fontSize: '1.9rem',
  lineHeight: 1.5,
  margin: '1.5rem 0 0',
  textAlign: 'center'
};

const badgeRowStyle: React.CSSProperties = {
  display: 'flex',
  width: '100%',
  marginBottom: '1.5rem'
};

const badgeStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '0.45rem 1.1rem',
  borderRadius: '9999px',
  fontSize: '1.4rem',
  fontWeight: 700,
  letterSpacing: '0.05em',
  textTransform: 'uppercase'
};

const bulletsShellStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
  gap: '1.25rem',
  marginTop: '2.5rem'
};

const bulletItemStyle: React.CSSProperties = {
  borderRadius: '1.25rem',
  padding: '1.4rem 1.6rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.6rem',
  border: '0.15rem solid rgba(255, 255, 255, 0.08)'
};

const bulletTitleStyle: React.CSSProperties = {
  fontSize: '2rem',
  fontWeight: 650,
  lineHeight: 1.25,
  margin: 0
};

const bulletBodyStyle: React.CSSProperties = {
  fontSize: '1.55rem',
  lineHeight: 1.45,
  margin: 0
};

const footerStyle: React.CSSProperties = {
  fontSize: '1.6rem',
  lineHeight: 1.4,
  margin: '2.5rem 0 0',
  textAlign: 'center',
  fontWeight: 600
};

const determineBadgeJustification = (align?: SandboxBadgeAlignment) => {
  switch (align) {
    case 'center':
      return 'center';
    case 'right':
      return 'flex-end';
    case 'left':
    default:
      return 'flex-start';
  }
};

export const SandboxSlideCanvas: React.FC<SandboxSlideProps> = ({ data }) => {
  const theme = { ...DEFAULT_THEME, ...(data.theme || {}) };

  const backgroundStyle: React.CSSProperties = {
    ...containerStyle,
    backgroundImage: theme.background?.startsWith('data:') || theme.background?.startsWith('linear') || theme.background?.startsWith('radial') || theme.background?.startsWith('#')
      ? theme.background
      : `url(${theme.background})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    fontFamily: theme.fontFamily,
    color: theme.foreground
  };

  return (
    <div style={backgroundStyle}>
      <div style={{ ...overlayStyle, backgroundColor: theme.overlay }} />
      <div style={contentShellStyle}>
        <div style={{ ...panelStyle, backgroundColor: theme.panel }}>
          {data.badge?.text ? (
            <div style={{ ...badgeRowStyle, justifyContent: determineBadgeJustification(data.badge.align) }}>
              <span
                style={{
                  ...badgeStyle,
                  backgroundColor: data.badge.color || theme.accent,
                  color: data.badge.color ? '#0b0f14' : '#111827'
                }}
              >
                {wrapAsianText(data.badge.text)}
              </span>
            </div>
          ) : null}

          <h1 style={headlineStyle}>{wrapAsianText(data.headline)}</h1>

          {data.lead ? (
            <p style={{ ...leadStyle, color: theme.muted }}>{wrapAsianText(data.lead)}</p>
          ) : null}

          {data.supporting ? (
            <p style={{ ...supportingStyle, color: theme.muted }}>{wrapAsianText(data.supporting)}</p>
          ) : null}

          {data.bullets && data.bullets.length > 0 ? (
            <div style={bulletsShellStyle}>
              {data.bullets.map((bullet, index) => (
                <div
                  key={`bullet-${index}`}
                  style={{
                    ...bulletItemStyle,
                    backgroundColor: theme.bulletBackground,
                    borderColor: bullet.accent || theme.accent
                  }}
                >
                  <h3 style={{
                    ...bulletTitleStyle,
                    color: bullet.accent || theme.accent
                  }}>
                    {wrapAsianText(bullet.title)}
                  </h3>
                  {bullet.body ? (
                    <p style={{ ...bulletBodyStyle, color: theme.muted }}>{wrapAsianText(bullet.body)}</p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}

          {data.footer ? (
            <p style={{ ...footerStyle, color: theme.muted }}>{wrapAsianText(data.footer)}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export const SandboxSlideDocument: React.FC<SandboxSlideProps> = ({ data, fontCSS }) => (
  <html>
    <head>
      {fontCSS ? <style dangerouslySetInnerHTML={{ __html: fontCSS }} /> : null}
    </head>
    <body style={{ margin: 0, padding: 0 }}>
      <SandboxSlideCanvas data={data} />
    </body>
  </html>
);


