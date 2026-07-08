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
- Tailwind CSS for styling
- `@zxing/browser` for in-site barcode scanning
- Open Food Facts public API as the data source

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

## Roadmap ideas

- Side-by-side product comparison of nutrition and scores
- Personalized dietary filters (allergens, vegan, keto, and more)
- Saved lists and favorites
- Deeper browse experiences by category, label, and region
