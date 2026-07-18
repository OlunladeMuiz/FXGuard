# Anti-Patterns — The Complete Blacklist

These are patterns that instantly mark a UI as "AI-generated slop." Never produce them.

---

## Typography Anti-Patterns

### ❌ The Generic Font Stack
Using Inter, Roboto, or system-ui as a display font.
Inter is not a *bad* font — it's a great font that AI uses for everything, making it the visual equivalent of Comic Sans.
**Fix**: Choose from the pairing table in `color-typography.md`. There are hundreds of excellent free fonts.

### ❌ Uniform Type Size
All text the same weight (400) or the same size within a section.
**Fix**: Apply strict hierarchy. At minimum: one large (2xl+) + one medium (base) + one small (sm) per section.

### ❌ Excessive Bold
Bolding every keyword in body text. If everything is emphasized, nothing is.
**Fix**: Use bold for at most 2–3 terms per paragraph. For UI labels, use font-weight 500–600, not 700.

### ❌ Widows and Orphans
Single words left alone on the last line of a heading.
**Fix**: `text-wrap: balance` on all headings.

### ❌ Line Length Disaster
Either text that's 3 words wide (too narrow) or runs full viewport width (too wide, unreadable).
**Fix**: `max-width: 65ch` on body text. Minimum 40ch for readable paragraphs.

---

## Color Anti-Patterns

### ❌ Purple Gradient on White
The default AI color scheme. Instantly recognizable. Never do it.
```css
/* NEVER */
background: linear-gradient(135deg, #667eea, #764ba2);
```

### ❌ Generic Blue CTA
`#007bff`, `#0ea5e9`, `#3b82f6` as a primary button color with zero brand context.
**Fix**: Derive button color from a brand palette token.

### ❌ Too Many Colors
6 different accent colors in a single view. Creates visual chaos.
**Fix**: 1 primary accent, maximum 2–3 semantic status colors.

### ❌ Untinted Grays
`gray-100`, `gray-500`, `gray-900` — neutral grays with no hue.
**Fix**: Always add a slight hue tint (0.01–0.03 chroma in OKLCH) to backgrounds and neutrals.

### ❌ Equal Weight Colors
Using vivid colors at equal saturation for both background and text/accent.
They vibrate against each other and make the design exhausting.
**Fix**: One vivid color, everything else desaturated or near-neutral.

### ❌ Low Contrast
Text that's readable "enough" but fails WCAG AA (4.5:1 minimum for body text).
Never use `color: gray` on any background without checking.
**Fix**: Use browser DevTools Accessibility panel to check contrast ratio.

### ❌ Black Shadows
`box-shadow: 0 4px 6px rgba(0,0,0,0.1)` — grey shadows look disconnected from the element.
**Fix**: Tint shadows with the background hue or the element's own color.

---

## Layout Anti-Patterns

### ❌ The 3-Column Feature Grid
Three equal-width cards, each with an icon, a one-liner title, and two sentences of copy.
This layout is on every SaaS landing page made in 2020–2024. It communicates nothing.
**Fix**: Use bento grids with varied sizes. Give important items more real estate.

### ❌ Centered Everything
Centering all text, all the time, regardless of context.
Center alignment is for short text with visual weight (hero headlines). It's wrong for body copy.
**Fix**: Left-align body text always. Center only for standalone display text.

### ❌ Padding Soup
Inconsistent spacing values everywhere — `padding: 13px 22px` on one element, `padding: 17px 19px` on another.
**Fix**: Use the 8px grid. Every spacing value is a multiple of 4 or 8.

### ❌ Fake Depth
Adding `border-radius: 8px` and a light shadow to every element indiscriminately.
**Fix**: Earn your elevation. Use shadows/borders to communicate semantic depth — deeper elements have more prominent shadows.

### ❌ The Blank Slate
No empty states. When there's no data, just... nothing. Or a generic "No items found."
**Fix**: Design every empty state with a relevant illustration, clear explanation, and a CTA.

### ❌ Mobile as Afterthought
A desktop layout that "goes responsive" by stacking everything in a single column with full-width blocks.
**Fix**: Design with mobile constraints first. Every component should be tested at 375px.

---

## Interaction Anti-Patterns

### ❌ No Hover States
Buttons, cards, links — no visual response to hover. The UI feels dead.
**Fix**: Every interactive element has a hover state: color shift, shadow, transform, or border.

### ❌ Unstyled Focus Rings
`outline: none` without a custom focus style. Kills keyboard navigation.
```css
/* NEVER */
* { outline: none; }
button:focus { outline: none; }

/* DO THIS */
*:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
  border-radius: 4px;
}
```

### ❌ Instant State Changes
No transition on hover or state change. Colors/sizes snap abruptly.
**Fix**: `transition: all 0.15s ease` minimum on interactive elements.
More precisely: `transition: background-color 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease, color 0.15s ease;`

### ❌ Overusing `transition: all`
`all` includes layout properties and causes jank on resize/scroll.
**Fix**: Always specify which properties transition.

### ❌ No Loading States
Clicking a button that triggers an async action shows nothing — no spinner, no disabled state, no feedback.
**Fix**: Buttons go into a loading state immediately: disabled + spinner icon (or animated dots).

### ❌ Spinning Circle for Everything
Every loading state is a gray `<div class="spinner">`. No context. No joy.
**Fix**: Match loading to content: skeleton for content, dots for AI/generation, progress bar for upload/download.

---

## React / Component Anti-Patterns

### ❌ Default shadcn/ui Without Customization
Shipping the default slate-colored shadcn theme verbatim.
Everyone's seen it. It's a starting point, not a product.
**Fix**: At minimum, override CSS variables for brand colors, fonts, and border-radius. Better: redesign every component token.

### ❌ `className` soup
Hundreds of Tailwind classes in a single element with no organization.
**Fix**: Use `cva` (class-variance-authority) for component variants. Extract complex class combinations to named components.

### ❌ Hardcoded Dimensions
`width: 327px`, `height: 213px` — fixed pixel dimensions everywhere.
**Fix**: Use `%`, `rem`, `ch`, `fr`, `clamp()`. Never hardcode widths.

### ❌ The God Component
A 500-line React component that renders an entire page section.
**Fix**: Decompose. Each component does one thing. Props drive variants.

### ❌ Missing Keys in Lists
```jsx
// NEVER
items.map((item) => <Card>{item.name}</Card>)

// Always
items.map((item) => <Card key={item.id}>{item.name}</Card>)
```

---

## Content Anti-Patterns

### ❌ Lorem Ipsum
Placeholder text in a "finished" UI makes it impossible to evaluate hierarchy and real-world behavior.
**Fix**: Write real copy. 5 minutes of writing reveals 30 minutes of layout problems.

### ❌ Generic Icon Set Without Customization
Every icon from Heroicons/Lucide at the default size with no sizing, color, or styling consideration.
**Fix**: Size icons intentionally relative to adjacent text. Use `currentColor` for color inheritance.

### ❌ Placeholder Images
Gray boxes where images should be. Or stock photos that don't match the context.
**Fix**: Use beautiful gradient placeholders, or design the empty/loading state as part of the product.

### ❌ "Get Started" / "Learn More" / "Click Here"
Generic CTA copy that communicates nothing about what happens next.
**Fix**: CTAs should state the specific action and value: "Start your first project →", "See pricing", "Connect your GitHub"

---

## The Smell Test

Before shipping, ask:

1. Could this design be for ANY product? → If yes, it's too generic
2. Does every component look the same (same radius, same shadow, same color)? → Vary them intentionally  
3. Does it feel like it was made by a human who cares? → If not, refine
4. Would you be proud to put your name on it? → If not, keep going
