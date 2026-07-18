# Animation & Motion — Advanced Reference

## The Physics of Good Animation

### Spring vs Easing

Easing curves are time-based. Springs are physics-based.
**Spring parameters:**
- `stiffness` (k): how fast it snaps back (100=slow, 800=fast)
- `damping` (d): how quickly oscillation dies (too low=bouncy, too high=overdamped/stiff)
- `mass` (m): perceived weight (higher=more inertia, slower response)

**Cheat sheet for common interactions:**
```js
// Snappy UI response (button, toggle, dropdown)
{ type: 'spring', stiffness: 500, damping: 35 }

// Smooth modal entrance
{ type: 'spring', stiffness: 350, damping: 30 }

// Bouncy notification
{ type: 'spring', stiffness: 400, damping: 20, mass: 0.8 }

// Heavy element (sidebar, drawer)
{ type: 'spring', stiffness: 250, damping: 32, mass: 1.2 }

// Magnetic/follow animation
{ type: 'spring', stiffness: 150, damping: 15 }

// Gentle float animation (hero element)
{ type: 'spring', stiffness: 80, damping: 20 }
```

### CSS Timing Functions

```css
/* The standard curves */
--ease-in:       cubic-bezier(0.4, 0, 1, 1);
--ease-out:      cubic-bezier(0, 0, 0.2, 1);
--ease-in-out:   cubic-bezier(0.4, 0, 0.2, 1);

/* Overshoot (slight bounce) */
--ease-spring:   cubic-bezier(0.34, 1.56, 0.64, 1);

/* Smooth deceleration */
--ease-smooth:   cubic-bezier(0.25, 0.46, 0.45, 0.94);

/* Anticipation (slight pullback before forward motion) */
--ease-back:     cubic-bezier(0.36, 0, 0.66, -0.56);
```

---

## Entrance Animation Patterns

### Staggered List Reveal
```css
.list-item {
  opacity: 0;
  transform: translateY(12px);
  animation: reveal 0.4s var(--ease-out) forwards;
}
.list-item:nth-child(1) { animation-delay: 0ms; }
.list-item:nth-child(2) { animation-delay: 60ms; }
.list-item:nth-child(3) { animation-delay: 120ms; }
.list-item:nth-child(4) { animation-delay: 180ms; }
/* For dynamic lists: */
/* style="animation-delay: calc(var(--index) * 60ms)" */

@keyframes reveal {
  to { opacity: 1; transform: translateY(0); }
}
```

### Page Hero Sequence
```jsx
// Framer Motion stagger
const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 }
  }
};
const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 400, damping: 30 } }
};

<motion.div variants={container} initial="hidden" animate="show">
  <motion.span className="eyebrow" variants={item}>Category</motion.span>
  <motion.h1 variants={item}>Headline</motion.h1>
  <motion.p variants={item}>Subtext</motion.p>
  <motion.div variants={item}><button>CTA</button></motion.div>
</motion.div>
```

### CSS @starting-style (No-JS Entry Animation)
```css
/* New CSS — animate FROM on first paint */
.modal {
  opacity: 1;
  transform: scale(1);
  transition: opacity 0.25s ease, transform 0.25s var(--ease-spring);
}
@starting-style {
  .modal {
    opacity: 0;
    transform: scale(0.95);
  }
}
```

---

## Scroll-Driven Animations

### CSS scroll-timeline (no JS required)
```css
/* Fade in elements as they enter viewport */
@keyframes fade-in {
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: translateY(0); }
}
.scroll-reveal {
  animation: fade-in linear both;
  animation-timeline: view();
  animation-range: entry 0% entry 30%;
}

/* Progress bar that tracks scroll position */
@keyframes grow {
  from { transform: scaleX(0); }
  to   { transform: scaleX(1); }
}
.scroll-progress {
  position: fixed;
  top: 0; left: 0;
  height: 3px;
  width: 100%;
  background: var(--accent);
  transform-origin: left;
  animation: grow linear;
  animation-timeline: scroll(root);
}

/* Parallax header image */
@keyframes parallax-up {
  from { transform: translateY(-20%); }
  to   { transform: translateY(20%); }
}
.hero-image {
  animation: parallax-up linear both;
  animation-timeline: scroll(root);
  animation-range: exit;
}
```

### Intersection Observer Pattern (broader browser support)
```js
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target); // once only
      }
    });
  },
  { threshold: 0.15, rootMargin: '0px 0px -50px 0px' }
);

document.querySelectorAll('[data-animate]').forEach((el) => observer.observe(el));
```

---

## Gesture-Based Interactions

### Drag to Dismiss (Framer Motion)
```jsx
import { motion, AnimatePresence } from 'framer-motion';

function DismissableCard({ children, onDismiss }) {
  return (
    <motion.div
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.2}
      onDragEnd={(event, { offset, velocity }) => {
        if (Math.abs(offset.x) > 150 || Math.abs(velocity.x) > 500) {
          onDismiss();
        }
      }}
      whileDrag={{ scale: 1.02 }}
    >
      {children}
    </motion.div>
  );
}
```

### Pinch to Zoom (Touch events)
```js
let initialDistance = 0;
let currentScale = 1;

element.addEventListener('touchstart', (e) => {
  if (e.touches.length === 2) {
    initialDistance = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY
    );
  }
});
element.addEventListener('touchmove', (e) => {
  if (e.touches.length === 2) {
    const distance = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY
    );
    currentScale = Math.min(4, Math.max(0.5, distance / initialDistance));
    element.style.transform = `scale(${currentScale})`;
  }
});
```

---

## Cursor Effects

### Custom cursor (replaces system cursor)
```js
const cursor = document.createElement('div');
cursor.className = 'custom-cursor';
document.body.appendChild(cursor);

let mouseX = 0, mouseY = 0;
let cursorX = 0, cursorY = 0;

document.addEventListener('mousemove', (e) => {
  mouseX = e.clientX;
  mouseY = e.clientY;
});

// Smooth follow with lerp
function lerp(a, b, t) { return a + (b - a) * t; }
function animateCursor() {
  cursorX = lerp(cursorX, mouseX, 0.12);
  cursorY = lerp(cursorY, mouseY, 0.12);
  cursor.style.transform = `translate(${cursorX}px, ${cursorY}px)`;
  requestAnimationFrame(animateCursor);
}
animateCursor();
```
```css
body { cursor: none; }
.custom-cursor {
  position: fixed;
  top: -8px; left: -8px; /* offset to center */
  width: 16px; height: 16px;
  background: var(--accent);
  border-radius: 50%;
  pointer-events: none;
  z-index: 9999;
  mix-blend-mode: difference; /* inverts color of elements underneath */
  transition: width 0.2s ease, height 0.2s ease, background 0.2s ease;
}
/* Expand cursor on interactive elements */
a:hover ~ .custom-cursor,
button:hover ~ .custom-cursor {
  width: 40px;
  height: 40px;
  top: -20px; left: -20px;
}
```

---

## Text Animations

### Typewriter Effect
```js
async function typewriter(element, text, speed = 50) {
  element.textContent = '';
  for (const char of text) {
    element.textContent += char;
    await new Promise(resolve => setTimeout(resolve, speed));
  }
}
```

### Split Text Reveal (character by character)
```jsx
function SplitText({ text, className }) {
  return (
    <span aria-label={text}>
      {text.split('').map((char, i) => (
        <motion.span
          key={i}
          aria-hidden="true"
          initial={{ opacity: 0, y: '100%' }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: i * 0.03,
            type: 'spring',
            stiffness: 400,
            damping: 30
          }}
          style={{ display: 'inline-block' }}
        >
          {char === ' ' ? '\u00A0' : char}
        </motion.span>
      ))}
    </span>
  );
}
```

### Scramble Effect (hover on headings)
```js
const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';

function scramble(element, finalText, duration = 800) {
  let iterations = 0;
  const total = finalText.length;
  const interval = setInterval(() => {
    element.textContent = finalText
      .split('')
      .map((char, i) => {
        if (i < iterations) return char;
        if (char === ' ') return ' ';
        return chars[Math.floor(Math.random() * chars.length)];
      })
      .join('');
    if (iterations >= total) clearInterval(interval);
    iterations += 0.5;
  }, duration / (total * 2));
}
```

---

## Loading & Transition Patterns

### Page Transition (React Router + Framer Motion)
```jsx
const pageVariants = {
  initial: { opacity: 0, x: 20, filter: 'blur(4px)' },
  in: { opacity: 1, x: 0, filter: 'blur(0px)' },
  out: { opacity: 0, x: -20, filter: 'blur(4px)' }
};
const pageTransition = {
  type: 'spring',
  stiffness: 300,
  damping: 30
};

function PageWrapper({ children }) {
  return (
    <motion.div
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={pageTransition}
    >
      {children}
    </motion.div>
  );
}
```

### View Transitions API (Native browser transitions)
```js
// Modern page transitions without a library
async function navigate(url) {
  if (!document.startViewTransition) {
    window.location.href = url;
    return;
  }
  document.startViewTransition(async () => {
    const response = await fetch(url);
    const html = await response.text();
    document.body.innerHTML = new DOMParser()
      .parseFromString(html, 'text/html')
      .body.innerHTML;
  });
}
```

```css
/* Customize the transition */
::view-transition-old(root) {
  animation: slide-out 0.3s var(--ease-in) both;
}
::view-transition-new(root) {
  animation: slide-in 0.4s var(--ease-out) both;
}
@keyframes slide-out {
  to { transform: translateX(-30px); opacity: 0; }
}
@keyframes slide-in {
  from { transform: translateX(30px); opacity: 0; }
}
```

### Layout Animation (React — elements resize smoothly)
```jsx
import { motion, LayoutGroup } from 'framer-motion';

// Wrap siblings that may resize/reorder
<LayoutGroup>
  {items.map(item => (
    <motion.div key={item.id} layout layoutId={item.id}>
      {/* content */}
    </motion.div>
  ))}
</LayoutGroup>
```

---

## Performance Checklist for Animations

- [ ] Only animate `transform` and `opacity` — they don't trigger layout or paint
- [ ] Add `will-change: transform` to actively animating elements, remove after
- [ ] Use `transform: translateZ(0)` to force GPU compositing for key elements
- [ ] Avoid animating `width`, `height`, `top`, `left`, `margin`, `padding`
- [ ] Use `requestAnimationFrame` for JS animations — never `setTimeout`/`setInterval`
- [ ] Debounce scroll and resize handlers
- [ ] Use `passive: true` on scroll listeners: `addEventListener('scroll', fn, { passive: true })`
- [ ] `animation-fill-mode: both` to prevent flash before/after
- [ ] Test at 60fps target — use Chrome DevTools Performance tab
- [ ] Respect `prefers-reduced-motion` — provide static fallback for all animations
