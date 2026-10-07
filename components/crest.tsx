/** Kingdom crest: a shield with a crown, used as the logo mark. */
export function Crest({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden fill="none">
      <defs>
        <linearGradient id="crest-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f1d08a" />
          <stop offset="1" stopColor="#d9a441" />
        </linearGradient>
        <linearGradient id="crest-r" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ea5a63" />
          <stop offset="1" stopColor="#8f1a22" />
        </linearGradient>
      </defs>
      <path
        d="M16 3 5 7v8.5c0 6.6 4.6 11.6 11 13.5 6.4-1.9 11-6.9 11-13.5V7L16 3Z"
        fill="url(#crest-r)"
        stroke="url(#crest-g)"
        strokeWidth="1.4"
      />
      <path
        d="m10 13 2.6 2.4L16 11l3.4 4.4L22 13l-1.4 7h-9.2L10 13Z"
        fill="url(#crest-g)"
      />
      <rect x="11.4" y="21" width="9.2" height="1.6" rx=".8" fill="url(#crest-g)" />
    </svg>
  );
}
