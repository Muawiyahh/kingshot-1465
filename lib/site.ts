/**
 * Kingdom content shown on the homepage. Edit freely — everything here is
 * placeholder copy until the kingdom's leaders supply the real details.
 */
export const site = {
  kingdom: "1465",
  name: "Kingdom 1465",
  motto: "Forged in fire. Bound by oath.",
  intro:
    "One kingdom, many banners. 1465 is a home for players across every time zone — organised for KvK, generous with help, and relentless when it counts.",
  /** Path to the Amadeus artwork in /public, e.g. "/amadeus.webp". Empty shows a placeholder silhouette. */
  heroImage: "" as string,
  discordUrl: "", // e.g. "https://discord.gg/xxxx" — leave empty to hide the button
  stats: [
    { label: "Server", value: "#1465" },
    { label: "Alliances", value: "—" },
    { label: "KvK seasons", value: "—" },
    { label: "Time zones", value: "24/7" },
  ],
  pillars: [
    {
      title: "War-ready",
      body: "Every KvK is planned in the open: castle positions, buff windows and rally leads are published before the first march.",
    },
    {
      title: "Fair by design",
      body: "Positions are applied for, reviewed by leaders and assigned on merit and availability — not on who shouts loudest.",
    },
    {
      title: "Built for everyone",
      body: "New governor or day-one whale, there's a role for you. Ask in alliance chat and someone will answer.",
    },
  ],
  // In-game contacts for migration and questions. Replace with real leaders.
  council: [
    { name: "King of 1465", role: "King", gameId: "—" },
    { name: "R5 · Alliance one", role: "Coordinator", gameId: "—" },
    { name: "R5 · Alliance two", role: "Coordinator", gameId: "—" },
  ],
} as const;
