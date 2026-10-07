# Design System Master File — Kingdom 1465

> **LOGIC:** When building a specific page, first check `design-system/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file. If not, follow the rules below.
> Tokens live in `app/globals.css`; components in `components/ui.tsx`. Never hard-code hex values in components.

**Theme:** Imperial Crimson (dark-first) · **Inspiration:** muawiyahalthaf.com (Apple-style dark, rounded glass cards, macOS window frames)
**Generated with:** ui-ux-pro-max (`Gaming` · Modern Dark) then art-directed · **Dials:** Variance 7 · Motion 7 · Density 5

---

## Colour

| Role | Hex | Token | Notes |
|------|-----|-------|-------|
| Background | `#0D0A0B` | `--bg` / `bg-bg` | plum-black, never pure #000 |
| Elevated | `#140F11` | `--bg-elevated` | inputs, header, strips |
| Card | `#1A1416` | `--card` | `rounded-3xl`, hairline inset border |
| Card hover | `#221A1D` | `--card-hover` | |
| Foreground | `#F5EEEE` | `--fg` | 17.2:1 on bg |
| Muted | `#9A8E90` | `--muted` | 5.8:1 on card |
| Primary (war red) | `#D63A44` | `--primary` | white text 4.6:1 (AA). Hover `#C42F39` |
| Gold trim | `#D9A441` | `--gold` | eyebrows, focus ring, tags. Soft `#F1D08A` |
| Success / live | `#4ADE80` | `--success` | live dots only, never colour-alone |
| Warning | `#FBBF24` | `--warning` | pending states |
| Danger | `#F87171` | `--danger` | errors, destructive |
| Border | `rgba(255,255,255,.08)` | `--border` | strong: `.14` |
| Glow | `rgba(224,64,74,.30)` | `--glow` | primary button + hero halo |

`#E0404A` (the originally chosen red) is kept for the hero numeral gradient and glows, where it isn't behind text.

## Typography

| Use | Font | Notes |
|-----|------|-------|
| Display / headings / "1465" | **Cinzel** 600–900 | `font-display`; Roman inscriptional caps |
| Body / UI | **Geist** | 16px base (inputs 16px to avoid iOS zoom), line-height 1.5–1.75 |
| Times, IDs, tags, numbers | **Geist Mono** | `tabular-nums` for slot times and counters |

Scale: hero numeral `clamp(5.5rem, 24vw, 15rem)` · H1 `text-3xl/4xl` · H2 `text-3xl/5xl` (home) · body `text-base/lg` · labels `text-xs uppercase tracking-[0.2em]`.

## Shape, depth, spacing

- Radius: cards `rounded-3xl`, frames `rounded-2xl`, inputs `rounded-xl`, buttons/pills `rounded-full`.
- Depth: `inset 0 0 0 1px var(--border)` hairline + `0 25px 50px -12px rgba(0,0,0,.6)` lift. Primary CTA adds the red glow.
- Spacing: Tailwind 4px scale; sections `py-24 sm:py-32`; container `max-w-6xl px-4 sm:px-6 lg:px-8`.
- Touch targets ≥ 44px (`h-11`); slot chips `h-11`.

## Signature elements

- **Hero:** gold-to-crimson gradient numerals, Amadeus portrait in a gold-ringed halo (`site.heroImage`), drifting ember particles, slow ambient light blobs, pointer parallax (mouse only).
- **Window frame:** macOS traffic-light header (`WindowFrame`) for schedule previews.
- **Live:** pulsing green dot + "Now" badge on the current slot; the positions page subscribes to Supabase Realtime.
- **Crest:** shield-and-crown SVG (`components/crest.tsx`) as the logo mark.

## Motion

- Easing `cubic-bezier(0.16, 1, 0.3, 1)` (expo-out) for entrances; 150–300 ms for micro-interactions; press `scale(0.97)`.
- Entrances: fade + 16–40px rise, staggered ~100 ms. Animate transform/opacity only.
- `MotionConfig reducedMotion="user"` + CSS `prefers-reduced-motion` kills embers, drift and transitions.

## Rules

- Lucide icons only, one stroke weight; no emoji as icons.
- Every interactive element: `cursor-pointer`, visible gold focus ring, hover transition.
- Status is never colour-only: badges carry text ("Pending", "Accepted", "Now").
- All KvK times are shown in **UTC** and labelled as such.
- Verify at 375 / 768 / 1024 / 1440px with no horizontal scroll.
