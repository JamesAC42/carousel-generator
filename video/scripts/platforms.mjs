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

// kind: 'video' (a lesson video) or 'slides' (a line-breakdown slideshow). caption: the TikTok caption
// (text, then hashtags). learnUrl: a matching Learn article, if any. cover: the slideshow's first
// slide, for the Pinterest pin. Each platform gets only the kinds it's worth posting there.
export function platformPosts({ kind = 'video', id, account, hook, caption, title, learnUrl, cover = 'slide-1.png' }) {
  const hashtags = [...new Set(caption.match(/#[\p{L}\p{N}_]+/gu) || [])];
  const text = caption.replace(/#[\p{L}\p{N}_]+/gu, '').replace(/\n{3,}/g, '\n\n').trim();
  const tags = hashtags.join(' ');
  const social = `${text}\n\nBreak down any Korean line on Hanbok (link in bio).\n\n${tags}`.trim();
  // Link goes in the profile bio, which the account setup already points at utm_source=tiktok.
  const tiktok = { caption };
  // Instagram captions can't hold a clickable link, so both point at the profile link; bioLink is
  // what that profile link should be. Only TikTok has the niche accounts; everywhere else one brand
  // account posts everything, so its profile link is the main one. Links inside posts keep the account.
  const instagram = { caption: social, bioLink: link('instagram', 'main') };
  const facebook = { caption: social, bioLink: link('facebook', 'main') };
  if (kind === 'slides') {
    return {
      tiktok,
      instagram,
      facebook,
      // One pin per slideshow: the cover slide, linking straight to the site (pins keep their link).
      pinterest: {
        image: cover,
        title: clip(title || hook, 100),
        description: clip(`${text} ${tags}`.trim(), 500),
        link: link('pinterest', account, id, learnUrl || SITE)
      }
    };
  }
  return {
    tiktok,
    youtube: {
      title: hook.length <= 92 ? `${hook} #Shorts` : clip(hook, 100),
      description: `${text}\n\nBreak down any Korean line: ${link('youtube', account, id)}\n\n${tags}`.trim(),
      tags: hashtags.map(h => h.slice(1)),
      // Links in Shorts descriptions aren't clickable, so the channel's own link is the one that counts.
      bioLink: link('youtube', 'main')
    },
    instagram,
    facebook
  };
}
