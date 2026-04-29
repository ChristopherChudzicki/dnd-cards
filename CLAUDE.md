# CLAUDE.md

Project-specific guidance for AI coding sessions on this repo. Read alongside `README.md`.

## Stack

- React 18 + TypeScript + Vite, TanStack Router + TanStack Query.
- `@supabase/supabase-js` for auth + persistence; no other backend code.
- Biome for lint + format. CSS modules for styling.
- Vitest + RTL + `@testing-library/user-event`. MSW for HTTP mocks. Fishery + faker for factories.

## Design system

See README's "Design system" section for the full picture. Short version:

- Tokens are defined in `src/index.css`. Component CSS references tokens; no inline hexes/rems in scope.
- Use `react-aria-components` for new interactive primitives. **No** emotion / styled-components / MUI / Tailwind / shadcn.
- Shared UI primitives live in `src/lib/ui/`. Prefer reusing them over hand-rolling new patterns.
- Cards (`src/cards/`) and `PrintView` are intentionally **not** token-driven — they target print dimensions in absolute units.

## Tests

- Prefer `getByRole(...)` over text/class selectors. React Aria primitives expose accurate ARIA roles.
- Factories pass no values they don't assert on. Don't write `factory.build({ name: "Foo" })` unless the test reads `name`.
- Tests sit next to the file they cover (`Foo.tsx` + `Foo.test.tsx`).

## Code

- Default to no comments. Add one only when the WHY is non-obvious (a hidden constraint, a workaround, behavior that would surprise a reader).
- Don't add features, refactors, or abstractions beyond what the task requires.
- Don't add error handling for cases that can't happen — trust internal code.
- Biome's formatter is authoritative — if it reformats your output, accept the reformatting.

## Working norms

- Ask before running `npm install`, `npm test`, `npm run dev`, or `npm run build` (unless already approved in the current task).
- Address review nits inline in the same task — don't accumulate a deferred cleanup pass.
- Don't use `git -C <path>` — run git from the working directory.
- Don't push or create PRs without explicit instruction.

## Off-limits without asking

- `src/cards/` — Card, AutoFitCard, ItemEditor (the in-card editor; distinct from the page-level `EditorView`).
- `src/views/PrintView.tsx` and `@page` rules.
- Database schema and RLS policies — changes go through `supabase/migrations`.
