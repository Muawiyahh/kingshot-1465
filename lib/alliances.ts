/** The alliances of Kingdom 1465. Each gets a banner that doubles as members' profile picture. */

/** Every banner carries a weapon, drawn lying horizontally above the alliance tag. */
export type Weapon = "sword" | "axe" | "mace" | "bow" | "spear" | "scimitar" | "trident" | "none";

export type Alliance = {
  tag: string;
  /** Banner cloth colour. */
  field: string;
  /** Pole, border, weapon and lettering colour. */
  trim: string;
  weapon: Weapon;
};

export const ALLIANCES: Alliance[] = [
  { tag: "GGG", field: "#8f1d26", trim: "#e9c46a", weapon: "sword" },
  { tag: "GBC", field: "#1d3a7a", trim: "#dfe6ee", weapon: "axe" },
  { tag: "KNG", field: "#1c1a1f", trim: "#d9a441", weapon: "mace" },
  { tag: "ERA", field: "#0f5c47", trim: "#e9c46a", weapon: "bow" },
  { tag: "ALT", field: "#4a2a7a", trim: "#dfe6ee", weapon: "spear" },
  { tag: "KOR", field: "#a34112", trim: "#f6d58e", weapon: "scimitar" },
  { tag: "ESN", field: "#2f3e52", trim: "#cfe3f5", weapon: "trident" },
];

export const ALLIANCE_TAGS = ALLIANCES.map((a) => a.tag) as [string, ...string[]];

/** Neutral banner for players without (or outside) the listed alliances. */
export const NO_ALLIANCE: Alliance = { tag: "", field: "#2a2224", trim: "#9a8e90", weapon: "none" };

export function getAlliance(tag: string | null | undefined): Alliance {
  if (!tag) return NO_ALLIANCE;
  return ALLIANCES.find((a) => a.tag === tag.toUpperCase()) ?? { ...NO_ALLIANCE, tag: tag.toUpperCase() };
}
