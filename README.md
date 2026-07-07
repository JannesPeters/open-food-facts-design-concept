# food-scanner-app

Mobile-first MVP for scanning grocery product barcodes, fetching product details from Open Food Facts, adding a local price, saving the result in the browser, and exporting saved items as CSV.

The app now also ships as an installable Progressive Web App, so it can be added to a phone home screen and launched like a native app.

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

## Installing on a phone

- **iPhone / iPad (Safari):** open the app, tap **Share**, then **Add to Home Screen**
- **Android (Chrome/Edge):** open the app and use **Install app** from the browser menu

Once installed, the app opens in standalone mode and keeps previously saved history available offline. Live barcode lookups still need a network connection.

## Available scripts

- `./scripts/install.sh` - install project dependencies
- `./scripts/run.sh` - start the app on `http://localhost:5173`
- `npm start` - start the Vite dev server on all interfaces
- `npm run dev` - start the Vite dev server
- `npm run build` - type-check and build for production
- `npm run lint` - run oxlint
- `npm run preview` - preview the production build

## Production deployment

Pushes to `main` deploy to Vercel through `.github/workflows/vercel-production.yml`.

Set these repository settings before the first run:

- Repository secret: `VERCEL_TOKEN`
- Repository variables: `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID`

The workflow targets the existing Vercel project `supbase-fsa`.

## Notes for the next iteration

- Add item editing and deletion in saved history
- Support multiple export formats and richer nutrient views
- Expand offline support beyond the app shell and cached product assets
