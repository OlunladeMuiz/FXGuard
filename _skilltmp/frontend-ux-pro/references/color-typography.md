# Color & Typography — Advanced Reference

## Color Science

### Why OKLCH Over HSL
OKLCH (Oklab Lightness, Chroma, Hue) is perceptually uniform:
- Equal lightness steps feel equal to the human eye
- You can shift hue without losing perceived brightness
- Works correctly across the full gamut including P3 and Rec2020

```css
/* HSL: this purple and green feel different brightness despite same L value */
hsl(270, 80%, 60%)  /* feels lighter */
hsl(120, 80%, 60%)  /* feels darker */

/* OKLCH: truly equal brightness */
oklch(60% 0.18 270)
oklch(60% 0.18 120)
```

### Building a Palette from One Hue
```css
:root {
  /* Choose a base hue (0-360) */
  --h: 245; /* indigo */

  /* Perceptually balanced scale */
  --scale-50:  oklch(97% 0.01 var(--h));
  --scale-100: oklch(93% 0.03 var(--h));
  --scale-200: oklch(86% 0.06 var(--h));
  --scale-300: oklch(77% 0.10 var(--h));
  --scale-400: oklch(67% 0.15 var(--h));
  --scale-500: oklch(56% 0.18 var(--h)); /* primary */
  --scale-600: oklch(47% 0.16 var(--h));
  --scale-700: oklch(38% 0.12 var(--h));
  --scale-800: oklch(28% 0.08 var(--h));
  --scale-900: oklch(20% 0.05 var(--h));
  --scale-950: oklch(13% 0.03 var(--h));
}
```

### Multi-Color Palette Strategy

**The 60-30-10 Rule for UI:**
- 60% Dominant (background, base surfaces)
- 30% Secondary (cards, sidebars, secondary panels)
- 10% Accent (CTAs, active states, highlights)

**Complementary accent (180° from brand hue):**
```css
--accent-complementary: oklch(70% 0.18 calc(var(--h) + 180));
```

**Triadic accents (120° apart):**
```css
--accent-a: oklch(65% 0.16 calc(var(--h) + 120));
--accent-b: oklch(65% 0.16 calc(var(--h) + 240));
```

**Analogous harmony (±30°):**
```css
--analogous-warm: oklch(60% 0.16 calc(var(--h) - 30));
--analogous-cool: oklch(60% 0.16 calc(var(--h) + 30));
```

### Status Colors (Semantic, not brand-specific)
```css
--color-success: oklch(70% 0.18 142);   /* green */
--color-warning: oklch(78% 0.20 85);    /* amber */
--color-error:   oklch(62% 0.22 25);    /* red */
--color-info:    oklch(68% 0.18 240);   /* blue */

/* With subtle backgrounds for cards/alerts */
--color-success-bg: oklch(70% 0.18 142 / 0.1);
--color-error-bg:   oklch(62% 0.22 25 / 0.1);
```

### Shadows with Color (not grey)
Shadows tinted with the background hue feel premium:
```css
/* Cold blue-shifted shadows for dark UIs */
box-shadow: 0 4px 12px oklch(10% 0.08 220 / 0.6);

/* Warm amber shadows for warm UIs */
box-shadow: 0 4px 12px oklch(15% 0.08 60 / 0.4);

/* Accent glow shadow for highlighted elements */
box-shadow:
  0 2px 8px oklch(0% 0 0 / 0.3),
  0 0 0 1px var(--accent),
  0 4px 24px var(--accent-glow);
```

### Gradient Techniques

**Mesh gradient (multiple radial gradients):**
```css
background:
  radial-gradient(ellipse at 20% 20%, oklch(60% 0.25 280 / 0.4) 0%, transparent 60%),
  radial-gradient(ellipse at 80% 80%, oklch(65% 0.20 340 / 0.3) 0%, transparent 60%),
  radial-gradient(ellipse at 60% 10%, oklch(70% 0.22 200 / 0.25) 0%, transparent 55%),
  var(--bg-base);
```

**Conic gradient (aurora effect):**
```css
@property --aurora-angle {
  syntax: '<angle>';
  inherits: false;
  initial-value: 0deg;
}
.aurora {
  background: conic-gradient(
    from var(--aurora-angle) at 50% 50%,
    oklch(60% 0.25 280),
    oklch(65% 0.22 220),
    oklch(70% 0.20 160),
    oklch(65% 0.22 220),
    oklch(60% 0.25 280)
  );
  animation: aurora-spin 8s linear infinite;
  filter: blur(40px);
  opacity: 0.3;
}
@keyframes aurora-spin {
  to { --aurora-angle: 360deg; }
}
```

**Noise texture overlay (adds organic texture):**
```css
/* SVG noise filter */
.with-noise::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E");
  pointer-events: none;
  opacity: 0.15;
  mix-blend-mode: overlay;
}
```

---

## Typography

### The Font Pairing Framework

**Rule of contrast**: Pair fonts that contrast in classification but harmonize in spirit.
- Serif display + Geometric sans body
- Humanist sans display + Classical serif body
- Slab serif display + Grotesque sans body
- Variable display + Monospace accent

**Never pair**: Two fonts of the same classification (two serifs, two geometric sans)

### Curated Font Pairings (avoid the generic ones)

| Display | Body | Vibe |
|---------|------|------|
| **Playfair Display** | **DM Sans** | Luxury editorial |
| **Cabinet Grotesk** | **Satoshi** | Modern startup |
| **Clash Display** | **General Sans** | Bold agency |
| **Fraunces** | **Plus Jakarta Sans** | Organic premium |
| **Syne** | **Instrument Sans** | Contemporary gallery |
| **Bebas Neue** | **Barlow** | High-impact brutalist |
| **Cormorant Garamond** | **Jost** | Refined luxury |
| **Space Grotesk** | *(only okay if used with high contrast size)* | Dev tool |
| **Unbounded** | **DM Mono** | Retro-futuristic |
| **Neue Montreal** | **Söhne** | Swiss precision |

**How to load Google Fonts without slowing page:**
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,300..900;1,300..900&family=Plus+Jakarta+Sans:wght@300..700&display=swap" rel="stylesheet">
```

### Typographic Scale

**Fluid type with clamp():**
```css
:root {
  /* Scale factor: 1.25 (Major Third) for content-heavy; 1.5 (Perfect Fifth) for display */
  --text-xs:   clamp(0.64rem, 0.6rem + 0.2vw, 0.75rem);
  --text-sm:   clamp(0.8rem, 0.75rem + 0.25vw, 0.875rem);
  --text-base: clamp(1rem, 0.9rem + 0.5vw, 1.125rem);
  --text-lg:   clamp(1.2rem, 1.1rem + 0.5vw, 1.35rem);
  --text-xl:   clamp(1.44rem, 1.3rem + 0.7vw, 1.75rem);
  --text-2xl:  clamp(1.73rem, 1.5rem + 1.1vw, 2.25rem);
  --text-3xl:  clamp(2.07rem, 1.8rem + 1.35vw, 3rem);
  --text-4xl:  clamp(2.49rem, 2.1rem + 2vw, 4rem);
  --text-5xl:  clamp(3rem, 2.5rem + 2.5vw, 5.5rem);
}
```

### Typographic Details That Separate Amateur from Pro

```css
/* Headlines: tighter, heavier */
h1, h2, h3 {
  line-height: 1.1;
  letter-spacing: -0.02em;
  font-feature-settings: 'kern' 1, 'liga' 1, 'calt' 1;
  text-wrap: balance; /* prevent widows */
}

/* Body: comfortable and readable */
p {
  line-height: 1.65;
  letter-spacing: 0;
  text-wrap: pretty; /* avoids orphans */
  max-width: 65ch; /* optimal line length */
}

/* Labels / UI text: slightly loose */
label, .caption {
  font-size: var(--text-sm);
  letter-spacing: 0.01em;
  font-weight: 500;
}

/* Eyebrow text (category labels above headlines) */
.eyebrow {
  font-size: var(--text-xs);
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--accent);
}

/* Monospace for code, numbers, data */
.mono {
  font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;
  font-feature-settings: 'liga' 1, 'calt' 1; /* ligatures */
  font-size: 0.9em; /* mono is optically larger */
}

/* Numeric figures */
.figures {
  font-variant-numeric: tabular-nums; /* numbers same width for alignment */
}

/* Oldstyle figures (lowercase-style numbers for body text) */
.oldstyle {
  font-variant-numeric: oldstyle-nums;
}
```

### Display Typography Techniques

**Gradient text:**
```css
.gradient-text {
  background: linear-gradient(135deg, var(--accent), var(--accent-complementary));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
```

**Outlined text:**
```css
.outlined {
  -webkit-text-stroke: 1px var(--text-primary);
  color: transparent;
}
```

**Mixed outlined + filled (one word each):**
Great for hero sections — combine `color: transparent` and `color: var(--text-primary)` within the same heading using `<span>`.

**Oversized background text:**
```css
.section { position: relative; }
.section::before {
  content: attr(data-label);
  position: absolute;
  top: -0.2em;
  left: -0.05em;
  font-size: clamp(6rem, 20vw, 16rem);
  font-weight: 900;
  line-height: 1;
  color: oklch(100% 0 0 / 0.03);
  pointer-events: none;
  user-select: none;
  letter-spacing: -0.04em;
}
```

**Variable font animation:**
```css
@keyframes weight-pulse {
  0%, 100% { font-variation-settings: 'wght' 300; }
  50% { font-variation-settings: 'wght' 900; }
}
.animated-weight {
  animation: weight-pulse 3s ease-in-out infinite;
}
```

---

## Dark Mode Color Strategy

Avoid simply inverting light mode. Dark mode needs its own design:

```css
@media (prefers-color-scheme: dark) {
  :root {
    /* Backgrounds: NOT pure black — near-black with hue tint */
    --bg-base:     oklch(9% 0.02 var(--h));
    --bg-surface:  oklch(13% 0.025 var(--h));
    --bg-elevated: oklch(17% 0.03 var(--h));
    
    /* Borders: very subtle */
    --border-subtle: oklch(100% 0 0 / 0.08);
    --border-strong: oklch(100% 0 0 / 0.18);
    
    /* Text: NOT pure white — slightly warm/tinted */
    --text-primary:   oklch(95% 0.01 var(--h));
    --text-secondary: oklch(68% 0.04 var(--h));
    --text-muted:     oklch(48% 0.03 var(--h));
    
    /* Accent: may need to be LIGHTER in dark mode for contrast */
    --accent: oklch(72% 0.22 var(--h));
    --accent-glow: oklch(72% 0.22 var(--h) / 0.2);
  }
}
```

**Dark mode principles:**
- Surfaces should feel like they have depth (darker = deeper)
- Borders should be barely visible — trust elevation to separate surfaces
- Pure black (#000) backgrounds feel harsh — use near-black with hue
- Increase type weight slightly in dark mode (400→500, 600→700) for readability
- Reduce saturation of UI elements in dark mode — highly saturated colors vibrate
- Glow effects work IN dark mode — shadows push content forward in light mode
