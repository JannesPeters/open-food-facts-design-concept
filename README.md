# open-food-facts-redesign

A modern, consumer-facing redesign of the Open Food Facts website. The goal is a fast, clean product-discovery experience: search and browse the open food database, view rich product pages with health and environmental scoring, and scan barcodes right from the site to jump straight to a product.

This project is a design and functionality concept built on top of the public Open Food Facts data. It reimagines the front-end experience while keeping the open, transparent spirit of the underlying database.

## Vision

Open Food Facts holds one of the largest open databases of food products in the world, but the experience of exploring it can feel dense and dated. This redesign focuses on the everyday shopper: someone who wants to quickly find a product, understand how healthy and sustainable it is, and compare options with confidence.

## Core features

- **Search & browse** the Open Food Facts catalog by name, brand, category, and label
- **Product pages** with a clear, scannable layout for ingredients, nutrition, quantity, serving size, allergens, categories, and labels
- **Scoring at a glance** — Nutri-Score, NOVA group, and Eco-Score presented visually so quality and impact are obvious
- **In-site barcode scanning** — use the device camera to scan a product barcode and open its page directly, with manual barcode entry as a fallback
- **Fresh, accessible design** — a modern visual language that is fast, readable, and mobile-first
- **Graceful handling** of missing or incomplete product data

## Stack

- React 19 + TypeScript
- Vite for local development and production builds
- Tailwind CSS v4 for styling
- **shadcn/ui** as the design system (see below)
- `@zxing/browser` for in-site barcode scanning
- Open Food Facts public API as the data source

## Design system

The UI is built with **shadcn/ui** — copy-in React components rather than an installed component package. Configuration lives in `components.json`.

- **Style:** `new-york`, non-RSC, TSX components
- **Components:** live in `src/components/ui/` (button, card, input, textarea, select, separator, badge, label). Add new ones with the shadcn CLI or by following the same pattern.
- **Primitives:** [Radix UI](https://www.radix-ui.com/) (`@radix-ui/react-*`) provide the accessible behavior under the hood.
- **Styling tokens:** Tailwind CSS v4 with CSS variables (base color **slate**), defined in `src/index.css`.
- **Variants & class merging:** `class-variance-authority` for component variants, plus the `cn()` helper (`clsx` + `tailwind-merge`) in `src/lib/utils.ts`.
- **Animations:** `tailwindcss-animate`.
- **Icons:** `lucide-react`.
- **Alias:** `@/` maps to `src/` (e.g. `@/components/ui/button`, `@/lib/utils`).

### Color system

Colors are defined once as CSS variables in `src/index.css` and exposed as semantic Tailwind utilities via `@theme inline`. **Always use the semantic utilities — never hard-code hex values in components.**

- **Brand:** the exact Open Food Facts logo **orange** (`--primary` = `--brand` = `#ff8c14`). Buttons use dark-brown text on the orange (passes WCAG AAA; white would fail contrast). Warm brown neutrals echo the OFF wordmark.
- **Surfaces & text:** `background`/`foreground`, `card`, `popover`, `muted`/`muted-foreground`, `secondary`, `accent`, `border`, `input`, `ring`.
- **Status:** `success`, `warning`, `info`, and `destructive` — each with a `-foreground` pair (plus `-subtle` / `-strong` variables for tinted badges).
- **Food-score rating scale:** a single, shared 5-step palette — `bg-rating-1` (best) … `bg-rating-5` (worst), each with a matching `-foreground`. **Nutri-Score, NOVA, and Eco-Score all map onto this one scale** rather than each having its own colors.
- **Dark mode:** fully supported. It activates automatically from the OS preference (`prefers-color-scheme`) and can be forced with a `.dark` (or `.light`) class on `<html>`. The rating scale stays consistent across themes so grades remain recognizable.

The Open Food Facts site was the *inspiration* only — its palette is inconsistent and has no dark mode. This system deliberately improves on it with a single coherent token set and first-class theming.

## Getting started

```bash
./scripts/install.sh
./scripts/run.sh
```

Open the local URL in a desktop or mobile browser. The barcode scanner needs camera access, which works on `localhost` during development.

## Available scripts

- `./scripts/install.sh` - install project dependencies
- `./scripts/run.sh` - start the app on `http://localhost:5173`
- `npm start` - start the Vite dev server on all interfaces
- `npm run dev` - start the Vite dev server
- `npm run build` - type-check and build for production
- `npm run lint` - run oxlint
- `npm run preview` - preview the production build

## Production deployment

Deployment is handled by Vercel's native Git integration. The repository is connected to the Vercel project `open-food-facts-design-concept` (named to match this repo), served at [`open-food-facts-design-concept.vercel.app`](https://open-food-facts-design-concept.vercel.app).

- Pushes to `main` trigger a production deployment automatically.
- Pull requests get their own preview deployments.

No GitHub Actions workflow or Vercel secrets/variables are required in this repo — Vercel builds and deploys directly from the connected Git repository.

## Data & attribution

Product data comes from [Open Food Facts](https://world.openfoodfacts.org/), a collaborative, open database made available under the Open Database License. This project is an independent design concept and is not affiliated with or endorsed by Open Food Facts.

### Working with the Open Food Facts API

If you build features on top of the OFF API, please read and follow their official guidelines first:

- [API documentation](https://openfoodfacts.github.io/openfoodfacts-server/api/) (read it fully before integrating)
- [Rate limits & how to best use the API](https://openfoodfacts.github.io/openfoodfacts-server/api/#rate-limits)
- [API reference — v2](https://openfoodfacts.github.io/openfoodfacts-server/api/ref-v2/) · [v3](https://openfoodfacts.github.io/openfoodfacts-server/api/ref-v3/)
- [Terms of use and reuse](https://world.openfoodfacts.org/terms-of-use) · [data page / bulk exports](https://world.openfoodfacts.org/data)

In practice this means: respect OFF's rate limits (≈15 req/min/IP for product reads, ≈10 req/min/IP for search, plus a global cap that returns HTTP 503 under load), never call the API on every keystroke, request only the `fields` you need, and identify the app with a descriptive `User-Agent`. All API access is centralized in `src/lib/openFoodFacts.ts`, which adds retry-with-backoff and a stale cache so the app stays usable while OFF is throttling — reuse those helpers for new endpoints instead of calling `fetch` directly. For contributor guidance, see [`AGENTS.md`](AGENTS.md).

## Roadmap ideas

- Side-by-side product comparison of nutrition and scores
- Personalized dietary filters (allergens, vegan, keto, and more)
- Saved lists and favorites
- Deeper browse experiences by category, label, and region
