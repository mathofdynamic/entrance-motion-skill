# Entrance Motion Skill

Portable Agent Skill instructions for implementing quiet, progressive frontend entrance motion across real products.

The package turns a motion brief into a reusable workflow for Codex, Claude Code, and other tools that support the open Agent Skills format. It guides an agent through an architecture audit, stable initialization, deterministic staggered reveals, viewport-triggered sections, reduced-motion behavior, accessibility safeguards, and rendered-page validation.

This repository ships instructions, not a runtime library. It does not add a framework, animation dependency, loading screen, or page-specific animation code.

## What it enforces

| Area | Default |
| --- | --- |
| Duration | `100ms` |
| Easing | `cubic-bezier(.16, 1, .3, 1)` |
| Movement | `translate3d(0, 20px, 0)` to `translate3d(0, 0, 0)` |
| Animated properties | `opacity` and `transform` only |
| Item cadence | `duration / 3`, approximately `33ms` at the default |
| Section trigger | `IntersectionObserver` or the project equivalent |
| Replay behavior | One reveal per section; revealed items stay static |
| Reduced motion | Immediate reveal without translation or stagger |
| Surface close | `66ms`, compact `8px` exit, no close stagger |

The timing is intentionally fast. The skill requires visual inspection because a successful build does not prove that motion is perceivable, stable, or accessible.

## Repository layout

```text
ENTRANCE_MOTION_PROMPT.md             Long-form source brief
skills/entrance-motion/                Canonical portable skill package
  SKILL.md
  agents/openai.yaml                   Optional Codex UI metadata
.agents/skills/entrance-motion/        Codex repository integration
.claude/skills/entrance-motion/        Claude Code repository integration
scripts/verify_skill_copies.py         Parity check for the integrations
examples/glasses-shop/                 Three-page before/after comparison fixture
```

The three `SKILL.md` files are deliberately kept identical. The canonical copy is under `skills/entrance-motion`; the `.agents` and `.claude` copies make a cloned repository discoverable by each host without requiring a custom installer.

## Install in Codex

### Use from a cloned repository

Codex scans `.agents/skills` in the repository tree. Clone this repository, then start Codex from the repository root or copy `.agents/skills/entrance-motion` into the project where the skill should apply.

Explicit invocation:

```text
$entrance-motion
```

### Install as a personal skill

Inside Codex, ask the built-in skill installer to install the canonical package from this repository:

```text
$skill-installer install https://github.com/mathofdynamic/entrance-motion-skill/tree/main/skills/entrance-motion
```

If the skill does not appear immediately, reload or restart Codex.

## Install in Claude Code

### Use from a cloned repository

Claude Code discovers project skills under `.claude/skills`. Clone this repository and start Claude Code from the repository root, or copy `.claude/skills/entrance-motion` into the target project.

Explicit invocation:

```text
/entrance-motion
```

### Install as a personal skill

Copy the canonical package to `~/.claude/skills/entrance-motion/` on macOS or Linux, or to the equivalent Claude personal-skills directory on Windows. Claude Code also supports project-local `.claude/skills/entrance-motion/` for repository-scoped use.

## Use it well

Invoke the skill when adding or repairing page or section entrance reveals in an existing frontend. The agent should first audit the project and reuse its architecture. It should inspect real routes after implementation and distinguish verified browser behavior from source-only validation.

Do not use this skill for loading screens, parallax, continuous decorative motion, or a full animation-system rewrite. Those are different design and engineering problems.

## Comparison fixture

[`examples/glasses-shop`](examples/glasses-shop) is a self-contained three-page Glasses Shop example for reviewing the contract before applying it to a real product. The `before` and `after` directories share the same HTML and CSS. Only the JavaScript motion layer differs.

```bash
cd examples/glasses-shop
python -m http.server 4173
```

Open [`before/`](http://localhost:4173/before/) and [`after/`](http://localhost:4173/after/) in separate tabs. Test the home, collection, and point-of-view pages, then open Search, Bag, Menu, and a product dialog. The after fixture also covers Escape, outside-click, focus return, reduced motion, collection filters, newsletter feedback, and reopening a surface while its close transition is still running.

Verify that the design remains identical:

```bash
python scripts/verify_glasses_shop_parity.py
```

## Validation

Run the repository parity check from the project root:

```bash
python scripts/verify_skill_copies.py
```

This repository contains no frontend application, so browser validation belongs to the target project where the skill is used.

## License

MIT. See [`LICENSE`](LICENSE).

## Source brief

The original long-form brief is available in [`ENTRANCE_MOTION_PROMPT.md`](ENTRANCE_MOTION_PROMPT.md). The installable skill is intentionally more compact so agents load the workflow without carrying a second copy of the same instructions.
