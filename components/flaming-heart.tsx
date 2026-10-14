/** Flame tongues along the heart's right shoulder and side: anchor, lean (degrees), half-width, height. */
const FLAMES = [
  { x: 12.5, y: 10, lean: 16, w: 2.6, h: 7.5, dur: 0.9, delay: -0.2 },
  { x: 16, y: 10.5, lean: 36, w: 3.9, h: 12, dur: 1.1, delay: -0.6 },
  { x: 17.6, y: 14, lean: 58, w: 3.6, h: 10.5, dur: 0.95, delay: -0.35 },
  { x: 16.8, y: 18.2, lean: 76, w: 3, h: 8, dur: 0.85, delay: -0.75 },
  { x: 14, y: 21.6, lean: 86, w: 2.4, h: 5.5, dur: 0.8, delay: -0.45 },
];

/** A tongue of fire pointing up from (0,0), with a slight curl at the tip. */
function tongue(w: number, h: number) {
  const r = (n: number) => +n.toFixed(2);
  return (
    `M${-w} 0C${-w} ${r(-h * 0.5)} ${r(-w * 0.25)} ${r(-h * 0.62)} ${r(w * 0.12)} ${-h}` +
    `C${r(w * 0.35)} ${r(-h * 0.6)} ${w} ${r(-h * 0.45)} ${w} 0C${w} ${r(w * 0.3)} ${-w} ${r(w * 0.3)} ${-w} 0Z`
  );
}

/**
 * A small crimson heart burning along one side, sized to sit inside a line of text. The flicker lives
 * in globals.css; width and height are set here so it stays text-sized even before the stylesheet loads.
 */
export function FlamingHeart({ label, className = "" }: { label: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 29 27"
      width="1.45em"
      height="1.35em"
      role="img"
      aria-label={label}
      overflow="visible"
      className={`flaming-heart -mt-[0.3em] inline-block align-[-0.16em] ${className}`}
    >
      <defs>
        <linearGradient id="fh-outer" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#d4202a" />
          <stop offset="0.45" stopColor="#ff5a1f" />
          <stop offset="1" stopColor="#ffa040" stopOpacity="0.55" />
        </linearGradient>
        <linearGradient id="fh-inner" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#ff8a1f" />
          <stop offset="0.6" stopColor="#ffc94d" />
          <stop offset="1" stopColor="#fff3c4" />
        </linearGradient>
        <linearGradient id="fh-heart" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f4525c" />
          <stop offset="0.55" stopColor="#d02e3a" />
          <stop offset="1" stopColor="#8a1520" />
        </linearGradient>
      </defs>
      {FLAMES.map((f, i) => (
        <g key={i} transform={`translate(${f.x} ${f.y}) rotate(${f.lean})`}>
          <g className="flame" style={{ animationDuration: `${f.dur}s`, animationDelay: `${f.delay}s` }}>
            <path fill="url(#fh-outer)" d={tongue(f.w, f.h)} />
            <path fill="url(#fh-inner)" d={tongue(f.w, f.h)} transform="scale(0.55 0.7)" />
          </g>
        </g>
      ))}
      {/* A thin ring in the page colour keeps the heart's outline crisp against the flames. */}
      <path
        fill="url(#fh-heart)"
        stroke="var(--bg)"
        strokeWidth="0.8"
        paintOrder="stroke"
        transform="translate(-1.5 5)"
        d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
      />
      <ellipse cx="5" cy="13.2" rx="2" ry="1.15" fill="#fff" opacity="0.35" transform="rotate(-35 5 13.2)" />
    </svg>
  );
}
