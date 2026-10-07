/**
 * Kingdom facts that don't change with language. Translatable homepage copy
 * (motto, intro, pillars) lives in lib/i18n/messages/*.ts.
 */
export const site = {
  kingdom: "1465",
  name: "Kingdom 1465",
  discordUrl: "", // e.g. "https://discord.gg/xxxx" — leave empty to hide the link
  // In-game contacts for migration and questions. Replace with real leaders.
  // `role` is "king" or "coordinator" and is shown translated.
  council: [
    { name: "King of 1465", role: "king", gameId: "—" },
    { name: "R5 · Alliance one", role: "coordinator", gameId: "—" },
    { name: "R5 · Alliance two", role: "coordinator", gameId: "—" },
  ],
} as const;
