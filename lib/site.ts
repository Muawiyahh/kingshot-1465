/**
 * Kingdom facts that don't change with language. Translatable homepage copy
 * (motto, intro, pillars) lives in lib/i18n/messages/*.ts.
 */
export const site = {
  kingdom: "1465",
  name: "Kingdom 1465",
  /** In-game name credited in the footer. */
  creator: "ShowMeYourToes",
  discordUrl: "", // e.g. "https://discord.gg/xxxx" — leave empty to hide the link
  // Transfer contacts, kingdom facts, event times and the Hall of Fame are set by leaders in
  // Admin → Homepage, not here.
} as const;
