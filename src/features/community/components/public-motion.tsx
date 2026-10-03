'use client';
import { useEffect } from 'react';
import Lenis from 'lenis';
export function PublicMotion() {
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    let lenis: Lenis | undefined;
    const sync = () => {
      lenis?.destroy();
      lenis = undefined;
      if (!media.matches) lenis = new Lenis({ autoRaf: true, anchors: true, duration: 0.9 });
    };
    sync();
    media.addEventListener('change', sync);
    return () => {
      lenis?.destroy();
      media.removeEventListener('change', sync);
    };
  }, []);
  return null;
}
