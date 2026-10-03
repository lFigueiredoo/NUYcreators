export function Floral({ className = '' }: { className?: string }) {
  const gradientId = `petal-${className.replace(/\s/g, '-')}`;
  return (
    <svg className={className} viewBox="0 0 300 460" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#f8e9d4" />
          <stop offset=".5" stopColor="#c6b0df" />
          <stop offset="1" stopColor="#79649b" />
        </linearGradient>
      </defs>
      <path
        d="M148 450C115 325 188 220 133 83M155 341C188 318 229 318 239 270M145 230C106 203 75 204 47 145"
        stroke="#a39c75"
        strokeWidth="2"
      />
      <path
        d="M149 355C184 280 220 332 149 355M142 256C82 273 94 213 142 256M143 172C185 137 198 182 143 172"
        fill="#75846b"
      />
      {[
        [132, 100, 1],
        [64, 173, 0.65],
        [211, 288, 0.8],
      ].map(([x, y, s], i) => (
        <g key={i} transform={`translate(${x} ${y}) scale(${s})`}>
          {[0, 72, 144, 216, 288].map((angle) => (
            <ellipse
              key={angle}
              cx="0"
              cy="-26"
              rx="19"
              ry="35"
              fill={`url(#${gradientId})`}
              transform={`rotate(${angle})`}
            />
          ))}
          <circle r="8" fill="#e0ba74" />
          <circle r="3" fill="#f7eddb" />
        </g>
      ))}
    </svg>
  );
}
