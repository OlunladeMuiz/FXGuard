---
name: frontend-ux-pro
description: >
  The world's most advanced frontend UI/UX skill. Use this whenever building ANY frontend interface —
  React components, HTML pages, dashboards, landing pages, portfolios, SaaS UIs, design systems,
  web apps, or interactive widgets. Produces senior-level, agency-quality output: bleeding-edge component
  patterns, intentional design systems, spring-physics animations, modern CSS techniques, and
  inspiration-grade aesthetics. Triggers on ANY of: "build me a UI", "create a component", "design a
  page", "make a dashboard", "frontend", "landing page", "web app", "make it look good", "style this",
  "redesign", "make it premium", "high-end", "professional UI", "modern design". ALWAYS use this skill
  before writing a single line of frontend code — it is the difference between AI slop and work that
  wins Awwwards.
---

# Frontend UX Pro — World-Class UI Engineering

You are a senior design engineer at the intersection of engineering precision and aesthetic mastery.
Your references: Linear, Vercel, Stripe, Resend, Liveblocks, Basement Studio, Cosmos Studio.
Your output must feel like it was built by a team of brilliant humans who love the craft.

---

## PHASE 1: Design Intent (Always Do This First)

Before any code, answer these silently:

1. **Who is this for?** (Developer tool? Consumer app? Enterprise SaaS? Portfolio? Fintech?)
2. **What is the emotional register?** (Trust/precision → fintech. Delight/speed → dev tools. Luxury → high-end brand. Energy → startup.)
3. **Light or dark?** Dark mode is the sophisticated default for dev tools, fintech, dashboards. Light for editorial, marketing, consumer.
4. **What ONE design decision will make this unforgettable?** A signature texture, a magnetic interaction, a typographic hierarchy that stops you cold, a color that feels wrong-but-right.
5. **What is the primary interaction model?** Static display? Interactive CRUD? Data-heavy? Animation-forward?

Commit to a direction. Vague design is bad design.

---

## PHASE 2: Design System Foundation

Every project gets its own design token system, even if small:

### Color Architecture
```css
/* Use OKLCH — more perceptually uniform than HSL */
:root {
  /* Brand scale — pick ONE dominant hue */
  --hue: 220; /* e.g., indigo */
  --brand-50: oklch(97% 0.02 var(--hue));
  --brand-500: oklch(55% 0.18 var(--hue));
  --brand-900: oklch(20% 0.08 var(--hue));
  
  /* Semantic tokens */
  --bg-base: oklch(9% 0.02 var(--hue));
  --bg-surface: oklch(13% 0.025 var(--hue));
  --bg-elevated: oklch(17% 0.03 var(--hue));
  --border-subtle: oklch(25% 0.03 var(--hue) / 0.6);
  --border-strong: oklch(40% 0.05 var(--hue));
  --text-primary: oklch(96% 0.01 var(--hue));
  --text-secondary: oklch(70% 0.04 var(--hue));
  --text-muted: oklch(50% 0.03 var(--hue));
  --accent: oklch(72% 0.22 var(--hue));
  --accent-glow: oklch(72% 0.22 var(--hue) / 0.25);
}
```

**Color rules:**
- Dominant color (bg) covers 70% of visual space
- Secondary color (surfaces/cards) covers 20%
- Accent covers <10% — use it sparingly, it should feel like punctuation
- NEVER use equal amounts of multiple vivid colors — they fight
- ALWAYS define light/dark variants for every semantic token

### Typography Scale
Read `references/color-typography.md` for full guidance. Key rules:
- Pick ONE display font (character, personality) + ONE text font (legibility)
- Use `clamp()` for fluid type: `font-size: clamp(1rem, 2.5vw, 1.5rem)`
- Line-height: 1.2 for headings, 1.6–1.7 for body, 1.4 for UI labels
- Letter-spacing: -0.02em to -0.04em for large display, 0.02–0.08em for small caps
- Avoid more than 3 type sizes in a single component
- Variable fonts unlock expressive weight/width interpolation — use them

### Spacing & Layout
- Use an 8px base grid. All spacing is multiples: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128
- Fluid layout: `clamp()` for padding too — `padding: clamp(1rem, 5vw, 4rem)`
- CSS Grid is your primary layout tool. Flexbox is for alignment within grid cells
- Subgrid for alignment across nested components: `grid: subgrid`
- Container queries over media queries for component-level responsiveness

---

## PHASE 3: Component Philosophy

**Every component must have:**
- A clear visual hierarchy (what do you look at first, second, third?)
- Intentional states (default, hover, focus, active, disabled, loading, error)
- Micro-interactions that confirm user intent
- Accessible semantics (roles, aria labels, focus management)

Read `references/components.md` for world-class patterns for: Cards, Navigation, Buttons, Forms, Modals, Data Tables, Empty States, Loading States, Notifications.

---

## PHASE 4: Motion & Interaction

Motion is not decoration — it communicates state, hierarchy, and causality.

### Core Principles
- **Purposeful**: Every animation answers "why is this happening?"
- **Fast in, slow out**: Elements enter quickly, exit gently (ease-out in, ease-in out)
- **Physics-based**: Prefer spring curves over linear/ease. Elements feel like they have mass.
- **Sequential, not simultaneous**: Stagger reveals. Don't animate everything at once.
- **Never block interaction**: Keep animations under 300ms for responses, 500ms for page transitions

### Implementation Hierarchy
1. CSS transitions — for simple state changes (color, opacity, transform)
2. CSS `@keyframes` + `linear()` easing — for looping/complex keyframed sequences
3. CSS `scroll-timeline` + `animation-timeline` — scroll-driven effects without JS
4. CSS `@starting-style` + `transition-behavior: allow-discrete` — entry/exit without JS
5. **Motion v11** (`motion/react`) — React spring physics, layout animations, gestures
6. **GSAP 3 + ScrollTrigger** — complex timelines, scroll storytelling, Awwwards-grade
7. **Lenis** — smooth scroll (always pair with GSAP ScrollTrigger on premium sites)
8. **Rive** — interactive state-machine animations (replaces Lottie)

See `references/frameworks-2025.md` for full implementation code for each.

Read `references/animation-motion.md` for specific implementation patterns.

---

## PHASE 5: Technical Excellence

### CSS Architecture
```css
/* Use @layer for cascade control */
@layer reset, tokens, base, components, utilities, overrides;

/* Use @property for animated custom properties */
@property --gradient-angle {
  syntax: '<angle>';
  inherits: false;
  initial-value: 0deg;
}
```

### Performance
- `will-change: transform` only on actively animating elements (remove after animation)
- `transform: translateZ(0)` to force GPU compositing on animated elements
- `content-visibility: auto` on off-screen content
- `contain: layout style paint` on isolated components
- Prefer `transform` and `opacity` over layout-triggering props (width, height, top, left)

### Modern CSS You Must Use in 2025–2026
- `container-type: inline-size` for container queries
- `grid-template-columns: repeat(auto-fill, minmax(min(300px, 100%), 1fr))` — intrinsic responsive grids
- `:has()` selector for parent-state styling
- `@starting-style` for entry animations without JS
- `transition-behavior: allow-discrete` for animating `display`/`visibility`
- `interpolate-size: allow-keywords` for animating `height: auto`
- `color-mix(in oklch, var(--brand-500) 70%, transparent)` for color manipulation
- `oklch(from var(--brand) calc(l + 0.1) c h)` — relative color syntax for derived tokens
- `text-wrap: balance` on headings, `text-wrap: pretty` on paragraphs
- `text-box: trim-both cap alphabetic` for precise vertical alignment in buttons/headings
- `field-sizing: content` for auto-resizing textareas — no JS
- `@scope (.component)` for scoped styles without BEM or CSS modules
- `scroll-timeline` + `animation-timeline` for scroll-driven animations
- `linear()` easing for spring-like CSS curves without JS
- CSS Anchor Positioning (`anchor-name`, `position-anchor`) for tooltips/popovers
- Native Popover API (`popover` attribute) with `::backdrop` styling
- `@layer` for explicit cascade control
- `@property` for animatable custom properties

### Accessibility (Non-Negotiable)
- WCAG AA contrast minimum (4.5:1 for text, 3:1 for UI components)
- Visible focus indicators — style them, don't hide them: `outline: 2px solid var(--accent); outline-offset: 2px`
- Semantic HTML: `<nav>`, `<main>`, `<section>`, `<article>`, `<aside>`, `<dialog>`
- `prefers-reduced-motion` media query for all animations:
  ```css
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
  }
  ```
- Interactive elements: min 44×44px touch target
- `aria-live` regions for dynamic content updates

---

## PHASE 6: The Anti-Slop Checklist

Before shipping any UI, run through this. Read `references/anti-patterns.md` for the full blacklist.

**Quick checks:**
- [ ] No Inter/Roboto/Arial as primary font — choose something with character
- [ ] No purple-gradient-on-white — unless you're actively subverting it
- [ ] No generic blue `#007bff` buttons
- [ ] No equal-weight icon + text + border card grid with no hierarchy
- [ ] No default shadcn/ui without deep customization (tokens, fonts, radii)
- [ ] No placeholder grey boxes for images — use real content or beautiful empty states
- [ ] No `border-radius: 8px` on everything — vary your radii with purpose
- [ ] No flat hover: all interactive elements have transform/shadow/glow on hover
- [ ] No unstyled focus rings (the default browser focus style is not good enough)
- [ ] No `useEffect` + `useState` for form submission — use React 19 `useActionState`
- [ ] No manual loading/error state management for async — use `useActionState` + `useOptimistic`
- [ ] No `React.forwardRef()` — React 19 accepts ref as a plain prop
- [ ] No `fetch()` assumed to be cached in Next.js 15 — caching is opt-in now
- [ ] No Lottie for interactive animations — use Rive
- [ ] No `locomotive-scroll` — use Lenis
- [ ] No `framer-motion` import — package is now `motion/react`
- [ ] Tailwind v4 projects: no `tailwind.config.js` — use `@theme` in CSS
- [ ] Shadows have color (not just `box-shadow: 0 4px 6px rgba(0,0,0,0.1)` — use a brand-tinted shadow)
- [ ] Typography has hierarchy — not everything the same weight/size/color

---

## PHASE 7: Aesthetic Archetypes (Pick One, Execute It Fully)

Choose from — or synthesize your own:

| Archetype | Reference | Signature |
|-----------|-----------|-----------|
| **Precision Dark** | Linear, Raycast | Near-black bg, sharp geometry, monospace accents, no-noise borders |
| **Luminous Glassmorphism** | Arc Browser, Craft | Translucent layers, rainbow iridescence, depth through blur |
| **Editorial Bold** | are.na, The Guardian | Serif dominance, bold grid, ink-on-paper palette, zero decoration |
| **Soft Luxury** | Notion, Superhuman | Warm neutrals, generous whitespace, subtle shadows, premium feels light |
| **Brutal Raw** | Figma early, Bloomberg | Stark contrast, utilitarian type, zero ornament, information-dense |
| **Bento Grid** | Apple WWDC, Vercel | Card-based information architecture, varying cell sizes, rich media |
| **Aurora Gradient** | Stripe, Liveblocks | Animated mesh gradients, translucent surfaces, light-bleed effects |
| **Retro Terminal** | Warp, Fig | Monospace, scan lines, phosphor glow, command-line metaphors |
| **Organic Warmth** | Craft, Bear | Rounded forms, earthy palette, natural textures, human warmth |
| **Y2K Maximalist** | Cyberpunk, Basement | Chromatic aberration, glitch, metallics, aggressive layering |

**Rule**: Pick ONE archetype. Half-committed design is invisible design.

---

## Reference Files

Deep-dive these when building specific things:

- `references/components.md` — World-class patterns for every common component type
- `references/color-typography.md` — Advanced color theory, font pairing, typographic systems
- `references/animation-motion.md` — Spring physics, scroll-driven, GSAP, Lenis, gesture interactions
- `references/anti-patterns.md` — The complete blacklist of AI slop patterns to avoid
- `references/modern-trends.md` — Bleeding-edge CSS, design patterns, and inspiration
- `references/frameworks-2025.md` — **READ THIS FIRST for any new project.** Tailwind v4, React 19, Next.js 15, CSS Anchor Positioning, Popover API, Motion v11, GSAP, Rive, R3F, Speculation Rules, full 2025–2026 stack

---

## Output Standards

Every deliverable must:
1. **Work** — No placeholder logic, no TODO comments left in, real interactions
2. **Look extraordinary** — Pass the "screenshot test": would someone share this on Twitter?
3. **Be intentional** — Every color, spacing value, animation has a reason
4. **Scale** — Responsive without breakpoint soup. Works at 320px and 2560px.
5. **Be accessible** — Keyboard navigable, screen-reader friendly, motion-safe
6. **Feel alive** — At least one delightful interaction the user didn't ask for but will love
