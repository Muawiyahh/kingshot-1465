import clsx from "clsx";
import { getAlliance, type Alliance, type Charge } from "@/lib/alliances";

// 8-pointed star around (12,12): alternating outer/inner radius.
const STAR = Array.from({ length: 16 }, (_, i) => {
  const r = i % 2 === 0 ? 10.5 : 4.4;
  const a = (Math.PI / 8) * i - Math.PI / 2;
  return `${(12 + r * Math.cos(a)).toFixed(2)},${(12 + r * Math.sin(a)).toFixed(2)}`;
}).join(" ");

/** Heraldic emblem drawn in a 24×24 box. */
function ChargeArt({ charge, trim, field }: { charge: Charge; trim: string; field: string }) {
  switch (charge) {
    case "crown":
      return (
        <g fill={trim}>
          <path d="M3 17.5 4.8 7.5 9.4 11.8 12 5.5l2.6 6.3 4.6-4.3L21 17.5Z" />
          <rect x="3" y="18.8" width="18" height="2.4" rx="1" />
          <circle cx="4.8" cy="6.3" r="1.3" />
          <circle cx="12" cy="4.3" r="1.3" />
          <circle cx="19.2" cy="6.3" r="1.3" />
        </g>
      );
    case "swords":
      return (
        <g stroke={trim} strokeLinecap="round" fill="none">
          <path d="M4.5 4.5 16.5 16.5M19.5 4.5 7.5 16.5" strokeWidth="2.2" />
          <path d="M13.8 18.6 18.6 13.8M5.4 13.8l4.8 4.8" strokeWidth="2.2" />
          <path d="M17.6 17.6 20 20M6.4 17.6 4 20" strokeWidth="2.6" />
        </g>
      );
    case "tower":
      return (
        <g>
          <path
            fill={trim}
            d="M5 21.5V9h2V5.5h2.6V9h1.2V5.5h2.4V9h1.2V5.5H17V9h2v12.5Z"
          />
          <path fill={field} d="M10.2 21.5v-3.8a1.8 1.8 0 0 1 3.6 0v3.8Z" />
          <rect x="11.1" y="11.5" width="1.8" height="3" rx=".9" fill={field} />
        </g>
      );
    case "star":
      return (
        <g>
          <polygon points={STAR} fill={trim} />
          <circle cx="12" cy="12" r="2.2" fill={field} />
        </g>
      );
    case "mountain":
      return (
        <g>
          <path fill={trim} d="M1.5 20.5 9 7.5l4.2 7.1L16 10l6.5 10.5Z" />
          <path fill={field} opacity=".55" d="M9 7.5 11.1 11 9.9 10.4 8.7 11.6 7.3 10.6Z" />
        </g>
      );
    case "flame":
      return (
        <g>
          <path
            fill={trim}
            d="M12 1.8c1 4.2 6.5 6.2 6.5 12.4a6.5 6.5 0 0 1-13 0c0-3.9 3-5.2 3.2-8.6 1.6 1.4 2.3 3.2 2.3 4.6 1.6-2.2 1.7-5.3 1-8.4Z"
          />
          <path fill={field} d="M12 12.6c1 1.9 3.1 2.6 3.1 4.9a3.1 3.1 0 0 1-6.2 0c0-1.8 1.6-2.8 3.1-4.9Z" />
        </g>
      );
    case "bolt":
      return <path fill={trim} d="M13.6 1.5 4.8 13.6h6.4l-1.4 8.9 9.4-12.9h-6.5Z" />;
    case "none":
      return <circle cx="12" cy="12" r="3" fill={trim} opacity=".6" />;
  }
}

function BannerArt({ alliance, showTag }: { alliance: Alliance; showTag: boolean }) {
  const { field, trim, charge, tag } = alliance;
  return (
    <>
      {/* Cloth */}
      <path d="M12 11h76v93l-38 28-38-28Z" fill={field} />
      {/* Fold shading: darker left, lighter right (each strip follows the pointed hem). */}
      <path d="M12 11h17v105.5L12 104Z" fill="#000" opacity=".22" />
      <path d="M29 11h9v112.4l-9-6.9Z" fill="#000" opacity=".08" />
      <path d="M71 11h17v93l-17 12.5Z" fill="#fff" opacity=".07" />
      {/* Hem under the pole */}
      <rect x="12" y="11" width="76" height="6" fill="#000" opacity=".25" />
      {/* Inner border */}
      <path d="M18.5 20.5h63v80.5L50 124.5 18.5 101Z" fill="none" stroke={trim} strokeWidth="1.6" opacity=".75" />
      {/* Emblem */}
      <g transform={showTag ? "translate(31 33) scale(1.6)" : "translate(28 40) scale(1.85)"}>
        <ChargeArt charge={charge} trim={trim} field={field} />
      </g>
      {showTag && tag && (
        <text
          x="50"
          y="97"
          textAnchor="middle"
          fill={trim}
          fontFamily="var(--font-display), serif"
          fontSize="17"
          fontWeight="700"
          letterSpacing="2"
        >
          {tag}
        </text>
      )}
      {/* Pole with finials */}
      <rect x="4" y="6" width="92" height="5" rx="2.5" fill={trim} />
      <circle cx="4" cy="8.5" r="4" fill={trim} />
      <circle cx="96" cy="8.5" r="4" fill={trim} />
      <rect x="4" y="6" width="92" height="1.6" rx=".8" fill="#fff" opacity=".35" />
    </>
  );
}

/** Full hanging banner for an alliance tag. */
export function AllianceBanner({
  tag,
  className,
  showTag = true,
  title,
}: {
  tag: string | null | undefined;
  className?: string;
  showTag?: boolean;
  title?: string;
}) {
  const alliance = getAlliance(tag);
  return (
    <svg
      viewBox="0 0 100 136"
      className={clsx("drop-shadow-[0_10px_18px_rgba(0,0,0,0.45)]", className)}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <BannerArt alliance={alliance} showTag={showTag} />
    </svg>
  );
}

/**
 * Round profile picture: the member's alliance banner on a disc of the alliance colour.
 * Tags are only drawn at 64px and up, where they stay legible.
 */
export function AllianceAvatar({
  tag,
  size = 40,
  className,
}: {
  tag: string | null | undefined;
  size?: number;
  className?: string;
}) {
  const alliance = getAlliance(tag);
  const showTag = size >= 64;
  return (
    <span
      className={clsx("relative inline-flex shrink-0 items-end justify-center overflow-hidden rounded-full", className)}
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle at 50% 30%, ${alliance.field} 0%, #0d0a0b 85%)`,
        boxShadow: `inset 0 0 0 1px ${alliance.trim}55`,
      }}
      aria-hidden
    >
      <svg viewBox="0 0 100 136" style={{ width: "78%", marginBottom: "-18%" }}>
        <BannerArt alliance={alliance} showTag={showTag} />
      </svg>
    </span>
  );
}
