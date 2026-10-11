// Makes one line breakdown without the server: one process that exits when output/<id>/ is done.
//   npm run breakdown -- "우리는 깐부잖아" --source "Squid Game" --account kdrama
// Same result as POST /api/line-breakdown. Prints the output folder on the last line.
import { buildLineBreakdown, makeLineBreakdownId } from './utils/lineBreakdownJob';

const args = process.argv.slice(2);
const flag = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const line = args.find((a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--'));
if (!line) {
  console.error('Usage: npm run breakdown -- "<line>" [--source "<show or song>"] [--account main|kdrama|kpop] [--language korean|japanese]');
  process.exit(1);
}

const id = makeLineBreakdownId(line);
const dir = await buildLineBreakdown(id, {
  line,
  source: flag('source'),
  account: flag('account'),
  language: flag('language'),
  style: flag('style')
});
console.log(dir);
