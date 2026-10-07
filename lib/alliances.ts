/** The alliances of Kingdom 1465. Each gets a banner that doubles as members' profile picture. */

export type Charge = "crown" | "swords" | "tower" | "star" | "mountain" | "flame" | "bolt" | "none";

export type Alliance = {
  tag: string;
  /** Banner cloth colour. */
  field: string;
  /** Pole, border, emblem and lettering colour. */
  trim: string;
  charge: Charge;
};

export const ALLIANCES: Alliance[] = [
  { tag: "GGG", field: "#8f1d26", trim: "#e9c46a", charge: "crown" },
  { tag: "GBC", field: "#1d3a7a", trim: "#dfe6ee", charge: "swords" },
  { tag: "KNG", field: "#1c1a1f", trim: "#d9a441", charge: "tower" },
  { tag: "ERA", field: "#0f5c47", trim: "#e9c46a", charge: "star" },
  { tag: "ALT", field: "#4a2a7a", trim: "#dfe6ee", charge: "mountain" },
  { tag: "KOR", field: "#a34112", trim: "#f6d58e", charge: "flame" },
  { tag: "ESN", field: "#2f3e52", trim: "#cfe3f5", charge: "bolt" },
];

export const ALLIANCE_TAGS = ALLIANCES.map((a) => a.tag) as [string, ...string[]];

/** Neutral banner for players without (or outside) the listed alliances. */
export const NO_ALLIANCE: Alliance = { tag: "", field: "#2a2224", trim: "#9a8e90", charge: "none" };

export function getAlliance(tag: string | null | undefined): Alliance {
  if (!tag) return NO_ALLIANCE;
  return ALLIANCES.find((a) => a.tag === tag.toUpperCase()) ?? { ...NO_ALLIANCE, tag: tag.toUpperCase() };
}
