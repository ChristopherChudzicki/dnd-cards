# D&D Cards

A browser app for creating and printing **D&D 5e item cards** with a legibility-first design.

## Run locally

```bash
npm install
npm run dev
```

Then open http://localhost:5173.

## Scripts

- `npm run dev` — start Vite dev server
- `npm run build` — production build to `dist/`
- `npm run preview` — preview the production build
- `npm test` — run Vitest suite
- `npm run lint` — Biome lint + format check
- `npm run lint:fix` — auto-fix lint + format

## How to print

1. Create cards at `/` and `/editor/:id`.
2. Go to `/print`.
3. Choose 2 or 4 cards per page.
4. Click **Print**. In the browser print dialog, set **Margins: None** and uncheck **Headers and footers** for a tight fit.

## Project docs

- Design: [`docs/superpowers/specs/2026-04-19-dnd-cards-design.md`](docs/superpowers/specs/2026-04-19-dnd-cards-design.md)
- Implementation plan: [`docs/superpowers/plans/2026-04-19-dnd-cards-v1.md`](docs/superpowers/plans/2026-04-19-dnd-cards-v1.md)

Deck data lives in `localStorage` under the key `dnd-cards:deck:v1`. You can also **Import JSON / Export JSON** from the deck view.
