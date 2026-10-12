import React from 'react';
import {
  Answer, BP, Card, CarouselArt, DISPLAY, H, HookTitle, Img, KR, LETTERS, Page, Pill, Progress,
  SAFE, Swipe, Title, fit, fitEn, plainHook
} from './carouselStyles';

// Topic lessons in the Bright Path quiz look, for posts that don't start from a show's line:
//
//   vs     "Don't confuse these two": 보고 싶다 vs 보고 싶어하다, 은/는 vs 이/가 ...
//          hook -> which one fits? -> reveal -> word A -> word B -> the trick -> round 2 -> cheat sheet -> CTA
//   phrase "How to say ___": I'm full, Let's eat, Excuse me ...
//          hook -> which one would a Korean say? -> reveal -> breakdown -> who you say it to -> in a chat -> cheat sheet -> CTA
//
// One idea per slide and few words on each: a slide gets about two seconds of attention.
// The poll earns comments, the cheat sheet earns saves. Slides are 1080x1350; text stays in SAFE.

export type LessonType = 'vs' | 'phrase';
export const LESSON_TYPES: LessonType[] = ['vs', 'phrase'];

export interface Said {
  native: string;
  romanization: string;
  english: string;
}

export interface VsItem {
  native: string;
  romanization: string;
  meaning: string;
  when: string;
  emoji: string;
  example: Said;
}

export interface VsLesson {
  type: 'vs';
  title: string;
  hooks: string[];
  a: VsItem;
  b: VsItem;
  rule: string;
  // `sentence` has "___" where the word goes and `fill` is the right answer's exact text for
  // that blank (conjugated, so not always a.native or b.native); answer 0 is a, 1 is b.
  quiz: { situation: string; sentence: string; fill?: string; english: string; answer: number; why: string };
  round2: { situation: string; sentence: string; fill?: string; english: string; answer: number };
  caption: string;
  hashtags: string[];
}

export interface PhraseLesson {
  type: 'phrase';
  title: string;
  hooks: string[];
  english: string;
  phrase: { native: string; romanization: string; literal: string };
  quiz: { options: { native: string; romanization: string }[]; answer: number; why: string };
  parts: { native: string; romanization: string; meaning: string }[];
  levels: { who: string; native: string; romanization: string }[];
  chat: { them: Said; you: Said };
  caption: string;
  hashtags: string[];
}

export type Lesson = VsLesson | PhraseLesson;

export type LessonSlide =
  | { kind: 'hook'; hook: string }
  | { kind: 'quiz' }
  | { kind: 'reveal' }
  | { kind: 'item'; which: 'a' | 'b' }
  | { kind: 'rule' }
  | { kind: 'round2' }
  | { kind: 'parts' }
  | { kind: 'levels' }
  | { kind: 'chat' }
  | { kind: 'recap' }
  | { kind: 'cta' };

export function lessonSlides(lesson: Lesson, hook = lesson.hooks[0]): LessonSlide[] {
  const middle: LessonSlide[] = lesson.type === 'vs'
    ? [{ kind: 'item', which: 'a' }, { kind: 'item', which: 'b' }, { kind: 'rule' }, { kind: 'round2' }]
    : [{ kind: 'parts' }, { kind: 'levels' }, { kind: 'chat' }];
  return [{ kind: 'hook', hook }, { kind: 'quiz' }, { kind: 'reveal' }, ...middle, { kind: 'recap' }, { kind: 'cta' }];
}

// Content sits between the progress bar and y=950; stickers go below and beside it.
const safe: React.CSSProperties = {
  position: 'absolute', top: `${SAFE.top}px`, bottom: `${H - 950}px`, left: `${SAFE.left}px`, right: `${SAFE.right - 40}px`,
  display: 'flex', flexDirection: 'column', justifyContent: 'safe center', gap: '30px'
};

const BottomLine: React.FC<{ children: React.ReactNode; color: string }> = ({ children, color }) => (
  <div style={{ position: 'absolute', left: `${SAFE.left}px`, bottom: `${SAFE.bottom - 10}px`, fontSize: '46px', fontWeight: 800, color }}>{children}</div>
);

const Romanized: React.FC<{ native: string; romanization: string; size: number; color?: string }> = ({ native, romanization, size, color = BP.ink }) => (
  <div>
    <div style={{ fontFamily: KR, fontWeight: 800, fontSize: `${size}px`, lineHeight: 1.12, color }}>{native}</div>
    <div style={{ fontSize: `${Math.max(30, Math.min(42, Math.round(size * 0.32)))}px`, fontWeight: 700, color: BP.muted, marginTop: '8px' }}>{romanization}</div>
  </div>
);

// The quiz sentence with its blank drawn as a slot (or filled in, highlighted).
const Blank: React.FC<{ sentence: string; fill?: string; size: number }> = ({ sentence, fill, size }) => {
  const [before, after = ''] = sentence.split(/_{2,}/);
  return (
    <div style={{ fontFamily: KR, fontWeight: 800, fontSize: `${size}px`, lineHeight: 1.3 }}>
      {before}
      {fill
        ? <span style={{ background: '#D7F5F1', color: BP.tealDark, borderRadius: '14px', padding: '0 12px' }}>{fill}</span>
        : <span style={{ display: 'inline-block', width: `${size * 2.4}px`, borderBottom: `8px solid ${BP.blue}`, margin: '0 8px' }} />}
      {after}
    </div>
  );
};

// The dictionary form ("-고 싶다") drops a leading hyphen when filled into a sentence.
const bare = (s: string) => s.replace(/^[-~]/, '');

function vsSlide(slide: LessonSlide, l: VsLesson, m: Record<string, string>, body: (bg: string, c: React.ReactNode, dark?: boolean) => React.ReactNode) {
  const items = [l.a, l.b];
  switch (slide.kind) {
    case 'hook':
      return body(BP.coral, (
        <>
          <div style={{ ...safe, gap: '34px' }}>
            <HookTitle text={slide.hook} size={fitEn(plainHook(slide.hook), 132, 24)} />
            <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '34px', marginTop: '6px' }}>
              {items.map((it, i) => (
                <Card key={i} shadow={BP.coralDark} style={{ padding: '24px 56px', transform: `rotate(${i ? 1.6 : -1.6}deg)`, alignSelf: i ? 'flex-end' : 'flex-start', minWidth: '300px', textAlign: 'center' }}>
                  <div style={{ fontFamily: KR, fontWeight: 800, fontSize: `${fit(it.native, 150, 680)}px`, lineHeight: 1.1 }}>{it.native}</div>
                </Card>
              ))}
              <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%) rotate(-6deg)', width: '130px', height: '130px', borderRadius: '50%', background: BP.amber, color: BP.amberInk, fontFamily: DISPLAY, fontSize: '64px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 8px 0 ${BP.amberDark}`, border: '6px solid #fff' }}>VS</div>
            </div>
          </div>
          <Img src={m['magpie-think']} style={{ right: '120px', bottom: '80px', height: '300px' }} />
          <Swipe label="Learn the difference" />
        </>
      ));
    case 'quiz':
      return body(BP.paper, (
        <>
          <div style={safe}>
            <Title size={74} color={BP.ink}>Which one fits?</Title>
            <Card shadow={BP.line} style={{ border: `4px solid ${BP.line}`, padding: '30px 40px' }}>
              <div style={{ fontSize: '34px', fontWeight: 800, color: BP.blue, marginBottom: '14px' }}>{l.quiz.situation}</div>
              <Blank sentence={l.quiz.sentence} size={fit(l.quiz.sentence.replace(/_+/g, '가나다'), 74, 760)} />
              <div style={{ fontSize: '34px', fontWeight: 700, color: BP.muted, marginTop: '10px' }}>"{l.quiz.english}"</div>
            </Card>
            {items.map((it, i) => <Answer key={i} letter={LETTERS[i]} text={it.native} sub={it.romanization} korean />)}
          </div>
          <Img src={m['tiger-think']} style={{ right: '160px', bottom: '110px', height: '250px' }} />
          <BottomLine color={BP.blue}>Comment A or B 👇</BottomLine>
        </>
      ), true);
    case 'reveal': {
      const fill = l.quiz.fill || bare((items[l.quiz.answer] || l.a).native);
      return body(BP.paper, (
        <>
          <div style={{ ...safe, bottom: undefined, justifyContent: 'flex-start', top: `${SAFE.top + 40}px` }}>
            <Title size={74} color={BP.ink}>It's {LETTERS[l.quiz.answer] || 'A'}!</Title>
            <Card shadow={BP.line} style={{ border: `4px solid ${BP.line}`, padding: '30px 40px' }}>
              <Blank sentence={l.quiz.sentence} fill={fill} size={fit(l.quiz.sentence.replace(/_+/g, fill), 74, 760)} />
            </Card>
            {items.map((it, i) => <Answer key={i} letter={LETTERS[i]} text={it.native} korean state={i === l.quiz.answer ? 'right' : 'wrong'} />)}
          </div>
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '400px', background: '#D7F5F1', borderTop: `6px solid ${BP.teal}`, padding: `40px ${SAFE.right}px 0 ${SAFE.left}px` }}>
            <div style={{ fontFamily: DISPLAY, fontSize: '56px', color: BP.tealDark }}>Why</div>
            <div style={{ fontSize: '42px', fontWeight: 700, color: '#0A5F57', marginTop: '10px', lineHeight: 1.3, maxWidth: '640px' }}>{l.quiz.why}</div>
          </div>
          <Img src={m['tiger-celebrate']} style={{ right: '60px', bottom: '250px', height: '280px' }} />
        </>
      ), true);
    }
    case 'item': {
      const it = slide.which === 'a' ? l.a : l.b;
      const [bg, dark] = slide.which === 'a' ? [BP.blue, BP.blueDark] : [BP.purple, BP.purpleDark];
      return body(bg, (
        <>
          <div style={safe}>
            <div><Pill bg="rgba(0,0,0,0.2)">{slide.which === 'a' ? 'A' : 'B'} · {it.emoji} {it.meaning}</Pill></div>
            <Card shadow={dark} style={{ padding: '44px 50px' }}>
              <Romanized native={it.native} romanization={it.romanization} size={fit(it.native, 190, 800)} />
              <div style={{ height: '4px', background: BP.line, borderRadius: '2px', margin: '28px 0' }} />
              <div style={{ fontFamily: DISPLAY, fontSize: `${fitEn(it.when, 62, 24)}px`, lineHeight: 1.12, color: dark }}>{it.when}</div>
            </Card>
            <div style={{ alignSelf: 'flex-start', maxWidth: '760px', background: '#fff', borderRadius: '30px', padding: '24px 32px', boxShadow: `0 8px 0 ${dark}` }}>
              <div style={{ fontFamily: KR, fontSize: `${fit(it.example.native, 52, 680)}px`, fontWeight: 800 }}>{it.example.native}</div>
              <div style={{ fontSize: '34px', fontWeight: 700, color: BP.muted, marginTop: '6px' }}>{it.example.english}</div>
            </div>
          </div>
          <Img src={m[slide.which === 'a' ? 'tiger-teach' : 'magpie-teach']} style={{ right: '160px', bottom: '110px', height: '250px' }} />
        </>
      ));
    }
    case 'rule':
      return body(BP.teal, (
        <>
          <div style={safe}>
            <div><Pill bg="rgba(0,0,0,0.2)">The trick</Pill></div>
            <Title size={fitEn(l.rule, 86, 30)}>{l.rule}</Title>
            <div style={{ display: 'flex', gap: '26px' }}>
              {items.map((it, i) => (
                <Card key={i} shadow={BP.tealDark} style={{ flex: 1, padding: '30px 30px', textAlign: 'center' }}>
                  <div style={{ fontSize: '84px', lineHeight: 1 }}>{it.emoji}</div>
                  <div style={{ fontFamily: KR, fontWeight: 800, fontSize: `${fit(it.native, 64, 340)}px`, marginTop: '16px' }}>{it.native}</div>
                  <div style={{ fontSize: '34px', fontWeight: 800, color: BP.tealDark, marginTop: '8px' }}>{it.meaning}</div>
                </Card>
              ))}
            </div>
          </div>
          <Img src={m['magpie-study']} style={{ right: '160px', bottom: '110px', height: '240px' }} />
        </>
      ));
    case 'round2':
      return body(BP.orange, (
        <>
          <div style={safe}>
            <div><Pill bg="rgba(0,0,0,0.2)">Round 2</Pill></div>
            <Title size={80}>Your turn. Which one?</Title>
            <Card shadow={BP.orangeDark} style={{ padding: '30px 40px' }}>
              <div style={{ fontSize: '34px', fontWeight: 800, color: BP.orangeDark, marginBottom: '14px' }}>{l.round2.situation}</div>
              <Blank sentence={l.round2.sentence} size={fit(l.round2.sentence.replace(/_+/g, '가나다'), 74, 760)} />
              <div style={{ fontSize: '34px', fontWeight: 700, color: BP.muted, marginTop: '10px' }}>"{l.round2.english}"</div>
            </Card>
            <div style={{ display: 'flex', gap: '24px' }}>
              {items.map((it, i) => (
                <div key={i} style={{ flex: 1, background: '#fff', borderRadius: '28px', padding: '22px 26px', boxShadow: `0 8px 0 ${BP.orangeDark}`, display: 'flex', alignItems: 'center', gap: '18px' }}>
                  <span style={{ fontFamily: DISPLAY, fontSize: '48px', color: BP.orangeDark }}>{LETTERS[i]}</span>
                  <span style={{ fontFamily: KR, fontWeight: 800, fontSize: `${fit(it.native, 52, 300)}px` }}>{it.native}</span>
                </div>
              ))}
            </div>
          </div>
          <BottomLine color="#fff">Answer in the comments 👇</BottomLine>
          <Img src={m['tiger-think']} style={{ right: '160px', bottom: '110px', height: '240px' }} />
        </>
      ));
    case 'recap':
      return body(BP.amber, (
        <>
          <div style={safe}>
            <Title size={80} color={BP.amberInk}>Cheat sheet</Title>
            <Card shadow={BP.amberDark} style={{ padding: '30px 40px' }}>
              {items.map((it, i) => (
                <div key={i} style={{ padding: '18px 0', borderTop: i ? `3px solid ${BP.line}` : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '22px', flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: KR, fontWeight: 800, fontSize: `${fit(it.native, 64, 420)}px` }}>{it.native}</span>
                    <span style={{ fontSize: '38px', fontWeight: 800, color: BP.blue }}>{it.emoji} {it.meaning}</span>
                  </div>
                  <div style={{ fontFamily: KR, fontSize: '36px', fontWeight: 700, marginTop: '8px' }}>{it.example.native}</div>
                  <div style={{ fontSize: '30px', fontWeight: 700, color: BP.muted }}>{it.example.english}</div>
                </div>
              ))}
            </Card>
            <div style={{ fontSize: '34px', fontWeight: 800, color: BP.amberInk }}>
              Round 2 answer: {LETTERS[l.round2.answer] || 'A'}
              {l.round2.fill && <span style={{ fontFamily: KR }}> · {l.round2.sentence.replace(/_{2,}/, l.round2.fill)}</span>}
            </div>
          </div>
          <BottomLine color={BP.amberInk}>Save this for later 📌</BottomLine>
          <Img src={m['magpie-study']} style={{ right: '160px', bottom: '110px', height: '230px' }} />
        </>
      ));
    default:
      return null;
  }
}

function phraseSlide(slide: LessonSlide, l: PhraseLesson, m: Record<string, string>, body: (bg: string, c: React.ReactNode, dark?: boolean) => React.ReactNode) {
  switch (slide.kind) {
    case 'hook':
      return body(BP.blue, (
        <>
          <div style={{ ...safe, gap: '40px' }}>
            <HookTitle text={slide.hook} size={fitEn(plainHook(slide.hook), 128, 24)} />
            {/* The English as a speech bubble, the Korean hidden: the answer is a swipe away. */}
            <div style={{ alignSelf: 'flex-start', position: 'relative', background: '#fff', borderRadius: '44px', padding: '30px 50px', boxShadow: `0 12px 0 ${BP.blueDark}` }}>
              <div style={{ fontFamily: DISPLAY, fontSize: `${fitEn(l.english, 96, 14)}px`, color: BP.ink }}>"{l.english}"</div>
              <div style={{ position: 'absolute', left: '70px', bottom: '-34px', width: 0, height: 0, borderLeft: '22px solid transparent', borderRight: '22px solid transparent', borderTop: '36px solid #fff' }} />
            </div>
            <div style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '18px', marginTop: '10px', border: '5px dashed rgba(255,255,255,0.8)', borderRadius: '30px', padding: '18px 34px', color: '#fff' }}>
              <span style={{ fontSize: '46px', fontWeight: 800 }}>In Korean:</span>
              <span style={{ fontFamily: DISPLAY, fontSize: '64px', letterSpacing: '0.12em' }}>???</span>
            </div>
          </div>
          <Img src={m['tiger-think']} style={{ right: '110px', bottom: '90px', height: '330px' }} />
          <Swipe />
        </>
      ));
    case 'quiz':
      return body(BP.paper, (
        <>
          <div style={safe}>
            <Title size={fitEn(l.english, 74, 12)} color={BP.ink}>How do Koreans say <span style={{ whiteSpace: 'nowrap' }}>"{l.english}"?</span></Title>
            {l.quiz.options.map((o, i) => <Answer key={i} letter={LETTERS[i]} text={o.native} sub={o.romanization} korean />)}
          </div>
          <Img src={m['magpie-think']} style={{ right: '160px', bottom: '110px', height: '250px' }} />
          <BottomLine color={BP.blue}>Comment {l.quiz.options.map((_, i) => LETTERS[i]).join(', ').replace(/, ([^,]*)$/, ' or $1')} 👇</BottomLine>
        </>
      ), true);
    case 'reveal':
      return body(BP.paper, (
        <>
          <div style={{ ...safe, bottom: undefined, justifyContent: 'flex-start', top: `${SAFE.top + 40}px` }}>
            <Title size={74} color={BP.ink}>It's {LETTERS[l.quiz.answer] || 'A'}!</Title>
            {l.quiz.options.map((o, i) => <Answer key={i} letter={LETTERS[i]} text={o.native} sub={i === l.quiz.answer ? o.romanization : undefined} korean state={i === l.quiz.answer ? 'right' : 'dim'} />)}
          </div>
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '400px', background: '#D7F5F1', borderTop: `6px solid ${BP.teal}`, padding: `40px ${SAFE.right}px 0 ${SAFE.left}px` }}>
            <div style={{ fontFamily: DISPLAY, fontSize: '56px', color: BP.tealDark }}>Why</div>
            <div style={{ fontSize: '42px', fontWeight: 700, color: '#0A5F57', marginTop: '10px', lineHeight: 1.3, maxWidth: '640px' }}>{l.quiz.why}</div>
          </div>
          <Img src={m['tiger-celebrate']} style={{ right: '60px', bottom: '250px', height: '280px' }} />
        </>
      ), true);
    case 'parts': {
      const tints = [[BP.blue, '#E3EAFE'], [BP.tealDark, '#DDF6F3'], [BP.purpleDark, '#EEE8FE']];
      return body(BP.teal, (
        <>
          <div style={safe}>
            <div><Pill bg="rgba(0,0,0,0.2)">Break it down</Pill></div>
            <Card shadow={BP.tealDark} style={{ padding: '40px 46px' }}>
              <Romanized native={l.phrase.native} romanization={l.phrase.romanization} size={fit(l.phrase.native, 170, 800)} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '30px' }}>
                {l.parts.map((p, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '24px', background: tints[i % 3][1], borderRadius: '20px', padding: '14px 24px' }}>
                    <span style={{ fontFamily: KR, fontWeight: 800, fontSize: `${fit(p.native, 56, 300)}px`, color: tints[i % 3][0], minWidth: '220px' }}>{p.native}</span>
                    <span style={{ fontSize: '38px', fontWeight: 800 }}>{p.meaning}</span>
                  </div>
                ))}
              </div>
            </Card>
            <div style={{ fontSize: '36px', fontWeight: 700, color: '#fff' }}>Word for word: "{l.phrase.literal}"</div>
          </div>
          <Img src={m['tiger-teach']} style={{ right: '160px', bottom: '110px', height: '250px' }} />
        </>
      ));
    }
    case 'levels': {
      const main = l.levels.findIndex(v => v.native === l.phrase.native);
      return body(BP.purple, (
        <>
          <div style={safe}>
            <Title size={80}>Who are you talking to?</Title>
            {l.levels.map((v, i) => (
              <div key={i} style={{ background: '#fff', borderRadius: '30px', padding: '24px 34px', boxShadow: `0 8px 0 ${BP.purpleDark}`, border: i === main ? `5px solid ${BP.amber}` : '5px solid #fff' }}>
                <div style={{ fontSize: '32px', fontWeight: 800, color: BP.purpleDark, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{v.who}</div>
                <div style={{ fontFamily: KR, fontWeight: 800, fontSize: `${fit(v.native, 70, 760)}px`, marginTop: '6px' }}>{v.native}</div>
                <div style={{ fontSize: '32px', fontWeight: 700, color: BP.muted }}>{v.romanization}</div>
              </div>
            ))}
          </div>
          <Img src={m['magpie-speak']} style={{ right: '160px', bottom: '110px', height: '240px' }} />
        </>
      ));
    }
    case 'chat': {
      const bubble = (s: Said, mine: boolean) => (
        <div style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '720px' }}>
          <div style={{ background: mine ? '#FEE500' : '#fff', borderRadius: mine ? '34px 34px 8px 34px' : '34px 34px 34px 8px', padding: '24px 32px', boxShadow: '0 6px 0 rgba(0,0,0,0.08)' }}>
            <div style={{ fontFamily: KR, fontWeight: 800, fontSize: `${fit(s.native, 88, 620)}px` }}>{s.native}</div>
            <div style={{ fontSize: '34px', fontWeight: 700, color: BP.muted, marginTop: '4px' }}>{s.romanization}</div>
          </div>
          <div style={{ fontSize: '38px', fontWeight: 800, color: BP.ink, marginTop: '12px', textAlign: mine ? 'right' : 'left' }}>{s.english}</div>
        </div>
      );
      return body('#BACEE0', (
        <>
          <div style={safe}>
            <Title size={80} color={BP.ink}>Use it like this</Title>
            {bubble(l.chat.them, false)}
            {bubble(l.chat.you, true)}
          </div>
          <Img src={m['tiger-speak']} style={{ left: '90px', bottom: '110px', height: '230px' }} />
        </>
      ), true);
    }
    case 'recap':
      return body(BP.amber, (
        <>
          <div style={safe}>
            <Title size={80} color={BP.amberInk}>Cheat sheet</Title>
            <Card shadow={BP.amberDark} style={{ padding: '30px 40px' }}>
              <div style={{ fontFamily: DISPLAY, fontSize: '50px', color: BP.blue }}>"{l.english}"</div>
              {l.levels.map((v, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '20px', padding: '16px 0', borderTop: `3px solid ${BP.line}`, marginTop: i ? 0 : '14px' }}>
                  <span style={{ fontFamily: KR, fontWeight: 800, fontSize: `${fit(v.native, 58, 520)}px` }}>{v.native}</span>
                  <span style={{ fontSize: '30px', fontWeight: 800, color: BP.muted, textAlign: 'right' }}>{v.who}</span>
                </div>
              ))}
            </Card>
          </div>
          <BottomLine color={BP.amberInk}>Save this for later 📌</BottomLine>
          <Img src={m['magpie-study']} style={{ right: '160px', bottom: '110px', height: '230px' }} />
        </>
      ));
    default:
      return null;
  }
}

function ctaSlide(l: Lesson, m: Record<string, string>, body: (bg: string, c: React.ReactNode) => React.ReactNode) {
  const sample = l.type === 'vs' ? l.a.example : { native: l.phrase.native, english: l.english };
  const ask = l.type === 'vs' ? 'Which two words confuse you? 👇' : 'What should we teach next? 👇';
  return body(BP.blue, (
    <>
      <div style={safe}>
        <div style={{ maxWidth: '640px' }}><Title size={92}>Stuck on a Korean sentence?</Title></div>
        <Card shadow={BP.blueDark} style={{ padding: '34px 36px' }}>
          <div style={{ border: `4px solid ${BP.line}`, borderRadius: '22px', padding: '22px 26px', fontFamily: KR, fontWeight: 800, fontSize: `${fit(sample.native, 80, 740)}px` }}>{sample.native}</div>
          <div style={{ fontSize: '34px', fontWeight: 700, color: BP.muted, margin: '16px 4px 0' }}>{sample.english}</div>
          <div style={{ marginTop: '24px', background: BP.blue, color: '#fff', borderRadius: '20px', padding: '20px', textAlign: 'center', fontSize: '38px', fontWeight: 800, letterSpacing: '0.06em', boxShadow: `0 7px 0 ${BP.blueDark}` }}>BREAK IT DOWN</div>
        </Card>
      </div>
      <div style={{ position: 'absolute', left: `${SAFE.left}px`, bottom: `${SAFE.bottom + 50}px`, color: '#fff', fontSize: '44px', fontWeight: 800 }}>Free at hanbokstudy.com · link in bio</div>
      <Img src={m['magpie-wave']} style={{ right: '70px', top: '150px', height: '230px' }} />
      <div style={{ position: 'absolute', left: `${SAFE.left}px`, bottom: `${SAFE.bottom - 20}px`, color: BP.amber, fontSize: '44px', fontWeight: 800 }}>{ask}</div>
    </>
  ));
}

export const LessonSlideDocument: React.FC<{
  slide: LessonSlide;
  lesson: Lesson;
  art: CarouselArt;
  index: number;
  total: number;
  fontCSS?: string;
}> = ({ slide, lesson, art, index, total, fontCSS }) => {
  const body = (bg: string, children: React.ReactNode, dark = false) => (
    <Page background={bg}>
      <Progress step={index + 1} total={total} dark={dark} />
      {children}
    </Page>
  );
  const m = art.mascot;
  const content = slide.kind === 'cta'
    ? ctaSlide(lesson, m, body)
    : lesson.type === 'vs' ? vsSlide(slide, lesson, m, body) : phraseSlide(slide, lesson, m, body);
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        {fontCSS && <style dangerouslySetInnerHTML={{ __html: fontCSS }} />}
      </head>
      <body style={{ margin: 0, padding: 0 }}>{content}</body>
    </html>
  );
};
