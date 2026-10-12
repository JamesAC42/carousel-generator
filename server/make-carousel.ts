// Makes one Bright Path carousel without the server. Three lesson types:
//   npm run carousel -- vs "보고 싶다 vs 보고 싶어하다" --account main
//   npm run carousel -- phrase "I'm full" --account main
//   npm run carousel -- line "우리는 깐부잖아" --source "Squid Game" --account kdrama
// `line` is the same as `npm run breakdown`. Prints the output folder on the last line.
import { buildLesson, makeLessonId } from './utils/lessonJob';
import { buildLineBreakdown, makeLineBreakdownId } from './utils/lineBreakdownJob';
import { LESSON_TYPES, LessonType } from '../shared/templates/lessonCarousel';

const args = process.argv.slice(2);
const flag = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const positional = args.filter((a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--'));
const [type, topic] = positional;
if (!topic || !(type === 'line' || (LESSON_TYPES as string[]).includes(type))) {
  console.error([
    'Usage:',
    '  npm run carousel -- vs "<word A> vs <word B>" [--account main|kdrama|kpop]',
    '  npm run carousel -- phrase "<English phrase>" [--account ...]',
    '  npm run carousel -- line "<Korean line>" --source "<show or song>" [--account ...]'
  ].join('\n'));
  process.exit(1);
}

const dir = type === 'line'
  ? await buildLineBreakdown(makeLineBreakdownId(topic), { line: topic, source: flag('source'), account: flag('account') })
  : await buildLesson(makeLessonId(type as LessonType, topic), type as LessonType, topic, flag('account'));
console.log(dir);
