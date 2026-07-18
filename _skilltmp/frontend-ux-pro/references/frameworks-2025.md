# Frameworks & Tools — 2025–2026 Standard

## Tailwind CSS v4 (Released Feb 2025)

Completely new architecture. If someone is using Tailwind, they should be on v4.

### What changed — everything
```css
/* v3: tailwind.config.js (JavaScript) */
/* v4: CSS-first config — no config file */

/* Install */
/* npm install tailwindcss@next @tailwindcss/vite */

/* Entry CSS — replaces @tailwind directives */
@import "tailwindcss";

/* Define your theme with @theme */
@theme {
  --font-display: "Cabinet Grotesk", sans-serif;
  --font-body: "Satoshi", sans-serif;
  
  --color-brand-50: oklch(97% 0.01 245);
  --color-brand-500: oklch(55% 0.18 245);
  --color-brand-900: oklch(18% 0.06 245);
  
  --radius-card: 16px;
  --radius-btn: 8px;
  --radius-pill: 100px;
  
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

### v4 Key Differences
```css
/* Custom utilities — just write CSS */
@utility animate-shimmer {
  background-size: 200% 100%;
  animation: shimmer 1.5s ease infinite;
}

/* Dynamic variants (no config needed) */
/* hover:bg-brand-500 just works with @theme tokens */

/* Arbitrary variants still work */
/* [@media(hover:hover)]:opacity-100 */

/* Container queries built-in */
/* @container/sidebar (min-width: 300px):flex-row */

/* 3D utilities new in v4 */
/* rotate-x-12, rotate-y-6, perspective-1000 */

/* Starting style (for entry animations) */
/* starting:opacity-0 starting:scale-95 */
```

### v4 Vite Config
```js
// vite.config.ts
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [tailwindcss(), react()]
})
```

---

## React 19 (Released Dec 2024)

### Actions — the new async pattern
```jsx
// useActionState replaces manual loading/error state
import { useActionState } from 'react';

async function submitForm(prevState, formData) {
  const result = await api.save(formData.get('name'));
  if (result.error) return { error: result.error };
  return { success: true };
}

function Form() {
  const [state, action, isPending] = useActionState(submitForm, null);
  
  return (
    <form action={action}>
      <input name="name" />
      <button type="submit" disabled={isPending}>
        {isPending ? 'Saving...' : 'Save'}
      </button>
      {state?.error && <p>{state.error}</p>}
    </form>
  );
}
```

### useOptimistic — instant UI before server confirms
```jsx
import { useOptimistic, useTransition } from 'react';

function MessageList({ messages, sendMessage }) {
  const [optimisticMessages, addOptimisticMessage] = useOptimistic(
    messages,
    (state, newMessage) => [...state, { ...newMessage, pending: true }]
  );
  const [isPending, startTransition] = useTransition();

  async function handleSend(text) {
    addOptimisticMessage({ text, id: Date.now() }); // immediate
    await sendMessage(text); // actual server call
  }

  return (
    <>
      {optimisticMessages.map(m => (
        <div key={m.id} style={{ opacity: m.pending ? 0.6 : 1 }}>{m.text}</div>
      ))}
    </>
  );
}
```

### use() — read resources in render
```jsx
import { use, Suspense } from 'react';

function UserCard({ userPromise }) {
  const user = use(userPromise); // suspends until resolved
  return <div>{user.name}</div>;
}

// Parent wraps with Suspense
<Suspense fallback={<Skeleton />}>
  <UserCard userPromise={fetchUser(id)} />
</Suspense>
```

### useFormStatus — form state from child components
```jsx
import { useFormStatus } from 'react-dom';

function SubmitButton() {
  const { pending } = useFormStatus(); // reads parent form state
  return (
    <button disabled={pending}>
      {pending ? <Spinner /> : 'Submit'}
    </button>
  );
}
```

### ref as prop (no forwardRef needed)
```jsx
// React 19 — ref is just a prop
function Input({ ref, ...props }) {
  return <input ref={ref} {...props} />;
}
// No more React.forwardRef() boilerplate
```

---

## Next.js 15 (Released Oct 2024)

### Async Request APIs (Breaking change from 14)
```jsx
// All request APIs are now async
import { cookies, headers, params } from 'next/headers';

// Page components
export default async function Page({ params, searchParams }) {
  const { slug } = await params;           // was synchronous in 14
  const { q } = await searchParams;       // was synchronous in 14
  const cookieStore = await cookies();    // was synchronous in 14
  const headersList = await headers();   // was synchronous in 14
  
  return <div>{slug}</div>;
}
```

### after() — run code after response sent
```js
import { after } from 'next/server';

export default async function Page() {
  after(async () => {
    // Runs after response is sent to client
    await analytics.track('page_viewed');
    await db.updateLastSeen(userId);
  });
  return <main>...</main>;
}
```

### Turbopack stable (default in dev)
```bash
# Turbopack is now default in next dev
# 96% of tests passing, 45% faster cold starts
next dev  # uses Turbopack
next dev --turbo  # explicit
```

### Caching changes
```jsx
// fetch() is NO LONGER cached by default (opposite of Next 14)
// Must opt in to caching
fetch(url, { cache: 'force-cache' })  // opt in
fetch(url)                            // no cache (new default)
fetch(url, { next: { revalidate: 60 } }) // ISR

// Route handlers also no longer cached by default
```

---

## CSS Anchor Positioning (Chrome 125+, Safari 18.2+)

Positions tooltips, popovers, dropdowns relative to a trigger element natively. No JS positioning libraries.

```css
/* 1. Name the anchor */
.trigger {
  anchor-name: --my-anchor;
}

/* 2. Position relative to it */
.tooltip {
  position: absolute;
  position-anchor: --my-anchor;
  
  /* Place below the anchor, centered */
  top: anchor(bottom);
  left: anchor(center);
  translate: -50% 8px;
  
  /* Or use inset shorthand */
  inset-area: block-end center;
}

/* Flip to top if not enough space below */
@position-try --flip-top {
  inset-area: block-start center;
  translate: -50% -8px;
}
.tooltip {
  position-try-fallbacks: --flip-top;
}
```

### Practical: Tooltip Component (CSS-only)
```html
<button popovertarget="tip">Hover me</button>
<div id="tip" popover="hint" class="tooltip">I'm anchored!</div>
```
```css
[popovertarget] { anchor-name: --btn; }
[popover] {
  position: fixed;
  position-anchor: --btn;
  inset-area: block-end center;
  margin: 8px 0;
  
  /* Style it */
  background: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: 6px;
  padding: 6px 12px;
  font-size: 0.8rem;
}
```

---

## CSS Popover API (Baseline 2024)

Native popovers with zero JavaScript.

```html
<!-- Trigger -->
<button popovertarget="my-menu">Open Menu</button>

<!-- Popover (hidden by default, shown on click) -->
<div id="my-menu" popover>
  <nav>...</nav>
</div>
```
```css
/* Style the backdrop */
#my-menu::backdrop {
  background: oklch(0% 0 0 / 0.4);
  backdrop-filter: blur(4px);
}
/* Popover itself */
[popover] {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: 12px;
  padding: 8px;
  
  /* Entry animation */
  opacity: 0;
  transform: scale(0.96) translateY(-8px);
  transition: all 0.2s var(--ease-spring), overlay 0.2s allow-discrete, display 0.2s allow-discrete;
}
[popover]:popover-open {
  opacity: 1;
  transform: scale(1) translateY(0);
}
@starting-style {
  [popover]:popover-open { opacity: 0; transform: scale(0.96) translateY(-8px); }
}
```

---

## CSS `transition-behavior: allow-discrete`

Animates discrete properties like `display`, `visibility`, `popover`.

```css
.drawer {
  display: none;
  opacity: 0;
  transform: translateX(100%);
  transition:
    opacity 0.3s ease,
    transform 0.3s var(--ease-spring),
    display 0.3s allow-discrete; /* ← the key */
}
.drawer.open {
  display: block;
  opacity: 1;
  transform: translateX(0);
}
@starting-style {
  .drawer.open { opacity: 0; transform: translateX(100%); }
}
```

---

## CSS `@scope` (Baseline 2024)

Scoped styles without BEM naming, CSS modules, or CSS-in-JS.

```css
/* Styles only apply inside .card */
@scope (.card) {
  h2 { font-size: 1.25rem; margin: 0; }
  p { color: var(--text-secondary); }
  .cta { background: var(--accent); }
}

/* Scope with exclusion */
@scope (.sidebar) to (.widget) {
  /* Only sidebar, but not inside .widget elements */
  a { color: var(--accent); }
}
```

---

## CSS `linear()` — Spring-like Easing in Pure CSS

Approximate spring physics without JavaScript using sampled keyframes.

```css
/* Spring bounce effect */
.spring {
  transition: transform 0.6s linear(
    0, 0.009, 0.035 2.1%, 0.141, 0.281 6.7%, 0.723 12.9%, 0.938 16.7%, 
    1.017, 1.077, 1.121, 1.149 24.3%, 1.159, 1.163, 1.161, 1.154 29.9%,
    1.129 32.8%, 1.051 39.6%, 1.017 43.1%, 0.991, 0.977 51%, 0.974 53.8%,
    0.975 57.1%, 0.997 69.8%, 1.003 76.9%, 1
  );
}
/* Generate custom curves: linear-easing.jakearchibald.com */
```

---

## CSS `text-box-trim` (Chrome 123+, Safari 18+)

Removes the invisible space above cap-height and below baseline. Critical for precise vertical alignment in buttons and headings.

```css
/* Remove leading above first line and trailing below last */
h1, button, label {
  text-box: trim-both cap alphabetic;
}
/* Or individually */
.heading { text-box-trim: trim-start; text-box-edge: cap; }
.label   { text-box-trim: trim-both;  text-box-edge: cap alphabetic; }
```

---

## CSS `field-sizing: content` (Chrome 123+)

Textarea / input auto-resizes to content. No JS needed.

```css
textarea {
  field-sizing: content;
  min-height: 60px;
  max-height: 400px;
  resize: none; /* no manual resize needed */
}
```

---

## Motion v11 (Rebranded from Framer Motion)

Two packages now exist — use the right one:

```bash
# For React projects
npm install motion

# Import (same API, new package name)
import { motion, AnimatePresence, useSpring } from 'motion/react';

# For vanilla JS (new — no React dependency)
import { animate, scroll, inView } from 'motion';
```

### Vanilla Motion (no React)
```js
import { animate, scroll, inView } from 'motion';

// Animate element
animate('.hero', { opacity: [0, 1], y: [20, 0] }, { duration: 0.4 });

// Scroll-driven animation
scroll(animate('.progress-bar', { scaleX: [0, 1] }));

// Trigger on viewport entry
inView('.card', ({ target }) => {
  animate(target, { opacity: 1, y: 0 });
});
```

---

## GSAP 3 (Still Gold Standard for Complex Animations)

For Awwwards-level sites, GSAP is irreplaceable. Free for most use cases.

```bash
npm install gsap
```

### Core Timeline (sequential, overlapping animations)
```js
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);

// Timeline: elements animate in sequence
const tl = gsap.timeline({ defaults: { ease: 'power3.out', duration: 0.8 } });
tl.from('.hero-eyebrow', { opacity: 0, y: 10 })
  .from('.hero-title',   { opacity: 0, y: 30, stagger: 0.05 }, '-=0.4')
  .from('.hero-body',    { opacity: 0, y: 20 }, '-=0.3')
  .from('.hero-cta',     { opacity: 0, scale: 0.95 }, '-=0.2');
```

### ScrollTrigger (scroll-driven)
```js
// Animate section on scroll
gsap.from('.feature-card', {
  scrollTrigger: {
    trigger: '.features',
    start: 'top 80%',
    end: 'bottom 20%',
    toggleActions: 'play none none reverse'
  },
  opacity: 0,
  y: 40,
  stagger: 0.1
});

// Pin section (sticky scroll storytelling)
gsap.to('.story-content', {
  x: '-200vw',
  scrollTrigger: {
    trigger: '.story',
    pin: true,
    scrub: 1,
    end: '+=300%'
  }
});
```

### Text Split + GSAP
```js
import { SplitText } from 'gsap/SplitText'; // Club GreenSock
// or use a free alternative:
function splitChars(element) {
  const text = element.textContent;
  element.innerHTML = [...text].map(c => 
    `<span style="display:inline-block">${c === ' ' ? '&nbsp;' : c}</span>`
  ).join('');
  return element.querySelectorAll('span');
}

const chars = splitChars(document.querySelector('h1'));
gsap.from(chars, {
  opacity: 0,
  y: '100%',
  rotateX: -90,
  stagger: 0.03,
  ease: 'back.out(1.7)'
});
```

---

## Lenis Smooth Scroll (2025 Standard)

Replaces `locomotive-scroll`. Lightweight, performant, works with GSAP ScrollTrigger.

```bash
npm install lenis
```

```js
import Lenis from 'lenis';

const lenis = new Lenis({
  duration: 1.2,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  orientation: 'vertical',
  smoothWheel: true,
});

// Sync with GSAP ScrollTrigger
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);

// Or vanilla RAF loop
function raf(time) {
  lenis.raf(time);
  requestAnimationFrame(raf);
}
requestAnimationFrame(raf);
```

---

## Rive (Replacing Lottie for Interactive Animations)

Lottie plays static animations. Rive has state machines — animations respond to user input.

```bash
npm install @rive-app/react-canvas
```

```jsx
import { useRive, useStateMachineInput } from '@rive-app/react-canvas';

function AnimatedButton() {
  const { rive, RiveComponent } = useRive({
    src: '/button.riv',
    stateMachines: 'ButtonSM',
    autoplay: true,
  });
  
  const hoverInput = useStateMachineInput(rive, 'ButtonSM', 'isHovered');
  
  return (
    <button
      onMouseEnter={() => hoverInput && (hoverInput.value = true)}
      onMouseLeave={() => hoverInput && (hoverInput.value = false)}
    >
      <RiveComponent style={{ width: 200, height: 60 }} />
    </button>
  );
}
```

Use Rive for: animated logos, interactive illustrations, button states, loading animations, mascots/characters.

---

## React Three Fiber / Spline (3D on the Web)

### Spline (zero-code 3D scenes)
```bash
npm install @splinetool/react-spline
```
```jsx
import Spline from '@splinetool/react-spline';

export default function Hero() {
  return (
    <div className="hero-3d">
      <Spline scene="https://prod.spline.design/YOUR-SCENE-URL/scene.splinecode" />
    </div>
  );
}
```

### React Three Fiber (code-first 3D)
```bash
npm install three @react-three/fiber @react-three/drei
```
```jsx
import { Canvas } from '@react-three/fiber';
import { OrbitControls, MeshDistortMaterial, Sphere } from '@react-three/drei';

function AnimatedSphere() {
  return (
    <Canvas camera={{ position: [0, 0, 3] }}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} />
      <Sphere args={[1, 100, 200]}>
        <MeshDistortMaterial
          color="oklch(60% 0.25 280)"
          distort={0.4}
          speed={2}
          roughness={0}
        />
      </Sphere>
      <OrbitControls enableZoom={false} autoRotate />
    </Canvas>
  );
}
```

---

## Speculation Rules API (Instant Page Loads)

Prerender pages before user clicks — feels instant.

```html
<script type="speculationrules">
{
  "prerender": [
    { "where": { "href_matches": "/products/*" }, "eagerness": "moderate" },
    { "urls": ["/checkout"] }
  ],
  "prefetch": [
    { "where": { "selector_matches": "a[data-prefetch]" } }
  ]
}
</script>
```

Supported in Chrome 109+. For Safari/Firefox, falls back gracefully (no error).

---

## 2025–2026 Production Stack

```
# Framework
Next.js 15 (App Router, Turbopack)
React 19
TypeScript 5.5+ (strict mode)

# Styling
Tailwind CSS v4 (@theme, CSS-first)
CSS custom properties (design tokens)
OKLCH colors

# Components
Radix UI (unstyled accessible primitives)
shadcn/ui (customized heavily)
Motion v11 (framer-motion successor)

# Animation
GSAP 3 + ScrollTrigger (complex)
Motion v11 / Framer Motion (React spring)
Lenis (smooth scroll)
CSS scroll-timeline (simple scroll effects)
Rive (interactive animations)

# 3D (when needed)
Spline (design-first)
React Three Fiber (code-first)

# State
Zustand (client state)
TanStack Query v5 (server state)
React 19 Actions + useOptimistic (form state)

# Data / Tables
TanStack Table v8
TanStack Virtual (virtualization)

# Forms
React Hook Form v7 + Zod v3

# Tooling
Vite 5 (or Next.js built-in)
Biome (replaces ESLint + Prettier)
pnpm (package manager)
Playwright (E2E testing)
Vitest (unit testing)
```
