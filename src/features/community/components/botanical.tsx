import { useId } from 'react';

/** Original decorative illustration, not an official product photograph. */
export function Botanical({ className = '' }: { className?: string }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg className={className} viewBox="0 0 380 620" fill="none" aria-hidden="true">
      <defs>
        <radialGradient id={`${id}-ivory`} cx="35%" cy="20%" r="85%">
          <stop stopColor="var(--nuy-white)" />
          <stop offset=".42" stopColor="var(--nuy-cream)" />
          <stop offset=".8" stopColor="var(--nuy-gold-light)" />
          <stop offset="1" stopColor="var(--nuy-petal-shadow)" />
        </radialGradient>
        <radialGradient id={`${id}-violet`} cx="35%" cy="20%" r="90%">
          <stop stopColor="var(--nuy-cream)" />
          <stop offset=".35" stopColor="var(--nuy-lavender)" />
          <stop offset=".8" stopColor="var(--nuy-violet-light)" />
          <stop offset="1" stopColor="var(--nuy-violet)" />
        </radialGradient>
        <linearGradient id={`${id}-leaf`}>
          <stop stopColor="var(--nuy-leaf-light)" />
          <stop offset=".5" stopColor="var(--nuy-leaf)" />
          <stop offset="1" stopColor="var(--nuy-leaf-dark)" />
        </linearGradient>
        <radialGradient id={`${id}-gold`}>
          <stop stopColor="var(--nuy-cream)" />
          <stop offset=".5" stopColor="var(--nuy-gold-light)" />
          <stop offset="1" stopColor="var(--nuy-gold)" />
        </radialGradient>
        <path
          id={`${id}-petal`}
          d="M0 0C-17-11-44-37-35-65C-29-84-8-103-3-110C5-91 29-80 33-59C39-31 16-7 0 0Z"
        />
      </defs>
      <path
        d="M180 615C163 488 276 381 209 260C165 176 193 103 156 24M211 422C114 358 106 245 48 171M200 505C295 444 275 362 341 304"
        stroke="var(--nuy-leaf-light)"
        strokeWidth="2"
      />
      {[
        [189, 510, -40],
        [230, 440, 45],
        [174, 351, -55],
        [219, 300, 55],
        [162, 192, -40],
        [178, 120, 50],
        [110, 297, -55],
        [283, 386, 50],
      ].map(([x, y, r], i) => (
        <g key={i} transform={`translate(${x} ${y}) rotate(${r})`}>
          <path d="M0 0C-7-37 12-77 25-87C43-42 33-11 0 0Z" fill={`url(#${id}-leaf)`} />
          <path d="M0 0L25-82" stroke="var(--nuy-gold-light)" strokeOpacity=".4" />
        </g>
      ))}
      {[
        [173, 474, 1.15, 12],
        [268, 362, 0.85, 35],
        [122, 310, 1, -20],
        [192, 222, 0.7, 15],
        [58, 174, 0.6, -15],
        [153, 78, 0.5, 25],
      ].map(([x, y, s, r], i) => (
        <g key={i} transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
          {[0, 60, 120, 180, 240, 300].map((angle) => (
            <g key={angle} transform={`rotate(${angle})`}>
              <use
                href={`#${id}-petal`}
                fill={`url(#${id}-${i % 2 ? 'violet' : 'ivory'})`}
                stroke="var(--nuy-white)"
                strokeOpacity=".3"
                strokeWidth=".8"
              />
              <path
                d="M0-5C-3-27-9-48-18-64M0-5C8-26 18-44 25-63"
                stroke="var(--nuy-white)"
                strokeOpacity=".28"
                strokeWidth=".7"
              />
            </g>
          ))}
          <circle r="12" fill={`url(#${id}-gold)`} />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
            <g key={angle} transform={`rotate(${angle})`}>
              <path d="M0 0L2-23" stroke="var(--nuy-gold)" />
              <ellipse cx="2" cy="-23" rx="2.5" ry="4" fill="var(--nuy-gold-light)" />
            </g>
          ))}
        </g>
      ))}
    </svg>
  );
}
