import { describe, expect, it } from 'vitest';
import { canonicalUrl, platformFromUrl } from '../../src/features/workspace/core/ids';

describe('links das publicações', () => {
  it.each([
    ['https://www.instagram.com/p/NUY/', 'instagram'],
    ['https://instagram.com/reel/NUY', 'instagram'],
    ['https://www.tiktok.com/@nuy/video/1', 'tiktok'],
    ['https://vm.tiktok.com/NUY', 'tiktok'],
    ['https://youtu.be/NUY', 'youtube'],
    ['https://www.youtube.com/watch?v=NUY', 'youtube'],
    ['https://shopee.com.br/product/1', 'shopee'],
    ['https://instagram.com.example.org/p/NUY', 'instagram.com.example.org'],
  ])('identifica a plataforma de %s', (url, platform) => {
    expect(platformFromUrl(canonicalUrl(url)!)).toBe(platform);
  });

  it('preserva parâmetros codificados sem criar outros parâmetros ao salvar', () => {
    const canonical = canonicalUrl(
      'https://www.example.com/video?target=a%26b%3Dc&label=NUY%20%2B%20casa&utm_source=instagram',
    );
    expect(canonical).toBe('https://example.com/video?label=NUY+%2B+casa&target=a%26b%3Dc');
    const result = new URL(canonical!);
    expect([...result.searchParams.entries()]).toEqual([
      ['label', 'NUY + casa'],
      ['target', 'a&b=c'],
    ]);
  });
});
