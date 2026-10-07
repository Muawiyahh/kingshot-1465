import clsx from "clsx";
import { getAlliance, type Alliance, type Weapon } from "@/lib/alliances";

/** Weapons are drawn lying horizontally in a 64×20 box centred on (0,0), tip pointing right. */
function WeaponShape({ weapon, trim, field }: { weapon: Weapon; trim: string; field: string }) {
  switch (weapon) {
    case "sword":
      return (
        <g>
          <path fill={trim} d="M-13 -2.5H23L32 0 23 2.5H-13Z" />
          <path d="M-12 0H22" stroke={field} strokeWidth=".8" opacity=".5" />
          <rect x="-17.5" y="-8.5" width="4.5" height="17" rx="2.2" fill={trim} />
          <rect x="-27" y="-1.7" width="10" height="3.4" rx="1.2" fill={trim} opacity=".85" />
          <path d="M-25 -1.7v3.4M-22 -1.7v3.4M-19.5 -1.7v3.4" stroke={field} strokeWidth=".7" opacity=".5" />
          <circle cx="-29.5" cy="0" r="2.9" fill={trim} />
        </g>
      );
    case "axe":
      return (
        <g fill={trim}>
          <rect x="-31" y="-1.4" width="58" height="2.8" rx="1.4" opacity=".92" />
          <circle cx="-31" cy="0" r="2.3" />
          <path d="M9 -2C9 -6 11 -9.5 14 -10 20 -10.5 25 -8 27.5 -5.5 23 -4 22 -2 22 0 22 2 23 4 27.5 5.5 25 8 20 10.5 14 10 11 9.5 9 6 9 2Z" />
          <path d="M9 -2V2L3.5 0Z" />
          <path d="M13 -6.2Q20 -5.4 24.4 -4" stroke={field} strokeWidth=".8" fill="none" opacity=".5" />
        </g>
      );
    case "mace":
      return (
        <g fill={trim}>
          <rect x="-31" y="-1.4" width="46" height="2.8" rx="1.4" opacity=".92" />
          <circle cx="-31" cy="0" r="2.3" />
          <rect x="12.5" y="-3.4" width="3.2" height="6.8" rx="1.2" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
            <polygon key={a} points="26.5,-2 32,0 26.5,2" transform={`rotate(${a} 21 0)`} />
          ))}
          <circle cx="21" cy="0" r="6.2" />
          <circle cx="21" cy="0" r="2.6" fill={field} stroke="none" opacity=".55" />
        </g>
      );
    case "bow":
      return (
        <g fill={trim}>
          <path d="M-3 -10Q11 0 -3 10" stroke={trim} strokeWidth="2.4" strokeLinecap="round" fill="none" />
          <path d="M-3 -10V10" stroke={trim} strokeWidth=".8" opacity=".7" />
          <rect x="-22" y="-.9" width="50" height="1.8" rx=".9" />
          <polygon points="27,-3 34,0 27,3" />
          <path d="M-22 0 -17 -3.8H-14L-17 0 -14 3.8H-17Z" opacity=".85" />
          <rect x="3" y="-2.8" width="3" height="5.6" rx="1.2" fill={field} stroke="none" opacity=".5" />
        </g>
      );
    case "spear":
      return (
        <g fill={trim}>
          <rect x="-32" y="-1.2" width="52" height="2.4" rx="1.2" opacity=".92" />
          <path d="M-32 -2.3V2.3L-35.5 0Z" />
          <rect x="16.8" y="-2.8" width="2.8" height="5.6" rx="1" />
          <path d="M19 0 23.5 -4.8 33.5 0 23.5 4.8Z" />
          <path d="M21.5 0H31" stroke={field} strokeWidth=".8" opacity=".5" />
          <path d="M15 0Q12.5 6.5 7 7.5 10.5 3.5 10 0Z" opacity=".75" />
        </g>
      );
    case "scimitar":
      return (
        <g fill={trim} transform="translate(0 3)">
          <path d="M-11 -1.2Q12 -3.5 31 -10 26 5 -11 3.4Z" />
          <path d="M-8 .4Q12 -.3 27 -7.2" stroke={field} strokeWidth=".8" fill="none" opacity=".45" />
          <rect x="-14.5" y="-5.5" width="3.6" height="12.5" rx="1.8" />
          <rect x="-25.5" y="-1.2" width="11" height="3.4" rx="1.2" opacity=".85" />
          <circle cx="-27.5" cy=".5" r="2.7" />
        </g>
      );
    case "trident":
      return (
        <g fill={trim}>
          <rect x="-32" y="-1.2" width="48" height="2.4" rx="1.2" opacity=".92" />
          <circle cx="-32" cy="0" r="2.2" />
          <path d="M23 -8H18Q13.5 -8 13.5 0T18 8H23" stroke={trim} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <path d="M14 0H28" stroke={trim} strokeWidth="2.2" />
          <polygon points="27,-3.2 34,0 27,3.2" />
          <polygon points="22,-5.6 29,-8 22,-10.4" />
          <polygon points="22,5.6 29,8 22,10.4" />
        </g>
      );
    case "none":
      return <circle cx="0" cy="0" r="3" fill={trim} opacity=".6" />;
  }
}

/** The weapon with an outline of its own colour, which thickens the thin shafts so they stay readable. */
function WeaponArt({ bold, ...props }: { weapon: Weapon; trim: string; field: string; bold: number }) {
  return (
    <g stroke={props.trim} strokeWidth={bold} strokeLinejoin="round" strokeLinecap="round">
      <WeaponShape {...props} />
    </g>
  );
}

function BannerArt({ alliance, showTag }: { alliance: Alliance; showTag: boolean }) {
  const { field, trim, weapon, tag } = alliance;
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
      {showTag && <path d="M18.5 20.5h63v80.5L50 124.5 18.5 101Z" fill="none" stroke={trim} strokeWidth="1.6" opacity=".75" />}
      {/* Weapon lying across the cloth, above the tag; centred when there is no room for a tag. */}
      <g transform={showTag ? "translate(50 54) scale(.92)" : "translate(50 62) scale(1.14)"}>
        <WeaponArt weapon={weapon} trim={trim} field={field} bold={showTag ? 1.3 : 2.2} />
      </g>
      {showTag && tag && (
        <>
          <path d="M33 76.5h34" stroke={trim} strokeWidth="1" strokeLinecap="round" opacity=".5" />
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
        </>
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
