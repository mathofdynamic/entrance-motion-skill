# Reusable entrance-motion implementation prompt

> The installable Agent Skill is [`skills/entrance-motion/SKILL.md`](skills/entrance-motion/SKILL.md). This file remains the long-form source brief.

Implement a polished, production-quality entrance-motion system across the entire project and every relevant page.

The goal is a calm, premium, motion-graphics-quality reveal that improves hierarchy without delaying usability, causing layout shifts, or creating visual glitches.

First audit the existing frontend, typography loading, page structure, and motion code. Reuse the current architecture where possible. Do not add multiple competing animation systems.

## Motion model

Use these exact defaults:

- Animation duration: `100ms`
- Easing: `cubic-bezier(.16, 1, .3, 1)`
- Animation properties: opacity and transform only
- Initial transform: `translate3d(0, 20px, 0)`
- Final transform: `translate3d(0, 0, 0)`
- Inter-item waiting gap: `0ms`
- Next-item start time: one-third of the current item’s duration

With a `100ms` duration, the next item should begin approximately `33ms` after the current item starts.

This means items intentionally overlap during their final two-thirds, creating a continuous, fluid sequence.

Do not wait for the previous item to finish before starting the next item.

Do not animate an entire section simultaneously.

## Sequential appearance

Within each section:

- Animate items in deterministic DOM order.
- Start the first item.
- Start the next item after `duration / 3`.
- Continue the same cadence for every following item.
- Preserve the order even when multiple sections become visible.
- Do not use arbitrary per-element delays.
- Do not use a separate hard-coded delay for every page.

The sequence should feel continuous, not mechanical or rushed.

## Page initialization

Do not add a loading screen, spinner, artificial blank page, or arbitrary `500ms` waiting period.

Do not reveal unstyled content and then animate it after fonts or CSS change the layout.

Before motion begins:

- Core CSS must be available.
- The intended font must be applied where possible.
- The layout must have settled enough to avoid a visible font/layout jump.
- Initialize the motion state atomically.
- Use a short browser-paint synchronization technique such as a double `requestAnimationFrame`.
- Do not block the page indefinitely waiting for optional resources.
- If motion setup fails, content must remain visible and usable.

The page should not visibly flash, jump, or show a partially styled version before the animation begins.

## Scroll-triggered sections

Use `IntersectionObserver` or the project’s equivalent.

A section should enter the queue only when it becomes meaningfully visible in the viewport.

Sections below the viewport must not animate prematurely.

Use a small threshold and a conservative root margin so the animation begins shortly before or as the section becomes visible.

Once a section has been triggered:

- Mark it as seen.
- Stop observing it.
- Never replay its animation.
- Keep all revealed items visible and static when the user scrolls away and returns.

## Page coverage

Apply the same motion system consistently to:

- Homepage sections
- Document lists
- Document reading sections
- API documentation
- Endpoint reference pages
- Search results
- Visual/media grids
- Changes pages
- Empty states
- Error states
- Related-content sections
- Relevant navigation and content groups

Do not animate every tiny nested element. Animate meaningful visual units such as:

- Page headers
- Section headings
- Cards
- List rows
- Toolbars
- Article sections
- Tables
- Callouts
- Media items
- Action groups

Use explicit opt-out support for elements that should remain static, such as:

```html
data-motion-ignore
```

## Implementation safety

Use a progressive-enhancement architecture:

- Content must remain available if JavaScript is disabled.
- Do not use `display: none` or remove content from the accessibility tree.
- Do not use motion to hide important information.
- Do not animate layout-affecting properties such as width, height, margin, padding, or position.
- Avoid layout shift.
- Use compositor-friendly `opacity` and `transform`.
- Use a bounded fallback timer if `transitionend` does not fire.
- Prevent duplicate queue entries.
- Prevent duplicate animation runs.
- Handle removed or dynamically inserted elements safely.

## Reduced motion

Respect:

```css
@media (prefers-reduced-motion: reduce)
```

When reduced motion is enabled:

- Do not use translate movement.
- Do not use staggered sequencing.
- Do not use long transitions.
- Reveal content immediately or with a very subtle opacity transition.
- Never leave content hidden because animation was disabled.

## Accessibility

Motion must not:

- Interfere with keyboard navigation
- Delay access to interactive content
- Trap focus
- Change reading order
- Hide content from screen readers
- Create unexpected scroll behavior

Focus states must remain visible.

The page must remain understandable without animation.

## Performance

Do not add a large animation library unless the existing project genuinely requires one.

Do not use:

- Animated backgrounds
- Particles
- Parallax
- Infinite loops
- Continuous scroll listeners for simple reveals
- Expensive per-frame calculations
- Unnecessary animation of large images
- Motion that causes repaint-heavy effects

Use one shared motion system with centralized timing and easing tokens.

Suggested CSS tokens:

```css
--motion-duration: 100ms;
--motion-gap: 0ms;
--motion-distance: 20px;
--motion-ease: cubic-bezier(.16, 1, .3, 1);
```

The stagger should be calculated from the duration:

```js
const motionLead = motionDuration / 3;
```

Do not hard-code `33ms` separately if the duration can be configured.

## Visual character

The final motion should feel:

- Smooth
- Fast at the beginning
- Gentle at the end
- Controlled
- Continuous
- Premium
- Quiet
- Intentional

Avoid:

- Bounce
- Overshoot
- Elastic effects
- Abrupt opacity changes
- Large movement distances
- Simultaneous section reveals
- Long pauses
- Mechanical delays
- Distracting motion

## Validation

After implementation:

1. Build the project.
2. Test the homepage and representative inner pages.
3. Check desktop and mobile layouts.
4. Check light and dark themes.
5. Check a long scrolling page.
6. Confirm sections trigger only when visible.
7. Confirm sections do not replay.
8. Confirm the next item begins at approximately one-third of the previous item’s duration.
9. Confirm no artificial loading screen appears.
10. Confirm no font/layout flash occurs before animation.
11. Confirm reduced-motion behavior.
12. Confirm no horizontal overflow.
13. Confirm no console errors.
14. Confirm content remains usable if JavaScript fails.

Do not claim the motion is complete until the actual rendered pages have been inspected.
