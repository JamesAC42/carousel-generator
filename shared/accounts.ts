// TikTok accounts we post to. Each gets its own tracked bio link so signups
// can be attributed per account in Umami (utm_campaign).
export interface PostingAccount {
  id: string;
  label: string;
  utmCampaign: string;
  hashtags: string[];
}

export const ACCOUNTS: PostingAccount[] = [
  {
    id: 'main',
    label: '@hanbokstudy (main)',
    utmCampaign: 'main',
    hashtags: ['#learnkorean', '#korean', '#hanbokstudy']
  },
  {
    id: 'kdrama',
    label: 'K-drama lines',
    utmCampaign: 'kdrama',
    hashtags: ['#kdrama', '#learnkorean', '#koreanwithkdrama']
  },
  {
    id: 'kpop',
    label: 'K-pop lyrics',
    utmCampaign: 'kpop',
    hashtags: ['#kpop', '#learnkorean', '#kpoplyrics']
  }
];

export function getAccount(id?: string): PostingAccount {
  return ACCOUNTS.find(a => a.id === id) || ACCOUNTS[0];
}

export function bioLink(account: PostingAccount): string {
  return `https://hanbokstudy.com/?utm_source=tiktok&utm_medium=social&utm_campaign=${account.utmCampaign}`;
}
