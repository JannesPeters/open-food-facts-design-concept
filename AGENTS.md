# Agent Guide

Guidance for AI agents and contributors working in this repository.

## Project

A modern, consumer-facing redesign of the Open Food Facts website. See `README.md` for the feature overview and `PRODUCT.md` for the product vision, users, and design principles. Follow `PRODUCT.md` when making product or UX decisions.

## Stack

- React 19 + TypeScript
- Vite for dev and production builds
- Tailwind CSS v4 for styling
- **shadcn/ui** as the design system (see below)
- `@zxing/browser` for in-site barcode scanning
- Open Food Facts public API as the data source

## Design system

The UI uses **shadcn/ui** — copy-in components, not an installed library. Config is in `components.json` (`new-york` style, non-RSC, TSX, base color `slate`, CSS variables).

- UI components live in `src/components/ui/` (button, card, input, textarea, select, separator, badge, label). Add new ones via the shadcn CLI or by matching the existing pattern — do not hand-roll ad-hoc equivalents. **When a shadcn component exists for a UI pattern (e.g., dialog, sheet, popover, dropdown, tabs), always use it instead of building a custom primitive.**
- Built on **Radix UI** primitives (the unified `radix-ui` package) for accessibility.
- Styling tokens are Tailwind CSS v4 CSS variables defined in `src/index.css`; prefer these tokens over hard-coded colors.
- Use the `cn()` helper (`@/lib/utils`, backed by `clsx` + `tailwind-merge`) for conditional classes and `class-variance-authority` for component variants.
- Icons come from `lucide-react`; animations from `tailwindcss-animate`.
- The `@/` alias maps to `src/`.

### Color system (important)

All colors are CSS variables in `src/index.css`, surfaced as semantic Tailwind utilities through `@theme inline`. **Never hard-code hex/rgb in components or CSS — always use the semantic tokens** so light/dark and future re-theming keep working.

- **Brand** is the Open Food Facts logo **orange** (`--primary` and `--brand` are both `#ff8c14`). Buttons use dark-brown text (`--primary-foreground`), not white, so the fill can stay the true logo orange and still pass contrast. Neutrals are warm brown. Do not reintroduce the old blue/green.
- **Semantic status** tokens: `success`, `warning`, `info`, `destructive` (each with `-foreground`, plus `-subtle`/`-strong` for tinted pills/badges — used by the legacy classes in `App.css`).
- **Food scores use ONE shared rating scale**, not per-score palettes: `rating-1` (best) … `rating-5` (worst), each with a `-foreground`. Map Nutri-Score A–E, Eco-Score A–E, and NOVA 1–4 onto these — never invent separate greens/reds per score.
- **Dark mode** works via `prefers-color-scheme` and an explicit `.dark`/`.light` class on `<html>` (a `@custom-variant dark` makes `dark:` utilities honor both). When adding styles, verify both themes; do not reintroduce literal colors that only look right in light mode.
- OFF is inspiration only — its palette is scattered and has no dark mode. Keep this system coherent: extend it by adding tokens in `src/index.css` (light block, `.dark` block, the `prefers-color-scheme` block, and a `@theme inline` mapping), not by hard-coding values. `src/index.css` is the single source of truth for design tokens.

## Open Food Facts API

The app's data comes from the public Open Food Facts (OFF) API. **Read and follow OFF's official guidelines before adding or changing any feature that calls their API.** Key references:

- [API documentation home](https://openfoodfacts.github.io/openfoodfacts-server/api/) — start here; read it fully before integrating.
- [Rate limits & how to best use the API](https://openfoodfacts.github.io/openfoodfacts-server/api/#rate-limits)
- [Reference: API v2](https://openfoodfacts.github.io/openfoodfacts-server/api/ref-v2/) and [v3](https://openfoodfacts.github.io/openfoodfacts-server/api/ref-v3/)
- [Authentication](https://openfoodfacts.github.io/openfoodfacts-server/api/#authentication) (needed only for **write** operations, not reads)
- [Terms of use and reuse](https://world.openfoodfacts.org/terms-of-use) and the [data page / bulk exports](https://world.openfoodfacts.org/data)

Rules to respect when building against the API:

- **Honor the rate limits.** OFF enforces ~15 req/min/IP for product reads (`GET /api/v*/product`) and ~10 req/min/IP for search (`GET /api/v*/search`), plus a global anti-crawl cap that returns **HTTP 503** under load. Never wire the API to a search-as-you-type / per-keystroke flow — search on submit only.
- **Degrade gracefully on throttling.** All API calls go through `src/lib/openFoodFacts.ts`, which adds retry-with-backoff and a stale cache (in-memory + `localStorage`). Reuse these helpers (`fetchJsonWithRetry`, the cache, `searchProducts`, `fetchProductDetails`) for any new endpoint rather than calling `fetch` directly, so new features inherit the same resilience.
- **Identify the app with a descriptive `User-Agent`.** Browsers can't set it, so the Vite dev proxy (`/__openfoodfacts` in `vite.config.ts`) adds one; keep it accurate. Any server-side/proxy path to OFF must send a descriptive UA too.
- **Request only the `fields` you need** and prefer the current API version for new integrations (v2 still works but is deprecated in favor of v3).
- **For bulk needs**, don't hammer the live API — OFF asks reusers to use the CSV/JSONL exports instead.
- **Attribution:** OFF data is under the Open Database License; keep the existing "not affiliated with / endorsed by Open Food Facts" attribution intact.

## Common commands

- `npm run dev` - start the Vite dev server
- `npm run build` - type-check (`tsc -b`) and build for production
- `npm run lint` - run oxlint
- `npm run preview` - preview the production build

## Vercel deployment

- This repo deploys to its own dedicated Vercel project named **`open-food-facts-design-concept`** — the same name as the GitHub repository — served at `open-food-facts-design-concept.vercel.app`.
- **Deployment uses Vercel's native Git integration, not GitHub Actions.** There is no deploy workflow in `.github/workflows/` and none should be added. Vercel builds and deploys directly from the connected Git repo.
  - Pushes to `main` produce production deployments; pull requests get preview deployments.
- No Vercel secrets or repository variables (`VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`) are needed for CI, since deployment does not run in GitHub Actions.
- Keep the production alias aligned with the project name so the URL stays predictable (`open-food-facts-design-concept.vercel.app`).
- Remember that changing an alias does **not** change the Vercel project name, dashboard identity, or autogenerated deployment hostname.
- Do **not** rename or replace the `open-food-facts-design-concept` project, or reconnect it to a different repo, without explicit user confirmation.

## PR workflow

- Keep deployment/configuration fixes separate from feature work when practical. If a feature PR is already merged, open a new PR for deployment or agent-guidance follow-up changes.
- When changing repo-level agent guidance, update this file (`AGENTS.md`) in the same change set as the operational fix whenever possible.
