# Glasses Shop comparison fixture

Lucent is a small three-page eyewear studio used to exercise the `entrance-motion` skill.

The `before` and `after` folders use the same pages, styles, content, and controls. The only intentional difference is the JavaScript motion layer:

- `before/` reveals pages and transient surfaces immediately.
- `after/` adds viewport-triggered page reveals, staggered menu and popup entrances, compact close transitions, reduced-motion handling, and lifecycle-safe focus behavior.

The after fixture uses a `200ms` opening duration with a derived `66.667ms` item lead. Its compact exit remains `66ms`, so closing is intentionally faster than opening.

## Run locally

From this directory:

```bash
python -m http.server 4173
```

Open:

- `http://localhost:4173/before/`
- `http://localhost:4173/after/`

Use the same interactions in both versions:

- Menu, Search, and Bag in the header.
- `View frame` buttons on the collection page.
- Escape, outside click, and close buttons for every surface.
- Reopen a surface while it is closing.
- Collection filters and newsletter forms.

Resize the viewport and enable reduced motion in browser accessibility settings. The after version should keep content usable, reveal below-the-fold sections only as they approach the viewport, and close transient surfaces faster than they open.

## Parity check

From the repository root:

```bash
python scripts/verify_glasses_shop_parity.py
```

The check confirms that HTML and CSS are identical between the two fixtures. It also confirms that the only JavaScript difference is the expected motion-enabled implementation.

The product images use remote Unsplash URLs so the fixture stays small. A network connection is required to display the photography; layout and interaction testing still work without it.
