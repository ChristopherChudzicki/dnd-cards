# UI refinement — design

Status: draft
Date: 2026-04-29
Branch: `cc/ui-improvements`

## Goals

Refine the chrome around the cards (header, login, deck/home/editor views, browse-from-API dialog) so the app reads as a polished, accessibility-correct D&D card maker. Three named issues from the screenshots in `.superpowers/user_notes/` must be fixed:

1. **Username alignment** in the global header.
2. **OAuth provider buttons** styled appropriately per provider.
3. **Browse-from-API dialog height** jumps as results filter; modal must hold a stable size.

The bar is readability and accessibility first; D&D theme is a subtle layer on top.

## Non-goals

- The `<Card>` component, its CSS, and `PrintView` are out of scope. No changes to print rules, card layout, card typography, or the `@page` size. Cards continue to use absolute units (px / in) because they target physical print dimensions.
- No data-model, query, mutation, or routing changes.
- No styled-components, emotion, MUI, Tailwind, or shadcn. CSS modules remain the only styling mechanism.
- No new user-facing features beyond the dialog/header behavior described here.

## Decisions captured during brainstorming

| Axis | Choice |
| --- | --- |
| Pass scope | Broader visual refinement (option C), excluding cards/print |
| Headless library | React Aria Components |
| Theme intensity | B — subtle fantasy: Cinzel display headings, Inter body, parchment-tinted backgrounds, burgundy accent |
| OAuth button treatment | B — visually matched (white/outlined for both providers, only logos differ) |
| Header treatment | B — avatar/initial button on the right with a dropdown menu |
| Tokens | Centralized CSS custom properties in `src/index.css` |
| Font hosting | Self-hosted via `@fontsource-variable/inter` and `@fontsource/cinzel` |

## In scope

- `src/app/Root.tsx` and `src/app/root.module.css` — header redesign, user menu integration.
- `src/auth/LoginView.tsx` and `src/auth/LoginView.module.css` — OAuth button rework, page layout.
- `src/views/HomeView.tsx`, `HomeView.module.css` — deck list rows, empty state, header chrome.
- `src/views/DeckView.tsx`, `DeckView.module.css` — header (title + rename + action cluster), card list rows.
- `src/views/EditorView.tsx`, `EditorView.module.css` — token application + shared `<Button>` swap, no structural changes.
- `src/views/BrowseApiModal.tsx`, `BrowseApiModal.module.css` — replace ad-hoc dialog with React Aria primitives; fix the height-jump bug; convert ruleset toggle to `ToggleButtonGroup`.
- `src/index.css` — design tokens, font-face imports, base styles.
- New: `src/lib/ui/` directory housing shared accessible components: `Button.tsx`, `IconButton.tsx`, `OAuthButton.tsx`, `UserMenu.tsx`, plus an `icons/` subdirectory for inline brand SVGs.
- `package.json` — add `react-aria-components`, `@fontsource-variable/inter`, `@fontsource/cinzel`.
- Tests: update existing tests where label/role queries change, add new tests for new components.

## Out of scope

- `src/cards/Card.tsx`, `Card.module.css`, `AutoFitCard.tsx`, `AutoFitCard.test.tsx`, `ItemEditor.tsx` (the in-card editor — note: this is distinct from the page-level `EditorView`), `ItemEditor.module.css`, `iconRules.ts`, and any `factories.ts` under `src/cards/`.
- `src/views/PrintView.tsx` and `PrintView.module.css`.
- The `@page` rule and any `@media print` blocks except where Root needs to hide the new header (existing behavior preserved).

## Architecture

### Token system (`src/index.css`)

A single `:root` declaration exposes the design system. CSS modules reference these tokens; no hardcoded color, font, or spacing values may live in component CSS modules within scope. (Out-of-scope files are left alone.)

```css
:root {
  /* Color — surfaces */
  --color-bg:        #faf7f2;
  --color-surface:   #fffdf8;
  --color-surface-2: #f3ece0;

  /* Color — ink */
  --color-text:        #1a1410;
  --color-text-muted:  #6a5a45;
  --color-text-faint:  #8a7a65;

  /* Color — borders & accent */
  --color-border:        #d9cfc1;
  --color-border-strong: #b8a888;
  --color-accent:        #7a3530;
  --color-accent-fg:     #ffffff;
  --color-danger:        #8a3030;
  --color-focus-ring:    #7a3530;

  /* Typography */
  --font-display: "Cinzel", "EB Garamond", Georgia, serif;
  --font-body:    "Inter Variable", "Inter", system-ui, -apple-system, "Segoe UI", sans-serif;

  --fs-xs: 0.8rem;
  --fs-sm: 0.875rem;
  --fs-md: 1rem;
  --fs-lg: 1.125rem;
  --fs-xl: 1.5rem;
  --fs-2xl: 2rem;

  --lh-tight: 1.2;
  --lh-body: 1.5;

  /* Space, radius, shadow */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-5: 1.5rem;
  --space-6: 2rem;

  --radius-sm: 0.25rem;
  --radius-md: 0.4rem;
  --radius-lg: 0.75rem;

  --shadow-sm: 0 1px 2px rgba(26, 20, 16, 0.06);
  --shadow-md: 0 4px 16px rgba(26, 20, 16, 0.08);
  --shadow-lg: 0 16px 40px rgba(26, 20, 16, 0.18);
}

body {
  background: var(--color-bg);
  color: var(--color-text);
  font-family: var(--font-body);
  font-size: var(--fs-md);
  line-height: var(--lh-body);
}

h1, h2, h3 {
  font-family: var(--font-display);
  line-height: var(--lh-tight);
}
```

`html` font-size is **not** overridden, so 1rem == the user's browser default (typically 16px). This preserves browser-level accessibility scaling.

Contrast targets (verified during implementation):

- `--color-text` on `--color-bg`: ≥ AAA for normal text.
- `--color-text-muted` on `--color-surface`: ≥ AA for normal text.
- `--color-accent` (white foreground) and `--color-accent-fg` on `--color-accent`: ≥ AA.

### Fonts

Inter (variable) and Cinzel are self-hosted via `@fontsource-variable/inter` and `@fontsource/cinzel`. Both are imported once from `src/main.tsx`:

```ts
import "@fontsource-variable/inter";
import "@fontsource/cinzel/500.css";
import "@fontsource/cinzel/600.css";
```

Inter handles all body text. Cinzel is used only for `h1`–`h3`, the brand wordmark, and the avatar initial. EB Garamond and Georgia stay as fallback.

### Shared UI primitives (`src/lib/ui/`)

Each component wraps a React Aria primitive with a project-specific CSS module. None of them ship a global stylesheet — each is a single component + module pair.

| File | Role |
| --- | --- |
| `Button.tsx` / `Button.module.css` | General-purpose button. Wraps `react-aria-components` `Button`. Variants: `primary`, `secondary`, `danger`. Sizes: `sm`, `md`. Variant selection via `data-variant` attribute on the rendered element. |
| `IconButton.tsx` / `IconButton.module.css` | Square button for icon-only affordances; requires `aria-label`. Variants share `Button` styling but with equal padding. |
| `OAuthButton.tsx` / `OAuthButton.module.css` | Provider-specific sign-in button. `provider: "google" \| "github" \| "dev"` and `onPress`. Renders the brand SVG + label. White background, neutral border, brand logo only — visually matched per the chosen treatment. Dev variant gets a dashed border. |
| `UserMenu.tsx` / `UserMenu.module.css` | Right-aligned account control. When unauthenticated: a `<Link to="/login">Sign in</Link>`. When authenticated: a circular `MenuTrigger` button showing the user's first initial; opens a `Popover` containing a non-interactive header with the full email and a `MenuItem` "Sign out". |
| `icons/GoogleLogo.tsx`, `icons/GitHubLogo.tsx` | Inline SVG components, `aria-hidden`, brand colors preserved. |
| `icons/PencilIcon.tsx`, `icons/TrashIcon.tsx` | Generic stroke icons used by `IconButton` consumers. Width and color inherit (`width: 1em`, `stroke: currentColor`). |

`Button` and `IconButton` use React Aria's `data-focus-visible` attribute for the focus ring (no `:focus-visible` selector chasing). Disabled state uses `data-disabled`. Hover uses `data-hovered`.

### `Root.tsx` (header)

```tsx
<div className={styles.shell}>
  <header className={styles.header}>
    <Link to="/" className={styles.brand}>D&amp;D Cards</Link>
    <nav aria-label="Primary" className={styles.nav}>
      <Link to="/" className={styles.link} activeProps={{ className: styles.active }}>
        Decks
      </Link>
    </nav>
    <UserMenu />
  </header>
  <main className={styles.main}>
    <Outlet />
  </main>
</div>
```

The header uses `display: flex; align-items: center; gap: var(--space-5);`. `UserMenu` carries `margin-left: auto` so the cluster always pins right — this is the alignment fix. Existing `@media print { .header { display: none } }` is preserved.

### `LoginView.tsx`

```tsx
<section className={styles.login} aria-labelledby="signin-heading">
  <h1 id="signin-heading">Sign in</h1>
  <p>Sign in to create and edit decks. Anyone can view shared decks via link.</p>
  <ul className={styles.providers} role="list">
    <li><OAuthButton provider="google" onPress={() => signIn("google")} /></li>
    <li><OAuthButton provider="github" onPress={() => signIn("github")} /></li>
    {import.meta.env.DEV && (
      <li><OAuthButton provider="dev" onPress={devSignIn} /></li>
    )}
  </ul>
</section>
```

Layout: `max-width: 28rem; margin: var(--space-6) auto;`. The `<p>` gets explicit `font-size: var(--fs-md); color: var(--color-text-muted);` to fix the over-large body text seen in the current screenshot. Buttons stack vertically with `--space-3` gap.

### `BrowseApiModal.tsx`

Wraps the existing logic (search query state, filtered list, ruleset state, pick/save flow) in React Aria's `ModalOverlay` + `Modal` + `Dialog`. The component signature (`deckId`, `onClose`, `onSelected`) does not change.

Structural mapping:

- `<ModalOverlay isOpen isDismissable onOpenChange={(open) => !open && onClose()}>` provides the backdrop, scroll lock, click-outside-to-dismiss, and Escape handling.
- `<Modal>` is the focus-trap container; `<Dialog aria-label="Browse magic items">` is the dialog landmark.
- Header keeps the title + ruleset toggle + close button. Ruleset toggle becomes a `<ToggleButtonGroup selectionMode="single" selectedKeys={[ruleset]}>` with two `<ToggleButton id="2014">` / `<ToggleButton id="2024">` children; the existing `ruleset` state is the source of truth.
- Search input becomes a React Aria `<TextField>` containing an `<Input type="search">`. The dialog's initial focus is delegated to the search input (React Aria auto-focuses the first focusable element in a Dialog by default; if the heuristic doesn't land on the input we set `autoFocus` explicitly).
- Result rows remain individual `<button>` elements; React Aria does not require a `ListBox` here — only one is "selected" per session (the one that triggers the save). Loading and error states preserved verbatim.

**Height-jump fix.** The modal CSS gets a fixed sizing rule:

```css
.modal {
  width: min(640px, 92vw);
  height: min(70vh, 640px);
  display: flex;
  flex-direction: column;
}
.results {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}
```

The modal no longer collapses when the result list shrinks; the result region scrolls within a fixed-size container. The `min-height: 0` keeps Flexbox from leaking children's intrinsic height upward.

### `HomeView.tsx`, `DeckView.tsx`

Apply tokens. Replace raw `<button>` with `<Button>` (or `<IconButton>` for the rename pencil and the row delete trash). The deck-view rename flow is preserved exactly: click pencil → `<input>` appears with autofocus, blur commits if changed. The deck-view header gets `display: flex; align-items: baseline; gap: var(--space-3); flex-wrap: wrap;` and the action cluster takes `margin-left: auto`. "New card" gets the `primary` variant; everything else is `secondary`. Delete uses `IconButton` with the `danger` variant; the existing `confirm(...)` flow is unchanged.

### `EditorView.tsx`

Light token pass: replace raw `<button>` elements with `<Button>`, swap headings to display font, ensure inputs use the body font and token-driven border/radius. No structural changes.

## Data flow

Unchanged. All queries, mutations, and stores stay as they are. The only side-channel is the menu open/close state, owned locally by `UserMenu`.

## Error handling

Preserved end-to-end. The existing dialog `pickError` state, the `index.refetch()` retry, the `alert(...)` flows in `HomeView`, and the `window.confirm(...)` in row deletes all stay. No new error paths.

## Accessibility

- Every interactive element either has visible text or an `aria-label`. Logos are `aria-hidden` because the button text already labels them.
- React Aria handles focus management, keyboard nav, focus traps, and screen-reader announcements for Dialog, Menu, ToggleButtonGroup, and Button.
- The header uses semantic `<header>` and `<nav aria-label="Primary">`. Login uses `<section aria-labelledby>`.
- Color contrast targets are AA minimum, AAA where reasonably achievable.
- Focus ring is consistently the burgundy accent across all interactive surfaces.
- The avatar button reads as `Account menu for {email}`; the menu's email header is plain text (selectable), not a focusable item.

## Testing

- Existing tests keep passing. Where labels change, tests update accordingly.
- New test for `UserMenu`: renders Sign in link when unauthenticated; renders avatar button when authenticated; opening the menu reveals the email and a Sign out item; clicking Sign out invokes `supabase.auth.signOut()`.
- New / updated test for `BrowseApiModal`: dialog renders with `role="dialog"`; Escape closes; ruleset toggle changes selected ruleset; search filters results; selecting a row calls `onSelected`. Use `userEvent` so React Aria's pointer/keyboard logic exercises correctly.
- Test for `OAuthButton`: renders with the correct accessible name per provider; `onPress` fires.
- Visual regressions are not in scope (no snapshot tests).
- Per project convention, factory-driven tests pass no unnecessary defaults.

## Rollout

A single feature branch (`cc/ui-improvements`, already checked out). The implementation plan will sequence the work so each step keeps the app green:

1. Tokens + fonts + base styles (additive, nothing visual breaks).
2. Add `react-aria-components` and the shared UI primitives (`Button`, `IconButton`, `OAuthButton`, `UserMenu`).
3. Migrate `Root` header to `UserMenu`.
4. Migrate `LoginView` to `OAuthButton`.
5. Migrate `BrowseApiModal` to React Aria `Dialog` + height-jump fix.
6. Migrate `HomeView`, `DeckView`, `EditorView` to shared buttons + tokens.
7. Test sweep and any cleanup.

Each step is a logical commit-sized chunk; the plan document will encode this concretely.

## Open questions

None at this time. Any decisions discovered during implementation that materially change behavior (e.g., a React Aria primitive does not fit a use case as expected) will surface in the implementation plan or as a back-edit to this spec.
