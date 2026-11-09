export type Influencer = {
  handle: string;
  width: number;
  height: number;
  src: string;
  fileId?: string;
};

export const defaultInfluencers: readonly Influencer[] = [
  {
    handle: 'thay_emilyane',
    width: 345,
    height: 504,
    src: '/brand/editorial/influenciadoras/thay_emilyane.webp',
  },
  {
    handle: 'jusouza_blog',
    width: 348,
    height: 500,
    src: '/brand/editorial/influenciadoras/jusouza_blog.webp',
  },
  {
    handle: 'ledianemartins',
    width: 349,
    height: 503,
    src: '/brand/editorial/influenciadoras/ledianemartins.webp',
  },
  {
    handle: 'larissacamposs1',
    width: 349,
    height: 504,
    src: '/brand/editorial/influenciadoras/larissacamposs1.webp',
  },
  {
    handle: 'mariannemarie94',
    width: 347,
    height: 505,
    src: '/brand/editorial/influenciadoras/mariannemarie94.webp',
  },
  {
    handle: 'julianavilargh',
    width: 346,
    height: 496,
    src: '/brand/editorial/influenciadoras/julianavilargh.webp',
  },
  {
    handle: 'bylaricavalcanti',
    width: 345,
    height: 502,
    src: '/brand/editorial/influenciadoras/bylaricavalcanti.webp',
  },
];

export const INFLUENCERS_SETTING_KEY = 'public_influencers';

export function influencerByHandle(handle: string) {
  return defaultInfluencers.find((influencer) => influencer.handle === handle) ?? null;
}
