# Component Patterns — World-Class Reference

## Cards

### The Layered Card (Glassmorphism done right)
```css
.card {
  background: oklch(100% 0 0 / 0.05);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid oklch(100% 0 0 / 0.1);
  border-radius: 16px;
  /* Layered shadow for depth */
  box-shadow:
    0 0 0 1px oklch(0% 0 0 / 0.05),
    0 1px 2px oklch(0% 0 0 / 0.1),
    0 8px 16px oklch(0% 0 0 / 0.15),
    0 32px 64px oklch(0% 0 0 / 0.1),
    inset 0 1px 0 oklch(100% 0 0 / 0.08);
}
/* Inner highlight for glass effect */
.card::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(
    135deg,
    oklch(100% 0 0 / 0.08) 0%,
    transparent 50%
  );
  pointer-events: none;
}
```

### The Glow Card (Hover reveals ambient light)
```css
.card {
  position: relative;
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: 12px;
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
}
.card:hover {
  border-color: var(--border-strong);
  box-shadow: 0 0 0 1px var(--border-strong), 0 8px 32px var(--accent-glow);
}
/* JS: Track mouse position for spotlight effect */
/* card.addEventListener('mousemove', (e) => {
  const rect = card.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width * 100).toFixed(1);
  const y = ((e.clientY - rect.top) / rect.height * 100).toFixed(1);
  card.style.setProperty('--mouse-x', x + '%');
  card.style.setProperty('--mouse-y', y + '%');
}); */
.card::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: radial-gradient(
    400px circle at var(--mouse-x, 50%) var(--mouse-y, 50%),
    var(--accent-glow),
    transparent 70%
  );
  opacity: 0;
  transition: opacity 0.3s ease;
}
.card:hover::after { opacity: 1; }
```

### The 3D Tilt Card (React with Framer Motion)
```jsx
import { motion, useMotionValue, useTransform } from 'framer-motion';

function TiltCard({ children }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-0.5, 0.5], [10, -10]);
  const rotateY = useTransform(x, [-0.5, 0.5], [-10, 10]);

  function handleMouseMove(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    x.set((e.clientX - rect.left) / rect.width - 0.5);
    y.set((e.clientY - rect.top) / rect.height - 0.5);
  }
  function handleMouseLeave() {
    x.set(0); y.set(0);
  }

  return (
    <motion.div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      {children}
    </motion.div>
  );
}
```

### Bento Grid
```css
.bento-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  grid-auto-rows: 80px;
  gap: 16px;
}
/* Each cell spans intentionally — vary dramatically */
.cell-hero     { grid-column: span 8; grid-row: span 5; }
.cell-stat     { grid-column: span 4; grid-row: span 2; }
.cell-wide     { grid-column: span 12; grid-row: span 2; }
.cell-feature  { grid-column: span 4; grid-row: span 3; }
```

---

## Navigation

### Floating Navbar (the modern standard)
```css
.nav {
  position: fixed;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  background: oklch(10% 0.02 220 / 0.8);
  backdrop-filter: blur(20px);
  border: 1px solid oklch(100% 0 0 / 0.08);
  border-radius: 100px; /* pill shape */
  padding: 8px 16px;
  display: flex;
  align-items: center;
  gap: 4px;
  z-index: 1000;
  box-shadow: 0 8px 32px oklch(0% 0 0 / 0.3);
}
/* Active item indicator with layout animation */
.nav-item.active {
  background: oklch(100% 0 0 / 0.08);
  border-radius: 100px;
}
```

### Magnetic Nav Links (React)
```jsx
import { useRef } from 'react';
import { motion, useSpring } from 'framer-motion';

function MagneticLink({ children }) {
  const ref = useRef(null);
  const x = useSpring(0, { stiffness: 200, damping: 15 });
  const y = useSpring(0, { stiffness: 200, damping: 15 });

  function handleMouseMove(e) {
    const rect = ref.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    x.set((e.clientX - cx) * 0.3);
    y.set((e.clientY - cy) * 0.3);
  }
  function handleMouseLeave() { x.set(0); y.set(0); }

  return (
    <motion.a
      ref={ref}
      style={{ x, y, display: 'inline-block' }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </motion.a>
  );
}
```

### Command Palette (Cmd+K)
Key patterns:
- Full-screen backdrop with blur
- Input with icon prefix, clear button
- Grouped results with category labels
- Keyboard navigation (arrow keys, enter)
- Fuzzy search highlighting
- Recent/pinned items section
- `role="dialog"`, `aria-modal="true"`, focus trap

---

## Buttons

### The Layered Button (premium feel)
```css
.btn-primary {
  position: relative;
  background: var(--accent);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 10px 20px;
  font-weight: 500;
  letter-spacing: -0.01em;
  cursor: pointer;
  overflow: hidden;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  
  /* Layered shadow */
  box-shadow:
    0 1px 0 oklch(0% 0 0 / 0.2) inset, /* bottom inner shadow */
    0 -1px 0 oklch(100% 0 0 / 0.1) inset, /* top inner highlight */
    0 2px 4px oklch(0% 0 0 / 0.2),
    0 4px 12px var(--accent-glow);
}
.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow:
    0 1px 0 oklch(0% 0 0 / 0.2) inset,
    0 -1px 0 oklch(100% 0 0 / 0.1) inset,
    0 4px 8px oklch(0% 0 0 / 0.2),
    0 8px 24px var(--accent-glow);
}
.btn-primary:active { transform: translateY(1px); }

/* Shimmer on hover */
.btn-primary::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(105deg, transparent 40%, oklch(100% 0 0 / 0.15) 50%, transparent 60%);
  transform: translateX(-100%);
  transition: transform 0.5s ease;
}
.btn-primary:hover::after { transform: translateX(100%); }
```

### Ghost Button (for secondary actions)
```css
.btn-ghost {
  background: transparent;
  border: 1px solid var(--border-strong);
  color: var(--text-primary);
  border-radius: 8px;
  padding: 9px 20px;
  transition: background 0.15s ease, border-color 0.15s ease;
}
.btn-ghost:hover {
  background: oklch(100% 0 0 / 0.05);
  border-color: var(--accent);
}
```

---

## Forms

### Floating Label Input (modern pattern)
```html
<div class="field">
  <input type="text" id="name" placeholder=" " required>
  <label for="name">Full Name</label>
  <div class="field-border"></div>
</div>
```
```css
.field { position: relative; padding-top: 20px; }
.field input {
  width: 100%;
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
  padding: 12px 16px;
  color: var(--text-primary);
  font-size: 1rem;
  transition: border-color 0.2s ease;
  outline: none;
}
.field label {
  position: absolute;
  left: 16px;
  top: 32px;
  color: var(--text-muted);
  pointer-events: none;
  transition: all 0.2s ease;
  transform-origin: left;
}
.field input:focus,
.field input:not(:placeholder-shown) {
  border-color: var(--accent);
}
.field input:focus ~ label,
.field input:not(:placeholder-shown) ~ label {
  top: 4px;
  font-size: 0.75rem;
  color: var(--accent);
  transform: scale(0.85);
}
```

### Animated Validation States
```css
.field.valid input { border-color: oklch(72% 0.18 142); } /* green */
.field.error input { border-color: oklch(62% 0.22 25); }  /* red */
.field .message {
  font-size: 0.75rem;
  margin-top: 4px;
  opacity: 0;
  transform: translateY(-4px);
  transition: all 0.2s ease;
}
.field.error .message {
  opacity: 1;
  transform: translateY(0);
  color: oklch(62% 0.22 25);
}
```

---

## Data Tables

Best-in-class patterns:
- Sticky header with backdrop blur
- Row hover with subtle highlight
- Sortable columns with animated sort indicators
- Column resizing via drag
- Virtualized rendering for 10k+ rows (TanStack Virtual)
- Inline editing cells
- Multi-select with checkbox + shift-click
- Zebra rows for dense data: `tr:nth-child(even) { background: oklch(100% 0 0 / 0.02); }`
- Skeleton loading rows (not spinners)

```css
.table-container {
  overflow: auto;
  border: 1px solid var(--border-subtle);
  border-radius: 12px;
}
thead th {
  position: sticky;
  top: 0;
  background: var(--bg-surface);
  backdrop-filter: blur(8px);
  z-index: 10;
  border-bottom: 1px solid var(--border-subtle);
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-muted);
}
tbody tr {
  transition: background 0.1s ease;
  border-bottom: 1px solid var(--border-subtle);
}
tbody tr:hover { background: oklch(100% 0 0 / 0.03); }
tbody tr:last-child { border-bottom: none; }
```

---

## Loading States

NEVER use a generic spinning circle for all loading states. Match the loading state to the content:

### Skeleton Loader
```css
.skeleton {
  background: linear-gradient(
    90deg,
    var(--bg-elevated) 25%,
    oklch(100% 0 0 / 0.06) 50%,
    var(--bg-elevated) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s ease infinite;
  border-radius: 4px;
}
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
```

### Animated Dots (for AI responses / streaming)
```css
.thinking span {
  animation: bounce 1s ease infinite;
  display: inline-block;
}
.thinking span:nth-child(2) { animation-delay: 0.1s; }
.thinking span:nth-child(3) { animation-delay: 0.2s; }
@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}
```

---

## Empty States

Empty states are a moment for delight — not a grey box.
- Use an illustration or icon that matches the context
- Write copy that explains what will appear AND how to make it appear
- Provide a primary CTA button to fill the empty state
- Subtle animation on the illustration

```html
<div class="empty-state">
  <div class="empty-illustration"><!-- SVG or Lottie --></div>
  <h3>No results yet</h3>
  <p>Start by creating your first <strong>project</strong> — it only takes 30 seconds.</p>
  <button class="btn-primary">Create project →</button>
</div>
```

---

## Modals & Dialogs

```jsx
// React + Framer Motion modal
import { AnimatePresence, motion } from 'framer-motion';

function Modal({ isOpen, onClose, children }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.dialog
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            open
          >
            {children}
          </motion.dialog>
        </>
      )}
    </AnimatePresence>
  );
}
```
```css
.backdrop {
  position: fixed; inset: 0;
  background: oklch(0% 0 0 / 0.6);
  backdrop-filter: blur(4px);
  z-index: 100;
}
dialog {
  position: fixed;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: 16px;
  padding: 24px;
  max-width: min(90vw, 480px);
  width: 100%;
  z-index: 101;
  box-shadow: 0 24px 64px oklch(0% 0 0 / 0.4);
}
```

---

## Notification / Toast

- Appear from bottom-right (desktop) or bottom-center (mobile)
- Stack with spring animation when multiple toasts
- Auto-dismiss with a progress bar
- Color-coded: info (blue), success (green), error (red), warning (amber)
- Icon + title + optional description + optional action button
- Swipe-to-dismiss on mobile

```css
.toast {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: 10px;
  box-shadow: 0 8px 24px oklch(0% 0 0 / 0.3);
  min-width: 280px;
  max-width: 360px;
}
.toast-progress {
  position: absolute;
  bottom: 0; left: 0;
  height: 2px;
  background: var(--accent);
  border-radius: 0 0 10px 10px;
  animation: progress 4s linear forwards;
}
@keyframes progress {
  from { width: 100%; }
  to { width: 0%; }
}
```

---

## Avatars & Badges

```css
/* Avatar with ring */
.avatar {
  width: 40px; height: 40px;
  border-radius: 50%;
  border: 2px solid var(--bg-base);
  box-shadow: 0 0 0 2px var(--accent);
  object-fit: cover;
}
/* Avatar stack (overlapping) */
.avatar-group { display: flex; }
.avatar-group .avatar { margin-left: -12px; }
.avatar-group .avatar:first-child { margin-left: 0; }
/* Badge */
.badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 100px;
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.badge-success { background: oklch(72% 0.18 142 / 0.15); color: oklch(72% 0.18 142); border: 1px solid oklch(72% 0.18 142 / 0.3); }
.badge-error   { background: oklch(62% 0.22 25 / 0.15);  color: oklch(62% 0.22 25);  border: 1px solid oklch(62% 0.22 25 / 0.3); }
```

---

## Sidebar / Navigation Drawer

- Collapsible with smooth width animation (use CSS `width` transition with `overflow: hidden`)
- Active state: left border highlight + background fill
- Icon-only collapsed state with tooltip on hover
- Section grouping with subtle labels
- Bottom section for settings/profile (sticky)
- Keyboard shortcut to toggle: `[` key

```css
.sidebar {
  width: 240px;
  height: 100vh;
  background: var(--bg-surface);
  border-right: 1px solid var(--border-subtle);
  transition: width 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.sidebar.collapsed { width: 64px; }
.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
  position: relative;
  white-space: nowrap;
}
.nav-item.active {
  background: var(--accent-glow);
  color: var(--accent);
}
.nav-item.active::before {
  content: '';
  position: absolute;
  left: 0; top: 20%; bottom: 20%;
  width: 3px;
  background: var(--accent);
  border-radius: 0 2px 2px 0;
  margin-left: -12px;
}
```
