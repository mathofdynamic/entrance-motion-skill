---
name: entrance-motion
description: Implement or audit calm, progressive frontend entrance motion across pages and sections with stable initialization, deterministic stagger, reduced-motion support, and rendered-page validation. Use when adding or repairing page or section reveals; do not use for loading screens, parallax, continuous decorative motion, or a full animation-system replacement.
---

# Entrance Motion

Use this skill to add or repair a shared entrance-motion system in an existing frontend. Preserve the project’s architecture and existing motion primitives where they are sound. Do not create competing animation systems for individual pages.

## Boundaries

- Do not add a loading screen, spinner, artificial blank state, arbitrary wait, or font-blocking gate.
- Do not use this skill for parallax, animated backgrounds, particles, infinite loops, hover-only effects, or continuous scroll-linked motion.
- Do not hide content from assistive technology or make JavaScript a requirement for reading the page.
- Do not add a motion library unless the project already uses one or the implementation has a clear, measured need.
- Treat the defaults below as the contract. Deviate only for a documented project constraint, accessibility requirement, or verified rendering problem.

## 1. Audit before editing

Inspect the frontend before choosing an implementation point:

- Identify the framework, rendering mode, hydration boundary, route structure, CSS entrypoints, theme system, and font-loading behavior.
- Find existing transitions, animation libraries, `IntersectionObserver` usage, global layout wrappers, and page or section primitives.
- Check whether the app already has a reveal or visibility state. Extend one coherent system where possible.
- Record representative routes: a home page, an inner/content page, a long page, a list or grid, and an empty or error state when they exist.
- Keep the change local to the motion system and its integration points. Do not rewrite unrelated layout or styling.

## 2. Apply the motion contract

Centralize these tokens so the stagger is derived from the duration rather than copied as page-specific numbers:

| Token | Default |
| --- | --- |
| Duration | `100ms` |
| Easing | `cubic-bezier(.16, 1, .3, 1)` |
| Properties | `opacity`, `transform` only |
| Initial transform | `translate3d(0, 20px, 0)` |
| Final transform | `translate3d(0, 0, 0)` |
| Inter-item gap | `0ms` |
| Lead between item starts | `duration / 3` (`about 33ms` at the default) |

The next item starts after one-third of the current item’s duration. Items overlap intentionally; never wait for the previous item to finish. Do not hard-code `33ms` when the duration is configurable.

Animate meaningful visual units in deterministic DOM order, such as page headers, section headings, cards, rows, toolbars, article sections, tables, callouts, media items, and action groups. Do not animate every nested label, icon, or wrapper. Provide an explicit opt-out such as `data-motion-ignore` for static or sensitive content.

## 3. Initialize progressively

Content must remain visible and usable when JavaScript fails or is disabled.

- Keep content visible by default. Apply hidden initial styles only behind a JavaScript-confirmed motion-enabled state; never ship a CSS rule that permanently hides content without that gate.
- Ensure core CSS is loaded, the intended font is applied where possible, and layout has settled enough to avoid a font or geometry jump.
- Initialize the motion state atomically and synchronize the first reveal with a short browser-paint technique such as a double `requestAnimationFrame`.
- Do not wait indefinitely for optional fonts, images, data, or network resources. If setup fails, reveal content immediately.
- In SSR or hydrated apps, avoid browser-only APIs during server rendering and prevent hydration mismatches.

Use opacity and transform only for the reveal. Do not animate width, height, margin, padding, layout position, or other layout-affecting properties. Do not use `display: none` to stage content.

## 4. Queue sections on visibility

Use `IntersectionObserver` or the project’s equivalent so below-the-fold sections do not animate at page load.

- Trigger only when a section is meaningfully entering the viewport. Use a small threshold and a conservative root margin appropriate to the layout.
- Register each section once. When it enters the queue, mark it seen, stop observing it, and never replay it when the user scrolls away and returns.
- Sequence items in DOM order. If multiple visibility callbacks arrive together, resolve their order from document order rather than callback order.
- Prevent duplicate queue entries and duplicate animation runs with explicit state, not timing assumptions.
- Handle removed nodes and dynamically inserted content without throwing or replaying already-revealed content. Add mutation observation only when the application actually inserts motion-marked content after initialization.
- Use a bounded fallback timer for any completion path that otherwise depends on `transitionend`.

Do not animate an entire section as one simultaneous block. A section is a trigger boundary; its meaningful children use the shared cadence.

## 5. Respect reduced motion and accessibility

Implement and test `prefers-reduced-motion: reduce`.

- Remove translation and staggered sequencing.
- Reveal content immediately, or use only a very short, subtle opacity transition.
- Never leave an item hidden because motion was disabled.
- Keep keyboard navigation, focus visibility, reading order, screen-reader access, and scroll behavior unchanged.
- Do not delay access to interactive controls or use motion to hide important information.
- If the preference changes during a session, reconcile pending and future items safely.

## 6. Validate the rendered result

Run the project’s relevant checks, then inspect actual rendered pages. Do not claim completion from a build or static source review alone.

At minimum, verify:

1. The project builds and its existing checks pass.
2. The homepage and representative inner pages render without console errors.
3. Desktop, mobile, light, and dark states remain usable where supported.
4. Long pages do not animate below-the-fold sections prematurely.
5. Each section reveals once and stays revealed when revisited.
6. The next item begins at approximately one-third of the previous item’s duration.
7. No loading screen, artificial blank interval, font/layout flash, horizontal overflow, or layout shift was introduced.
8. Reduced-motion mode reveals content immediately without translation or stagger.
9. Content remains available when motion setup is disabled or JavaScript fails.

If browser inspection, a target route, or a required environment is unavailable, report that boundary explicitly instead of calling the motion production-verified.

## Handoff

Report the motion entrypoint, integration points, validation commands, routes and states actually inspected, and any unresolved browser or accessibility limitations. Keep the shared timing tokens and the rendered-page evidence easy for the next engineer to find.
