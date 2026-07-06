# food-scanner-app

Mobile-first MVP for scanning grocery product barcodes, fetching product details from Open Food Facts, adding a local price, saving the result in the browser, and exporting saved items as CSV.

## MVP features

- Camera-based barcode scanning in the browser
- Manual barcode entry fallback
- Open Food Facts lookup for product name, ingredients, image, key nutrients, Nutri-Score, NOVA group, quantity, serving size, allergens, categories, and labels
- Editable price before saving
- IndexedDB-backed local persistence across reloads and browser restarts on the same device
- Saved history view
- CSV export for all locally saved records
- Graceful handling when Open Food Facts has missing or no product data

## Stack

- React 19 + TypeScript
- Vite for local development and production builds
- `@zxing/browser` for barcode scanning
- `idb` for IndexedDB persistence

## Getting started

```bash
./scripts/install.sh
./scripts/run.sh
```

Open the local URL in a mobile browser or a desktop browser that supports camera access. Camera permissions work on `localhost` during development.

## Available scripts

- `./scripts/install.sh` - install project dependencies
- `./scripts/run.sh` - start the app on `http://localhost:5173`
- `npm start` - start the Vite dev server on all interfaces
- `npm run dev` - start the Vite dev server
- `npm run build` - type-check and build for production
- `npm run lint` - run oxlint
- `npm run preview` - preview the production build

## Notes for the next iteration

- Add item editing and deletion in saved history
- Support multiple export formats and richer nutrient views
- Improve offline resilience with a service worker and installable PWA behavior
