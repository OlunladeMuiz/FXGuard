# Modern Frontend Trends — 2024–2025

## CSS That's Now Widely Supported and Should Be Standard

### Container Queries
Finally safe to use everywhere. Replaces media queries for component-level responsiveness.
```css
.card-container {
  container-type: inline-size;
  container-name: card;
}
@container card (min-width: 400px) {
  .card { grid-template-columns: 1fr 2fr; }
}
@container card (max-width: 300px) {
  .card-meta { display: none; }
}
```

### CSS Subgrid
For aligning nested elements to the parent grid. Eliminates the hackery needed to align card internals.
```css
.grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
.card {
  display: grid;
  grid-row: span 3;
  grid-template-rows: subgrid; /* inherits parent rows */
}
/* Now all card sections (image, title, body) align across cards */
```

### CSS :has() — The Parent Selector
```css
/* Style a form when it contains a required input */
form:has(input:required) { border: 1px solid var(--color-warning); }

/* Style nav when drawer is open */
nav:has(.drawer[open]) { z-index: 200; }

/* Card that adapts when it contains an image */
.card:has(img) { grid-template-rows: auto 1fr; }
```

### CSS `@layer`
Explicit cascade control. No more specificity wars.
```css
@layer reset, tokens, base, components, utilities;
/* Anything in 'utilities' always wins over 'components' regardless of specificity */
@layer utilities {
  .hidden { display: none !important; }
}
```

### `interpolate-size: allow-keywords`
Finally animates `height: auto` natively in CSS.
```css
:root { interpolate-size: allow-keywords; }
.accordion-content {
  height: 0;
  overflow: hidden;
  transition: height 0.3s var(--ease-out);
}
.accordion-content[open] { height: auto; } /* YES! This now animates */
```

### `@starting-style`
Entry animations without JavaScript.
```css
dialog {
  opacity: 1;
  transform: scale(1);
  transition: opacity 0.2s, transform 0.3s var(--ease-spring);
}
@starting-style {
  dialog { opacity: 0; transform: scale(0.95); }
}
```

### `light-dark()` function
```css
:root { color-scheme: light dark; }
.element {
  background: light-dark(white, oklch(10% 0.02 220));
  color: light-dark(oklch(20% 0.05 220), oklch(95% 0.01 220));
}
```

### CSS Nesting (native, no preprocessor)
```css
.button {
  background: var(--accent);
  
  &:hover { background: oklch(from var(--accent) calc(l + 0.05) c h); }
  &:active { transform: scale(0.98); }
  &.destructive { background: var(--color-error); }
  
  .icon { width: 1em; vertical-align: middle; }
}
```

### OKLCH Relative Color Syntax
Derive variants without JS:
```css
:root { --brand: oklch(55% 0.18 245); }
.lighter { color: oklch(from var(--brand) calc(l + 0.15) c h); }
.desaturated { color: oklch(from var(--brand) l calc(c * 0.5) h); }
.complementary { color: oklch(from var(--brand) l c calc(h + 180)); }
```

---

## Design Pattern Trends (2024–2025)

### Bento Grid Layouts
Popularized by Apple WWDC 2023 keynote. Cards of varied sizes arranged in a grid.
- Not all cards the same height — vary dramatically (2x, 3x cell spans)
- Each card focuses on ONE thing: a metric, a feature, a screenshot
- Rich media inside cells: animated demos, videos, live components
- Works well for: SaaS feature sections, portfolio pieces, dashboard overviews

### Floating Islands UI
- Elements appear to float on the page with gap between them and the viewport edge
- Frosted glass + soft shadows for depth
- Rounded corners (16–24px, or pill shapes)
- Used heavily in: productivity apps, dashboards, mobile apps brought to web

### Texture Comeback
After years of flat design, tactile textures are back — used *intentionally*:
- Grain/noise overlays (`filter: url(#noise)` or CSS noise patterns)
- Paper textures for editorial/warm brands
- Brushed metal for premium/luxury
- Linen/canvas for organic brands

### Glassmorphism (Refined)
Not the 2021 version with excessive blur and neon gradients.
2024-2025 glassmorphism is:
- Subtle backdrop-filter blur (12–20px, not 40px)
- Very subtle border (1px, low opacity)
- Used sparingly — not every element
- Works in context: floating navbars, modals, tooltips

### Variable Fonts for Expression
Animating font-weight, width, slant for:
- Hover effects on headings
- Loading animations
- Emphasis during typed text
- Responsive typography (compressed on mobile, expanded on desktop)

### Dark Mode as Default
Dev tools, dashboards, fintech, creative tools — dark mode is now the primary design direction, not an option.
Light mode is for: editorial, consumer apps, e-commerce, healthcare.

### Monochromatic Palettes with One Pop Color
Single-hue grey/slate scale + one vivid accent. Feels premium, focused.
Examples: Linear (dark + purple), Vercel (dark + white), Raycast (dark + orange).

### AI-Native UI Patterns
New patterns born from LLM interfaces:
- **Streaming text** — words appear one at a time with a cursor
- **Thinking indicators** — animated dots or morphing shapes
- **Diff views** — show before/after of AI edits
- **Suggestion chips** — quick-action buttons below AI responses
- **Confidence indicators** — visual signals about uncertainty
- **Citation cards** — inline source attribution with preview

---

## Component Library Trends

### Radix UI Primitives + Custom Styling
The modern pattern: use unstyled, accessible primitives + your own styles.
- Radix UI for: Dialog, Dropdown, Select, Tabs, Accordion, Popover, Tooltip
- No default styles — you own the visual design 100%
- All accessibility baked in (ARIA, keyboard nav, focus management)
- Works with Tailwind, CSS Modules, CSS-in-JS, styled-components

### shadcn/ui (as a starting point ONLY)
- Copy-paste components you own — not a dependency
- Built on Radix primitives
- MUST be customized — the default slate theme is AI slop territory
- Customize: change CSS vars, swap fonts, override border-radius, redesign colors

### Aceternity UI Patterns
Components with "wow" built in:
- Spotlight effect (radial gradient follows cursor)
- Beam effects (animated gradient lines)
- Card hover glow
- Floating particles
- Background grid with gradient mask

### Magic UI Patterns
Animation-forward components:
- Marquee / infinite scroll ticker
- Animated number counters
- Shimmer buttons
- Confetti bursts on action
- Ripple effects

### 21st.dev Style
Ultra-minimal, functional-first with micro-details:
- Every component has a clear data model
- Typography-forward (no decoration)
- Monochrome + single accent
- Dense information without feeling cluttered

---

## Performance Patterns (2024–2025)

### View Transitions API
Native page transitions between routes. No library needed.
Supported in Chrome + Safari. Use progressive enhancement.

### Partial Hydration / Islands Architecture
Only hydrate interactive components, not the whole page.
Frameworks: Astro (`.astro` + React/Vue components), Qwik.

### React Server Components
Move data fetching to server, only ship interactive code to client.
Result: Dramatically smaller JS bundles.

### CSS `content-visibility`
Lazy-render off-screen content:
```css
.section { content-visibility: auto; contain-intrinsic-size: 0 500px; }
```

### Font Subsetting
Only ship characters you use. A subset of a variable font can be <20KB.
```html
<link rel="preload" href="font.woff2" as="font" type="font/woff2" crossorigin>
```

### `fetchpriority` on images
```html
<img src="hero.jpg" fetchpriority="high" alt="...">
<img src="card.jpg" fetchpriority="low" loading="lazy" alt="...">
```

### CSS Anchor Positioning (Chrome 125+, Safari 18.2+)
Position tooltips, dropdowns, and popovers relative to a trigger natively — no JS positioning libraries.
See `frameworks-2025.md` for full patterns.

### Native Popover API (Baseline 2024)
Zero-JS popovers with `popover` attribute, `popovertarget`, `::backdrop`. Animatable with `@starting-style`.

### `transition-behavior: allow-discrete`
Animate `display: none → block` and other discrete properties. The missing piece for pure-CSS show/hide animations.

### CSS `@scope`
Scoped styles per component without BEM, CSS Modules, or CSS-in-JS:
```css
@scope (.card) { h2 { font-size: 1.25rem; } }
```

### `text-box: trim-both cap alphabetic`
Removes invisible space above cap-height and below baseline. Fixes vertical centering in buttons forever.

### `field-sizing: content`
Auto-resizing textareas. No JS. Just CSS.

### `linear()` easing
Spring-approximate easing in pure CSS. Generate at `linear-easing.jakearchibald.com`.

### Speculation Rules API
Prerender entire pages before user clicks — navigation feels instant.
```html
<script type="speculationrules">
{ "prerender": [{ "where": { "href_matches": "/app/*" } }] }
</script>
```

---

## The 2025–2026 Tech Stack

> Full stack with installation, config, and code patterns is in `frameworks-2025.md`.

```
Next.js 15 + React 19 + TypeScript 5.5+
Tailwind CSS v4 (CSS-first, @theme, no config.js)
Radix UI primitives + shadcn/ui (heavily customized)
Motion v11 (motion/react) + GSAP 3 + Lenis
TanStack Query v5 + Zustand
React Hook Form v7 + Zod v3
Biome (replaces ESLint + Prettier)
pnpm + Vite 5
Playwright + Vitest
```

---

## Inspiration Bookmarks

### Sites to Study
- **linear.app** — precision dark UI, micro-interactions perfected
- **vercel.com** — aurora gradients, bento grid, glassmorphism done right  
- **stripe.com** — interactive 3D, scroll-driven animation, gradient richness
- **resend.com** — typography-forward, minimal, premium feel
- **liveblocks.io** — product visualizations, collaboration UI patterns
- **basement.studio** — maximalist, texture-heavy, Y2K-modern fusion
- **cosmos.so** — soft dark, card-based, visual richness
- **arc.net** — translucent, playful, personality-driven
- **raycast.com** — dark precision, speed-first, developer aesthetic
- **craft.do** — warm, organic, editorial, light luxury

### Awards / Showcase Sites
- **awwwards.com** — The benchmark for web design excellence
- **csswinner.com** — CSS-specific recognition
- **siteinspire.com** — Curated high-quality sites
- **godly.website** — Animation-forward collection
- **land-book.com** — Landing page inspiration
- **pageflows.com** — User flow patterns for SaaS

### Component Inspiration
- **ui.aceternity.com** — Animated React components
- **magicui.design** — Animation-forward component library
- **21st.dev** — Community-built premium components
- **uiverse.io** — CSS-only creative components
- **animata.design** — Micro-interaction patterns
