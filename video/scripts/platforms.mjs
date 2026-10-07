// Per-platform post text for a finished lesson video, so the posting agent can put the same
// video on every platform without rewriting anything. Links carry utm_source=<platform> so
// signups can be attributed per platform, utm_campaign=<account> and, where the link is in the
// post itself, utm_content=<post id>.

const SITE = 'https://hanbokstudy.com/';

export function link(platform, account, postId, base = SITE) {
  const url = new URL(base);
  url.searchParams.set('utm_source', platform);
  url.searchParams.set('utm_medium', 'social');
  url.searchParams.set('utm_campaign', account);
  if (postId) url.searchParams.set('utm_content', postId);
  return url.toString();
}

const clip = (text, max) => (text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`);

// caption: the TikTok caption (text, then hashtags). learnUrl: a matching Learn article, if any.
export function platformPosts({ id, account, hook, caption, title, learnUrl }) {
  const hashtags = [...new Set(caption.match(/#[\p{L}\p{N}_]+/gu) || [])];
  const text = caption.replace(/#[\p{L}\p{N}_]+/gu, '').replace(/\n{3,}/g, '\n\n').trim();
  const tags = hashtags.join(' ');
  const social = `${text}\n\nBreak down any Korean line on Hanbok (link in bio).\n\n${tags}`.trim();
  return {
    // Link goes in the profile bio, which the account setup already points at utm_source=tiktok.
    tiktok: { caption },
    youtube: {
      title: hook.length <= 92 ? `${hook} #Shorts` : clip(hook, 100),
      description: `${text}\n\nBreak down any Korean line: ${link('youtube', account, id)}\n\n${tags}`.trim(),
      tags: hashtags.map(h => h.slice(1))
    },
    // Instagram captions can't hold a clickable link, so both point at the profile link; bioLink is
    // what that profile link should be (per account, not per post).
    instagram: { caption: social, bioLink: link('instagram', account) },
    facebook: { caption: social, bioLink: link('facebook', account) },
    pinterest: {
      title: clip(title || hook, 100),
      description: clip(`${text} ${tags}`.trim(), 500),
      link: link('pinterest', account, id, learnUrl || SITE)
    }
  };
}
