# UI Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refine the chrome around the cards (header, login, deck/home/editor views, browse-from-API dialog) using React Aria primitives, CSS custom-property tokens, and a subtle fantasy theme. Cards and print remain untouched.

**Architecture:** Centralized design tokens in `src/index.css` drive component styling via CSS modules. New shared primitives in `src/lib/ui/` wrap `react-aria-components` with project-specific styling. Each view migration replaces ad-hoc styling with tokens and shared primitives while preserving existing behavior.

**Tech Stack:** React 18 + TypeScript + Vite, `react-aria-components` (new), `@fontsource-variable/inter` + `@fontsource/cinzel` (new), CSS modules, Vitest + RTL + userEvent.

**Spec:** [`docs/superpowers/specs/2026-04-29-ui-refinement-design.md`](../specs/2026-04-29-ui-refinement-design.md)

**Branch:** `cc/ui-improvements` (already checked out). All commits land here.

**Conventions:**
- Each task ends with a single commit.
- TDD on new components and on bugfix tasks (height fix); mechanical setup tasks skip the test step.
- Tests use `getByRole(...)` over text/class selectors; React Aria primitives expose accurate ARIA roles.
- Factories pass no values they don't assert on (per `~/.claude/CLAUDE.md`).
- `npm install` / `npm test` / `npm run build` may need explicit user approval per the user's memory; assume yes inside this plan.
- Cards (`src/cards/`) and `PrintView` are out of scope — do not touch.

---

## Phase 1 — Foundation

### Task 1: Install dependencies

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`

- [ ] **Step 1: Install runtime deps**

```bash
npm install react-aria-components @fontsource-variable/inter @fontsource/cinzel
```

Expected: three new entries under `dependencies`. No peer-dep warnings (React 18 is supported by all three).

- [ ] **Step 2: Verify versions**

```bash
node -e 'const p=require("./package.json"); console.log({rac: p.dependencies["react-aria-components"], inter: p.dependencies["@fontsource-variable/inter"], cinzel: p.dependencies["@fontsource/cinzel"]});'
```

Expected: all three keys are populated. Pin nothing — caret ranges are fine.

- [ ] **Step 3: Lint**

```bash
npm run lint
```

Expected: pass. (No source changes yet.)

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "Add react-aria-components and self-hosted fonts"
```

---

### Task 2: Add design tokens to `src/index.css`

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: Replace `src/index.css` with token-driven base**

Full replacement (preserves the existing print rules):

```css
*,
*::before,
*::after {
  box-sizing: border-box;
}

html,
body,
#root {
  margin: 0;
  padding: 0;
  min-height: 100%;
}

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

  --fs-xs:  0.8rem;
  --fs-sm:  0.875rem;
  --fs-md:  1rem;
  --fs-lg:  1.125rem;
  --fs-xl:  1.5rem;
  --fs-2xl: 2rem;

  --lh-tight: 1.2;
  --lh-body:  1.5;

  /* Space */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-5: 1.5rem;
  --space-6: 2rem;

  /* Radius */
  --radius-sm: 0.25rem;
  --radius-md: 0.4rem;
  --radius-lg: 0.75rem;

  /* Shadow */
  --shadow-sm: 0 1px 2px rgba(26, 20, 16, 0.06);
  --shadow-md: 0 4px 16px rgba(26, 20, 16, 0.08);
  --shadow-lg: 0 16px 40px rgba(26, 20, 16, 0.18);
}

body {
  font-family: var(--font-body);
  color: var(--color-text);
  background: var(--color-bg);
  font-size: var(--fs-md);
  line-height: var(--lh-body);
}

h1, h2, h3 {
  font-family: var(--font-display);
  line-height: var(--lh-tight);
  margin-top: 0;
}

@page {
  size: letter portrait;
  margin: 0.5in;
}

@media print {
  body {
    background: #fff;
  }
}
```

Notes:
- Old `font-family: system-ui, -apple-system, "Segoe UI", sans-serif;` becomes `var(--font-body)`.
- `color: #111` → `var(--color-text)`. `background: #f7f7f7` → `var(--color-bg)`.
- `line-height: 1.4` → `var(--lh-body)` (1.5 — slightly more breathing room).
- `@page` and `@media print` rules preserved verbatim.

- [ ] **Step 2: Run dev server and visually confirm baseline still works**

```bash
npm run dev
```

Open http://localhost:5173. Visit the home page. Confirm: page background is parchment-tinted (no longer gray-cool), body text is readable. (Cards still use their own absolute-pixel CSS — they are untouched.) Stop the dev server.

- [ ] **Step 3: Run tests**

```bash
npm test
```

Expected: all existing tests still pass. Tokens are inert until referenced.

- [ ] **Step 4: Commit**

```bash
git add src/index.css
git commit -m "Add design tokens and base styles"
```

---

### Task 3: Import fonts in `src/main.tsx`

**Files:**
- Modify: `src/main.tsx`

- [ ] **Step 1: Read current `main.tsx`**

```bash
cat src/main.tsx
```

Note the existing imports.

- [ ] **Step 2: Add font imports**

Add these imports near the top of `src/main.tsx`, after the existing CSS import:

```ts
import "@fontsource-variable/inter";
import "@fontsource/cinzel/500.css";
import "@fontsource/cinzel/600.css";
```

Order: keep `import "./index.css"` before the font imports so font-faces resolve into a styled doc, or after — either works because Vite emits them all into the head. Place them grouped with `index.css`.

- [ ] **Step 3: Run the dev server and visually confirm fonts load**

```bash
npm run dev
```

Open http://localhost:5173. Page body text should render in Inter (subtle change from system-ui — letterforms are slightly more open). Stop the dev server.

- [ ] **Step 4: Run tests**

```bash
npm test
```

Expected: pass. (Fontsource imports are no-ops in jsdom.)

- [ ] **Step 5: Commit**

```bash
git add src/main.tsx
git commit -m "Self-host Inter and Cinzel via fontsource"
```

---

## Phase 2 — Shared UI primitives

### Task 4: Add inline icon components

**Files:**
- Create: `src/lib/ui/icons/GoogleLogo.tsx`
- Create: `src/lib/ui/icons/GitHubLogo.tsx`
- Create: `src/lib/ui/icons/PencilIcon.tsx`
- Create: `src/lib/ui/icons/TrashIcon.tsx`

These are pure SVG components. No tests — mechanical.

- [ ] **Step 1: Create `GoogleLogo.tsx`**

```tsx
export function GoogleLogo({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC04"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
      />
    </svg>
  );
}
```

- [ ] **Step 2: Create `GitHubLogo.tsx`**

```tsx
export function GitHubLogo({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="#24292f"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M12 .5C5.7.5.5 5.7.5 12c0 5.1 3.3 9.4 7.9 10.9.6.1.8-.3.8-.6v-2.2c-3.2.7-3.9-1.5-3.9-1.5-.5-1.3-1.3-1.7-1.3-1.7-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.7 1.3 3.4 1 .1-.8.4-1.3.8-1.6-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.3 1.2 1-.3 2-.4 3-.4s2 .1 3 .4c2.3-1.5 3.3-1.2 3.3-1.2.6 1.6.2 2.8.1 3.1.8.8 1.2 1.9 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6 4.6-1.5 7.9-5.8 7.9-10.9C23.5 5.7 18.3.5 12 .5z" />
    </svg>
  );
}
```

- [ ] **Step 3: Create `PencilIcon.tsx`**

```tsx
export function PencilIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
    </svg>
  );
}
```

- [ ] **Step 4: Create `TrashIcon.tsx`**

```tsx
export function TrashIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    </svg>
  );
}
```

- [ ] **Step 5: Lint and commit**

```bash
npm run lint
git add src/lib/ui/icons
git commit -m "Add inline icon components"
```

---

### Task 5: Shared `<Button>` component

**Files:**
- Create: `src/lib/ui/Button.tsx`
- Create: `src/lib/ui/Button.module.css`
- Create: `src/lib/ui/Button.test.tsx`

- [ ] **Step 1: Write the failing test**

`src/lib/ui/Button.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Button } from "./Button";

describe("<Button>", () => {
  it("renders an accessible button with the given label", () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("calls onPress when clicked", async () => {
    const onPress = vi.fn();
    render(<Button onPress={onPress}>Save</Button>);
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("respects the disabled state", () => {
    render(
      <Button isDisabled onPress={() => {}}>
        Save
      </Button>,
    );
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });

  it("applies the variant via data-variant", () => {
    render(<Button variant="primary">Save</Button>);
    expect(screen.getByRole("button", { name: "Save" })).toHaveAttribute(
      "data-variant",
      "primary",
    );
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
npm test -- Button
```

Expected: FAIL — "Cannot find module './Button'".

- [ ] **Step 3: Write the component**

`src/lib/ui/Button.tsx`:

```tsx
import { Button as RACButton, type ButtonProps as RACButtonProps } from "react-aria-components";
import styles from "./Button.module.css";

export type ButtonVariant = "primary" | "secondary" | "danger";
export type ButtonSize = "sm" | "md";

export type ButtonProps = RACButtonProps & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function Button({
  variant = "secondary",
  size = "md",
  className,
  ...rest
}: ButtonProps) {
  return (
    <RACButton
      {...rest}
      data-variant={variant}
      data-size={size}
      className={[styles.btn, className].filter(Boolean).join(" ")}
    />
  );
}
```

`src/lib/ui/Button.module.css`:

```css
.btn {
  font: inherit;
  font-family: var(--font-body);
  font-weight: 500;
  line-height: var(--lh-tight);
  cursor: pointer;
  border-radius: var(--radius-md);
  border: 1px solid transparent;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  transition: background 0.12s, border-color 0.12s;
}

.btn[data-size="sm"] {
  padding: var(--space-1) var(--space-3);
  font-size: var(--fs-sm);
}

.btn[data-size="md"] {
  padding: var(--space-2) var(--space-4);
  font-size: var(--fs-md);
}

.btn[data-variant="secondary"] {
  background: var(--color-surface);
  color: var(--color-text);
  border-color: var(--color-border-strong);
}
.btn[data-variant="secondary"][data-hovered] {
  background: var(--color-surface-2);
}

.btn[data-variant="primary"] {
  background: var(--color-accent);
  color: var(--color-accent-fg);
  border-color: var(--color-accent);
}
.btn[data-variant="primary"][data-hovered] {
  background: #61292a;
  border-color: #61292a;
}

.btn[data-variant="danger"] {
  background: var(--color-surface);
  color: var(--color-danger);
  border-color: var(--color-danger);
}
.btn[data-variant="danger"][data-hovered] {
  background: #fff0f0;
}

.btn[data-disabled] {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn[data-focus-visible] {
  outline: 2px solid var(--color-focus-ring);
  outline-offset: 2px;
}
```

- [ ] **Step 4: Run the tests to confirm they pass**

```bash
npm test -- Button
```

Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/ui/Button.tsx src/lib/ui/Button.module.css src/lib/ui/Button.test.tsx
git commit -m "Add shared Button primitive on react-aria-components"
```

---

### Task 6: Shared `<IconButton>` component

**Files:**
- Create: `src/lib/ui/IconButton.tsx`
- Create: `src/lib/ui/IconButton.module.css`
- Create: `src/lib/ui/IconButton.test.tsx`

- [ ] **Step 1: Write the failing test**

`src/lib/ui/IconButton.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { IconButton } from "./IconButton";

describe("<IconButton>", () => {
  it("renders with the given aria-label", () => {
    render(
      <IconButton aria-label="Delete">
        <svg aria-hidden="true" />
      </IconButton>,
    );
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
  });

  it("calls onPress when clicked", async () => {
    const onPress = vi.fn();
    render(
      <IconButton aria-label="Delete" onPress={onPress}>
        <svg aria-hidden="true" />
      </IconButton>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
npm test -- IconButton
```

Expected: FAIL.

- [ ] **Step 3: Implement**

`src/lib/ui/IconButton.tsx`:

```tsx
import { Button as RACButton, type ButtonProps as RACButtonProps } from "react-aria-components";
import styles from "./IconButton.module.css";

export type IconButtonVariant = "secondary" | "danger";

export type IconButtonProps = RACButtonProps & {
  variant?: IconButtonVariant;
  "aria-label": string;
};

export function IconButton({ variant = "secondary", className, ...rest }: IconButtonProps) {
  return (
    <RACButton
      {...rest}
      data-variant={variant}
      className={[styles.iconBtn, className].filter(Boolean).join(" ")}
    />
  );
}
```

`src/lib/ui/IconButton.module.css`:

```css
.iconBtn {
  font: inherit;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  color: var(--color-text-muted);
  cursor: pointer;
  transition: background 0.12s, color 0.12s;
}

.iconBtn[data-hovered] {
  background: var(--color-surface-2);
  color: var(--color-text);
}

.iconBtn[data-variant="danger"] {
  color: var(--color-text-muted);
}
.iconBtn[data-variant="danger"][data-hovered] {
  background: #fff0f0;
  color: var(--color-danger);
}

.iconBtn[data-disabled] {
  opacity: 0.5;
  cursor: not-allowed;
}

.iconBtn[data-focus-visible] {
  outline: 2px solid var(--color-focus-ring);
  outline-offset: 2px;
}
```

- [ ] **Step 4: Confirm tests pass**

```bash
npm test -- IconButton
```

Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/ui/IconButton.tsx src/lib/ui/IconButton.module.css src/lib/ui/IconButton.test.tsx
git commit -m "Add shared IconButton primitive"
```

---

### Task 7: `<OAuthButton>` component

**Files:**
- Create: `src/lib/ui/OAuthButton.tsx`
- Create: `src/lib/ui/OAuthButton.module.css`
- Create: `src/lib/ui/OAuthButton.test.tsx`

- [ ] **Step 1: Write the failing test**

`src/lib/ui/OAuthButton.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { OAuthButton } from "./OAuthButton";

describe("<OAuthButton>", () => {
  it("renders 'Sign in with Google' for the google provider", () => {
    render(<OAuthButton provider="google" onPress={() => {}} />);
    expect(screen.getByRole("button", { name: "Sign in with Google" })).toBeInTheDocument();
  });

  it("renders 'Sign in with GitHub' for the github provider", () => {
    render(<OAuthButton provider="github" onPress={() => {}} />);
    expect(screen.getByRole("button", { name: "Sign in with GitHub" })).toBeInTheDocument();
  });

  it("renders 'Sign in as Dev User' for the dev provider", () => {
    render(<OAuthButton provider="dev" onPress={() => {}} />);
    expect(screen.getByRole("button", { name: "Sign in as Dev User" })).toBeInTheDocument();
  });

  it("calls onPress when clicked", async () => {
    const onPress = vi.fn();
    render(<OAuthButton provider="google" onPress={onPress} />);
    await userEvent.click(screen.getByRole("button", { name: "Sign in with Google" }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
npm test -- OAuthButton
```

Expected: FAIL.

- [ ] **Step 3: Implement**

`src/lib/ui/OAuthButton.tsx`:

```tsx
import { Button as RACButton, type ButtonProps as RACButtonProps } from "react-aria-components";
import { GitHubLogo } from "./icons/GitHubLogo";
import { GoogleLogo } from "./icons/GoogleLogo";
import styles from "./OAuthButton.module.css";

export type OAuthProvider = "google" | "github" | "dev";

const LABELS: Record<OAuthProvider, string> = {
  google: "Sign in with Google",
  github: "Sign in with GitHub",
  dev: "Sign in as Dev User",
};

export type OAuthButtonProps = RACButtonProps & {
  provider: OAuthProvider;
};

export function OAuthButton({ provider, className, ...rest }: OAuthButtonProps) {
  return (
    <RACButton
      {...rest}
      data-provider={provider}
      className={[styles.oauthBtn, className].filter(Boolean).join(" ")}
    >
      <span className={styles.icon} aria-hidden="true">
        {provider === "google" && <GoogleLogo />}
        {provider === "github" && <GitHubLogo />}
      </span>
      <span>{LABELS[provider]}</span>
    </RACButton>
  );
}
```

`src/lib/ui/OAuthButton.module.css`:

```css
.oauthBtn {
  font: inherit;
  font-family: var(--font-body);
  font-weight: 500;
  font-size: var(--fs-md);
  line-height: var(--lh-tight);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  width: 100%;
  padding: var(--space-3) var(--space-4);
  background: var(--color-surface);
  color: var(--color-text);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-md);
  transition: background 0.12s;
}

.oauthBtn[data-hovered] {
  background: var(--color-surface-2);
}

.oauthBtn[data-disabled] {
  opacity: 0.5;
  cursor: not-allowed;
}

.oauthBtn[data-focus-visible] {
  outline: 2px solid var(--color-focus-ring);
  outline-offset: 2px;
}

.oauthBtn[data-provider="dev"] {
  border-style: dashed;
  opacity: 0.85;
}

.icon {
  display: inline-flex;
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}
```

- [ ] **Step 4: Confirm tests pass**

```bash
npm test -- OAuthButton
```

Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/ui/OAuthButton.tsx src/lib/ui/OAuthButton.module.css src/lib/ui/OAuthButton.test.tsx
git commit -m "Add OAuthButton primitive with provider-specific logos"
```

---

### Task 8: `<UserMenu>` component

**Files:**
- Create: `src/lib/ui/UserMenu.tsx`
- Create: `src/lib/ui/UserMenu.module.css`
- Create: `src/lib/ui/UserMenu.test.tsx`

- [ ] **Step 1: Write the failing test**

`src/lib/ui/UserMenu.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { supabase } from "../../api/supabase";
import { SessionContext, type SessionState } from "../../auth/useSession";
import { UserMenu } from "./UserMenu";

const wrap = (state: SessionState) =>
  render(
    <SessionContext.Provider value={state}>
      <UserMenu />
    </SessionContext.Provider>,
  );

describe("<UserMenu>", () => {
  it("renders a Sign in link when unauthenticated", () => {
    wrap({ status: "unauthenticated", user: null, session: null });
    expect(screen.getByRole("link", { name: /sign in/i })).toBeInTheDocument();
  });

  it("renders nothing while session is loading", () => {
    const { container } = wrap({ status: "loading", user: null, session: null });
    expect(container).toBeEmptyDOMElement();
  });

  it("renders an account-menu trigger when authenticated", () => {
    wrap({
      status: "authenticated",
      user: { id: "u1", email: "ada@example.com" } as never,
      session: {} as never,
    });
    expect(
      screen.getByRole("button", { name: /account menu for ada@example\.com/i }),
    ).toBeInTheDocument();
  });

  it("opens the menu and shows the email and a Sign out item", async () => {
    wrap({
      status: "authenticated",
      user: { id: "u1", email: "ada@example.com" } as never,
      session: {} as never,
    });
    await userEvent.click(screen.getByRole("button", { name: /account menu/i }));
    expect(screen.getByText("ada@example.com")).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /sign out/i })).toBeInTheDocument();
  });

  it("invokes supabase.auth.signOut when Sign out is activated", async () => {
    const spy = vi
      .spyOn(supabase.auth, "signOut")
      .mockResolvedValue({ error: null } as never);
    wrap({
      status: "authenticated",
      user: { id: "u1", email: "ada@example.com" } as never,
      session: {} as never,
    });
    await userEvent.click(screen.getByRole("button", { name: /account menu/i }));
    await userEvent.click(screen.getByRole("menuitem", { name: /sign out/i }));
    expect(spy).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
npm test -- UserMenu
```

Expected: FAIL.

- [ ] **Step 3: Implement**

`src/lib/ui/UserMenu.tsx`:

```tsx
import { Link } from "@tanstack/react-router";
import {
  Button as RACButton,
  Menu,
  MenuItem,
  MenuTrigger,
  Popover,
} from "react-aria-components";
import { supabase } from "../../api/supabase";
import { useSession } from "../../auth/useSession";
import styles from "./UserMenu.module.css";

function initialFor(email: string | null | undefined): string {
  const trimmed = (email ?? "").trim();
  if (!trimmed) return "?";
  return trimmed[0]?.toUpperCase() ?? "?";
}

export function UserMenu() {
  const session = useSession();

  if (session.status === "loading") return null;

  if (session.status === "unauthenticated") {
    return (
      <Link to="/login" className={styles.signInLink}>
        Sign in
      </Link>
    );
  }

  const email = session.user.email ?? "";

  return (
    <MenuTrigger>
      <RACButton
        aria-label={`Account menu for ${email}`}
        className={styles.trigger}
      >
        <span aria-hidden="true">{initialFor(email)}</span>
      </RACButton>
      <Popover className={styles.popover} placement="bottom end">
        <div className={styles.email} aria-hidden="false">
          {email}
        </div>
        <Menu className={styles.menu}>
          <MenuItem
            className={styles.menuItem}
            onAction={() => {
              void supabase.auth.signOut();
            }}
          >
            Sign out
          </MenuItem>
        </Menu>
      </Popover>
    </MenuTrigger>
  );
}
```

`src/lib/ui/UserMenu.module.css`:

```css
.signInLink {
  margin-left: auto;
  color: var(--color-text);
  text-decoration: none;
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
}

.signInLink:hover {
  background: var(--color-surface-2);
}

.trigger {
  margin-left: auto;
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  border: 1px solid var(--color-accent);
  background: var(--color-accent);
  color: var(--color-accent-fg);
  font-family: var(--font-display);
  font-weight: 600;
  font-size: var(--fs-md);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.trigger[data-hovered] {
  filter: brightness(0.92);
}

.trigger[data-focus-visible] {
  outline: 2px solid var(--color-focus-ring);
  outline-offset: 2px;
}

.popover {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  min-width: 14rem;
  overflow: hidden;
}

.email {
  padding: var(--space-3) var(--space-4);
  font-size: var(--fs-sm);
  color: var(--color-text-muted);
  border-bottom: 1px solid var(--color-border);
  user-select: text;
  word-break: break-all;
}

.menu {
  outline: none;
  padding: var(--space-1) 0;
}

.menuItem {
  padding: var(--space-2) var(--space-4);
  font-size: var(--fs-md);
  color: var(--color-text);
  cursor: pointer;
  outline: none;
}

.menuItem[data-focused],
.menuItem[data-hovered] {
  background: var(--color-surface-2);
}
```

- [ ] **Step 4: Confirm tests pass**

```bash
npm test -- UserMenu
```

Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/ui/UserMenu.tsx src/lib/ui/UserMenu.module.css src/lib/ui/UserMenu.test.tsx
git commit -m "Add UserMenu with React Aria MenuTrigger"
```

---

## Phase 3 — View migrations

### Task 9: Migrate `Root` header to use `UserMenu`

**Files:**
- Modify: `src/app/Root.tsx`
- Modify: `src/app/root.module.css`

- [ ] **Step 1: Replace `Root.tsx`**

```tsx
import { Link, Outlet } from "@tanstack/react-router";
import { UserMenu } from "../lib/ui/UserMenu";
import styles from "./root.module.css";

export function Root() {
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Link to="/" className={styles.brand}>
          D&amp;D Cards
        </Link>
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
  );
}
```

- [ ] **Step 2: Replace `root.module.css`**

```css
.shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.header {
  display: flex;
  align-items: center;
  gap: var(--space-5);
  padding: var(--space-3) var(--space-5);
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
}

.brand {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: var(--fs-lg);
  color: var(--color-text);
  text-decoration: none;
  letter-spacing: 0.02em;
}

.nav {
  display: flex;
  gap: var(--space-3);
}

.link {
  color: var(--color-text);
  text-decoration: none;
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
}

.link:hover {
  background: var(--color-surface-2);
}

.active {
  background: var(--color-surface-2);
  font-weight: 600;
}

.main {
  flex: 1;
  padding: var(--space-5);
  max-width: 1200px;
  width: 100%;
  margin: 0 auto;
}

@media print {
  .header {
    display: none;
  }
  .main {
    padding: 0;
    max-width: none;
  }
}
```

Notes:
- The old `.user` and `.signOut` classes are removed; their behavior moves to `UserMenu`.
- `UserMenu` itself carries `margin-left: auto` (set in `UserMenu.module.css`), so the cluster pins right.

- [ ] **Step 3: Run the dev server and visually confirm**

```bash
npm run dev
```

Open http://localhost:5173. Confirm:
- Brand "D&D Cards" is in Cinzel.
- "Decks" link sits next to it.
- When unauthenticated: "Sign in" link sits at the right edge.
- When authenticated (sign in via the dev-user button): a circular burgundy avatar with the first initial sits at the right edge. Click it: a popover shows the full email and a "Sign out" menu item. Esc closes; clicking Sign out signs out.

Stop the dev server.

- [ ] **Step 4: Run tests**

```bash
npm test
```

Expected: pass. (No existing test references `.user` / `.signOut` classes — they query by role/text.)

- [ ] **Step 5: Commit**

```bash
git add src/app/Root.tsx src/app/root.module.css
git commit -m "Migrate Root header to UserMenu and tokens"
```

---

### Task 10: Migrate `LoginView` to `OAuthButton`

**Files:**
- Modify: `src/auth/LoginView.tsx`
- Modify: `src/auth/LoginView.module.css`

- [ ] **Step 1: Replace `LoginView.tsx`**

```tsx
import { OAuthButton } from "../lib/ui/OAuthButton";
import { supabase } from "../api/supabase";
import styles from "./LoginView.module.css";

const DEV_EMAIL = "dev@local";
const DEV_PASSWORD = "devpass";

export function LoginView() {
  const signIn = (provider: "google" | "github") => {
    const next = new URLSearchParams(window.location.search).get("next") ?? "/";
    supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
  };

  const devSignIn = async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email: DEV_EMAIL,
      password: DEV_PASSWORD,
    });
    if (error?.message === "Invalid login credentials") {
      // First run on this local DB — create the user. With
      // enable_confirmations=false (set in supabase/config.toml),
      // signUp establishes a session immediately.
      await supabase.auth.signUp({ email: DEV_EMAIL, password: DEV_PASSWORD });
    }
  };

  return (
    <section className={styles.login} aria-labelledby="signin-heading">
      <h1 id="signin-heading">Sign in</h1>
      <p className={styles.copy}>
        Sign in to create and edit decks. Anyone can view shared decks via link.
      </p>
      <ul className={styles.providers} role="list">
        <li>
          <OAuthButton provider="google" onPress={() => signIn("google")} />
        </li>
        <li>
          <OAuthButton provider="github" onPress={() => signIn("github")} />
        </li>
        {import.meta.env.DEV && (
          <li>
            <OAuthButton provider="dev" onPress={() => void devSignIn()} />
          </li>
        )}
      </ul>
    </section>
  );
}
```

- [ ] **Step 2: Replace `LoginView.module.css`**

```css
.login {
  max-width: 28rem;
  margin: var(--space-6) auto;
  text-align: center;
  padding: 0 var(--space-4);
}

.login h1 {
  font-size: var(--fs-2xl);
  margin-bottom: var(--space-3);
}

.copy {
  color: var(--color-text-muted);
  font-size: var(--fs-md);
  line-height: var(--lh-body);
  margin: 0 0 var(--space-5);
}

.providers {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
```

- [ ] **Step 3: Run tests**

```bash
npm test -- LoginView
```

Expected: all 5 existing tests still pass — the accessible name strings ("Sign in with Google", "Sign in with GitHub", "Sign in as Dev User") are preserved.

- [ ] **Step 4: Run the full suite and lint**

```bash
npm test
npm run lint
```

Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add src/auth/LoginView.tsx src/auth/LoginView.module.css
git commit -m "Migrate LoginView to OAuthButton and theme tokens"
```

---

### Task 11: Migrate `BrowseApiModal` to React Aria + fix the height jump

**Files:**
- Modify: `src/views/BrowseApiModal.tsx`
- Modify: `src/views/BrowseApiModal.module.css`
- Modify: `src/views/BrowseApiModal.test.tsx`

- [ ] **Step 1: Add a failing test for the height-jump fix**

The bug: as the result list shrinks, the modal collapses with it (jarring). Fix: modal has a fixed height; the result region scrolls inside it.

We can't measure pixel heights reliably in jsdom, but we can assert that the dialog has the `data-stable-size` attribute we'll set whenever the fixed sizing applies. Add this test to `src/views/BrowseApiModal.test.tsx` (preserve all existing tests):

```tsx
test("the dialog renders with stable sizing applied", async () => {
  server.use(magicItemIndexHandler("2024", { count: 0, results: [] }));
  wrap(<BrowseApiModal deckId="d1" onClose={() => {}} onSelected={() => {}} />);
  const dialog = await screen.findByRole("dialog", { name: /browse magic items/i });
  expect(dialog).toHaveAttribute("data-stable-size", "true");
});
```

Also update existing tests now (one task, one commit; the spec calls for role-based selectors when migrating):

Replace the body of `src/views/BrowseApiModal.test.tsx` with the version below. Each existing test is preserved but uses role-based queries appropriate to the new React Aria primitives:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { type ReactNode, StrictMode } from "react";
import { describe, expect, test, vi } from "vitest";
import { magicItemDetail2024Factory, magicItemIndexEntryFactory } from "../api/factories";
import { makeCardRow } from "../test/factories";
import {
  apiErrorHandler,
  magicItemDetailHandler,
  magicItemIndexHandler,
  SB_URL,
  server,
} from "../test/msw";
import { BrowseApiModal } from "./BrowseApiModal";

const wrap = (ui: ReactNode) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
};

describe("<BrowseApiModal>", () => {
  test("shows index entries once the list loads", async () => {
    const entryA = magicItemIndexEntryFactory.build({ name: "Bag of Holding" });
    const entryB = magicItemIndexEntryFactory.build({ name: "Cloak of Protection" });
    server.use(magicItemIndexHandler("2024", { count: 2, results: [entryA, entryB] }));

    wrap(<BrowseApiModal deckId="d1" onClose={() => {}} onSelected={() => {}} />);

    expect(await screen.findByRole("button", { name: "Bag of Holding" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cloak of Protection" })).toBeInTheDocument();
  });

  test("the dialog renders with stable sizing applied", async () => {
    server.use(magicItemIndexHandler("2024", { count: 0, results: [] }));
    wrap(<BrowseApiModal deckId="d1" onClose={() => {}} onSelected={() => {}} />);
    const dialog = await screen.findByRole("dialog", { name: /browse magic items/i });
    expect(dialog).toHaveAttribute("data-stable-size", "true");
  });

  test("search filters the list", async () => {
    const entryA = magicItemIndexEntryFactory.build({ name: "Bag of Holding" });
    const entryB = magicItemIndexEntryFactory.build({ name: "Cloak of Protection" });
    server.use(magicItemIndexHandler("2024", { count: 2, results: [entryA, entryB] }));

    wrap(<BrowseApiModal deckId="d1" onClose={() => {}} onSelected={() => {}} />);

    await screen.findByRole("button", { name: "Bag of Holding" });
    await userEvent.type(screen.getByRole("searchbox"), "bag");

    expect(screen.getByRole("button", { name: "Bag of Holding" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cloak of Protection" })).not.toBeInTheDocument();
  });

  test("switching ruleset loads a different list", async () => {
    const v2024 = magicItemIndexEntryFactory.build({ name: "Ring A" });
    const v2014 = magicItemIndexEntryFactory.build({ name: "Ring Z" });
    server.use(
      magicItemIndexHandler("2024", { count: 1, results: [v2024] }),
      magicItemIndexHandler("2014", { count: 1, results: [v2014] }),
    );

    wrap(<BrowseApiModal deckId="d1" onClose={() => {}} onSelected={() => {}} />);

    await screen.findByRole("button", { name: "Ring A" });
    await userEvent.click(screen.getByRole("radio", { name: "2014" }));

    await waitFor(() => expect(screen.getByRole("button", { name: "Ring Z" })).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: "Ring A" })).not.toBeInTheDocument();
  });

  test("clicking a row POSTs the card to the persistence layer and calls onSelected", async () => {
    const entry = magicItemIndexEntryFactory.build({ name: "Bag of Holding" });
    const detail = magicItemDetail2024Factory.build({ index: entry.index, name: entry.name });
    server.use(
      magicItemIndexHandler("2024", { count: 1, results: [entry] }),
      magicItemDetailHandler("2024", entry.index, detail),
    );
    const onPost = vi.fn();
    server.use(
      http.post(`${SB_URL}/rest/v1/cards`, async ({ request }) => {
        onPost(await request.json());
        return HttpResponse.json([makeCardRow.build()], { status: 201 });
      }),
    );
    const onSelected = vi.fn();

    wrap(<BrowseApiModal deckId="d1" onClose={() => {}} onSelected={onSelected} />);

    await userEvent.click(await screen.findByRole("button", { name: "Bag of Holding" }));

    await waitFor(() => expect(onPost).toHaveBeenCalled());
    expect(onSelected).toHaveBeenCalledWith(expect.any(String));
  });

  test("clicking the same row only POSTs once even under StrictMode double-render", async () => {
    const entry = magicItemIndexEntryFactory.build({ name: "Flame Tongue" });
    const detail = magicItemDetail2024Factory.build({ index: entry.index, name: entry.name });
    server.use(
      magicItemIndexHandler("2024", { count: 1, results: [entry] }),
      magicItemDetailHandler("2024", entry.index, detail),
    );
    const onPost = vi.fn();
    server.use(
      http.post(`${SB_URL}/rest/v1/cards`, async ({ request }) => {
        onPost(await request.json());
        return HttpResponse.json([makeCardRow.build()], { status: 201 });
      }),
    );

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <StrictMode>
        <QueryClientProvider client={client}>
          <BrowseApiModal deckId="d1" onClose={() => {}} onSelected={() => {}} />
        </QueryClientProvider>
      </StrictMode>,
    );

    await userEvent.click(await screen.findByRole("button", { name: "Flame Tongue" }));

    await waitFor(() => expect(onPost).toHaveBeenCalledTimes(1));
    await new Promise((r) => setTimeout(r, 50));
    expect(onPost).toHaveBeenCalledTimes(1);
  });

  test("Escape calls onClose", async () => {
    const onClose = vi.fn();
    server.use(magicItemIndexHandler("2024", { count: 0, results: [] }));

    wrap(<BrowseApiModal deckId="d1" onClose={onClose} onSelected={() => {}} />);

    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
  });

  test("error state shows retry button", async () => {
    server.use(apiErrorHandler("/api/2024/magic-items", 500));

    wrap(<BrowseApiModal deckId="d1" onClose={() => {}} onSelected={() => {}} />);

    expect(await screen.findByRole("button", { name: /retry/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- BrowseApiModal
```

Expected: FAIL — `getByRole('searchbox')` and `getByRole('radio')` and `data-stable-size` are not yet exposed by the current implementation. (Some tests may pass coincidentally; that's fine.)

- [ ] **Step 3: Replace `BrowseApiModal.tsx`**

```tsx
import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Dialog,
  Input,
  Modal,
  ModalOverlay,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
} from "react-aria-components";
import { fetchMagicItemDetail, type Ruleset } from "../api/endpoints/magicItems";
import { useMagicItemIndex } from "../api/hooks";
import { magicItemDetailToCard } from "../api/mappers/magicItems";
import { useSaveCard } from "../decks/mutations";
import { Button } from "../lib/ui/Button";
import { IconButton } from "../lib/ui/IconButton";
import styles from "./BrowseApiModal.module.css";

type Props = {
  deckId: string;
  onClose: () => void;
  onSelected: (cardId: string) => void;
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function BrowseApiModal({ deckId, onClose, onSelected }: Props) {
  const [ruleset, setRuleset] = useState<Ruleset>("2024");
  const [query, setQuery] = useState("");
  const [pickingSlug, setPickingSlug] = useState<string | null>(null);
  const [pickError, setPickError] = useState<string | null>(null);

  const index = useMagicItemIndex(ruleset);
  const queryClient = useQueryClient();
  const saveCard = useSaveCard();

  const filtered = useMemo(() => {
    const all = index.data?.results ?? [];
    if (query.trim() === "") return all;
    const q = query.toLowerCase();
    return all.filter((e) => e.name.toLowerCase().includes(q));
  }, [index.data, query]);

  const handlePick = async (slug: string) => {
    if (pickingSlug !== null) return;
    setPickingSlug(slug);
    setPickError(null);
    try {
      const detail = await queryClient.fetchQuery({
        queryKey: ["magic-items", ruleset, "detail", slug],
        queryFn: () => fetchMagicItemDetail(ruleset, slug),
        staleTime: DAY_MS,
      });
      const card = magicItemDetailToCard(detail);
      await saveCard.mutateAsync({ card, deckId, isNew: true });
      onSelected(card.id);
    } catch (err) {
      console.error("Failed to add magic-item to deck", err);
      setPickError(
        err instanceof Error ? err.message : "Couldn't add this card. Please try again.",
      );
    } finally {
      setPickingSlug(null);
    }
  };

  return (
    <ModalOverlay
      isOpen
      isDismissable
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      className={styles.overlay}
    >
      <Modal className={styles.modal}>
        <Dialog
          aria-label="Browse magic items"
          data-stable-size="true"
          className={styles.dialog}
        >
          <header className={styles.header}>
            <h2 className={styles.title}>Browse magic items</h2>
            <ToggleButtonGroup
              selectionMode="single"
              disallowEmptySelection
              selectedKeys={[ruleset]}
              onSelectionChange={(keys) => {
                const next = Array.from(keys)[0];
                if (next === "2014" || next === "2024") setRuleset(next);
              }}
              className={styles.rulesetToggle}
            >
              <ToggleButton id="2014" className={styles.rulesetBtn}>
                2014
              </ToggleButton>
              <ToggleButton id="2024" className={styles.rulesetBtn}>
                2024
              </ToggleButton>
            </ToggleButtonGroup>
            <IconButton aria-label="Close" onPress={onClose} className={styles.closeBtn}>
              <span aria-hidden="true">×</span>
            </IconButton>
          </header>

          <div className={styles.searchRow}>
            <TextField aria-label="Search magic items" className={styles.searchField}>
              <Input
                type="search"
                placeholder="Search magic items…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className={styles.searchInput}
                // biome-ignore lint/a11y/noAutofocus: dialog entry point
                autoFocus
              />
            </TextField>
          </div>

          <div className={styles.results}>
            {index.isLoading && <div className={styles.state}>Loading…</div>}
            {index.isError && (
              <div className={styles.state}>
                Couldn't load the magic-items list.
                <div className={styles.errorActions}>
                  <Button variant="secondary" size="sm" onPress={() => index.refetch()}>
                    Retry
                  </Button>
                </div>
              </div>
            )}
            {index.isSuccess && filtered.length === 0 && (
              <div className={styles.state}>No items match your search.</div>
            )}
            {pickError && (
              <div className={styles.state} role="alert">
                {pickError}
              </div>
            )}
            {index.isSuccess &&
              filtered.map((entry) => (
                <button
                  key={entry.index}
                  type="button"
                  className={styles.row}
                  onClick={() => handlePick(entry.index)}
                  disabled={pickingSlug !== null}
                >
                  <span className={styles.rowName}>{entry.name}</span>
                  {pickingSlug === entry.index && <span className={styles.rowMeta}>Loading…</span>}
                </button>
              ))}
          </div>
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
```

Notes:
- ESC and click-outside dismissal are handled by `ModalOverlay`.
- No more `useEffect` for keydown — React Aria owns it.
- The result rows are still plain `<button>` elements (per the spec — no listbox needed).
- `data-stable-size="true"` is what the new test asserts.

- [ ] **Step 4: Replace `BrowseApiModal.module.css`**

```css
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(26, 20, 16, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  width: min(640px, 92vw);
  height: min(70vh, 640px);
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
  outline: none;
}

.dialog {
  height: 100%;
  display: flex;
  flex-direction: column;
  outline: none;
}

.header {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface-2);
}

.title {
  margin: 0;
  font-size: var(--fs-lg);
  flex: 1;
}

.rulesetToggle {
  display: flex;
  gap: var(--space-1);
}

.rulesetBtn {
  font: inherit;
  font-family: var(--font-body);
  padding: var(--space-1) var(--space-3);
  border: 1px solid var(--color-border-strong);
  background: var(--color-surface);
  color: var(--color-text);
  border-radius: var(--radius-md);
  cursor: pointer;
}

.rulesetBtn[data-selected] {
  background: var(--color-accent);
  color: var(--color-accent-fg);
  border-color: var(--color-accent);
}

.rulesetBtn[data-focus-visible] {
  outline: 2px solid var(--color-focus-ring);
  outline-offset: 2px;
}

.closeBtn {
  font-size: var(--fs-xl);
  line-height: 1;
}

.searchRow {
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-border);
}

.searchField {
  display: block;
}

.searchInput {
  font: inherit;
  font-family: var(--font-body);
  font-size: var(--fs-md);
  width: 100%;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-text);
}

.searchInput:focus-visible {
  outline: 2px solid var(--color-focus-ring);
  outline-offset: 2px;
}

.results {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: var(--space-1) 0;
}

.row {
  display: flex;
  width: 100%;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-2) var(--space-4);
  border: 0;
  background: transparent;
  text-align: left;
  font: inherit;
  font-family: var(--font-body);
  cursor: pointer;
  border-bottom: 1px solid var(--color-border);
}

.row:last-child {
  border-bottom: 0;
}

.row:hover:not(:disabled) {
  background: var(--color-surface-2);
}

.row:focus-visible {
  outline: 2px solid var(--color-focus-ring);
  outline-offset: -2px;
}

.row:disabled {
  cursor: not-allowed;
}

.rowName {
  font-weight: 600;
}

.rowMeta {
  font-size: var(--fs-sm);
  color: var(--color-text-muted);
}

.state {
  padding: var(--space-5);
  text-align: center;
  color: var(--color-text-muted);
}

.errorActions {
  margin-top: var(--space-2);
}
```

- [ ] **Step 5: Run the BrowseApiModal tests**

```bash
npm test -- BrowseApiModal
```

Expected: all 9 pass.

- [ ] **Step 6: Run the dev server and visually confirm the height-jump fix**

```bash
npm run dev
```

Open the app, sign in, open a deck, click "Browse from API". Confirm the modal stays the same height regardless of how many results are visible (try typing a query that filters down to 1–2 results). Stop the dev server.

- [ ] **Step 7: Run the full suite and lint**

```bash
npm test
npm run lint
```

Expected: green.

- [ ] **Step 8: Commit**

```bash
git add src/views/BrowseApiModal.tsx src/views/BrowseApiModal.module.css src/views/BrowseApiModal.test.tsx
git commit -m "Migrate BrowseApiModal to React Aria and fix height jump"
```

---

### Task 12: Migrate `DeckView` (deck detail header + rows)

**Files:**
- Modify: `src/views/DeckView.tsx`
- Modify: `src/views/DeckView.module.css`
- Modify: `src/views/DeckView.test.tsx` (only as needed if any selector breaks)

- [ ] **Step 1: Read existing tests to understand selectors used**

```bash
cat src/views/DeckView.test.tsx | head -80
```

Note any tests that query by class — those will need updates if their target classes change. Tests that query by role/text continue working.

- [ ] **Step 2: Replace `DeckView.tsx`**

```tsx
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useSession } from "../auth/useSession";
import { serializeDeck } from "../decks/io";
import { useDeleteCard, useRenameDeck } from "../decks/mutations";
import { useDeck, useDeckCards } from "../decks/queries";
import { Button } from "../lib/ui/Button";
import { IconButton } from "../lib/ui/IconButton";
import { PencilIcon } from "../lib/ui/icons/PencilIcon";
import { TrashIcon } from "../lib/ui/icons/TrashIcon";
import { downloadText } from "../lib/download";
import { BrowseApiModal } from "./BrowseApiModal";
import styles from "./DeckView.module.css";

type Props = { deckId: string };

export function DeckView({ deckId }: Props) {
  const session = useSession();
  const deckQuery = useDeck(deckId);
  const cardsQuery = useDeckCards(deckId);
  const renameDeck = useRenameDeck();
  const deleteCard = useDeleteCard();
  const [browseOpen, setBrowseOpen] = useState(false);

  if (deckQuery.isLoading || cardsQuery.isLoading) return <p>Loading…</p>;
  if (!deckQuery.data) return <p>This deck no longer exists.</p>;

  const deck = deckQuery.data;
  const cards = cardsQuery.data ?? [];
  const isOwner = session.status === "authenticated" && session.user.id === deck.owner_id;

  const handleExport = () => {
    downloadText(`${deck.name}.json`, serializeDeck({ version: 1, cards }));
  };

  return (
    <section>
      <header className={styles.header}>
        {isOwner ? (
          <DeckTitle name={deck.name} onRename={(n) => renameDeck.mutate({ deckId, name: n })} />
        ) : (
          <h2 className={styles.title}>{deck.name}</h2>
        )}
        <span className={styles.count}>
          {cards.length} {cards.length === 1 ? "card" : "cards"}
        </span>
        <div className={styles.actions}>
          <Button variant="secondary" onPress={handleExport} isDisabled={cards.length === 0}>
            Export JSON
          </Button>
          <Link to="/deck/$deckId/print" params={{ deckId }} className={styles.printLink}>
            Print
          </Link>
          {isOwner && (
            <>
              <Button variant="secondary" onPress={() => setBrowseOpen(true)}>
                Browse from API
              </Button>
              <Link
                to="/deck/$deckId/edit/$cardId"
                params={{ deckId, cardId: "new" }}
                className={styles.newCardLink}
              >
                New card
              </Link>
            </>
          )}
        </div>
      </header>

      {cards.length === 0 ? (
        <p className={styles.empty}>No cards yet.</p>
      ) : (
        <ul className={styles.list} role="list">
          {cards.map((card) => (
            <li key={card.id} className={styles.row}>
              <div className={styles.rowMain}>
                {isOwner ? (
                  <Link
                    to="/deck/$deckId/edit/$cardId"
                    params={{ deckId, cardId: card.id }}
                    className={styles.cardLink}
                  >
                    <strong>{card.name}</strong>
                  </Link>
                ) : (
                  <strong>{card.name}</strong>
                )}
                {card.kind === "item" && card.typeLine && (
                  <span className={styles.typeLine}>{card.typeLine}</span>
                )}
              </div>
              {isOwner && (
                <IconButton
                  aria-label={`Delete ${card.name}`}
                  variant="danger"
                  onPress={() => deleteCard.mutate({ cardId: card.id, deckId })}
                >
                  <TrashIcon />
                </IconButton>
              )}
            </li>
          ))}
        </ul>
      )}

      {browseOpen && (
        <BrowseApiModal
          deckId={deckId}
          onClose={() => setBrowseOpen(false)}
          onSelected={() => setBrowseOpen(false)}
        />
      )}
    </section>
  );
}

function DeckTitle({ name, onRename }: { name: string; onRename: (next: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  if (!editing) {
    return (
      <div className={styles.titleRow}>
        <h2 className={styles.title}>{name}</h2>
        <IconButton
          aria-label={`Rename deck ${name}`}
          onPress={() => {
            setDraft(name);
            setEditing(true);
          }}
        >
          <PencilIcon />
        </IconButton>
      </div>
    );
  }
  return (
    <input
      className={styles.titleInput}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if (draft && draft !== name) onRename(draft);
        setEditing(false);
      }}
      aria-label={`Rename deck (currently: ${name})`}
      // biome-ignore lint/a11y/noAutofocus: user just clicked to enter edit mode
      autoFocus
    />
  );
}
```

Notable behavior changes:
- "Rename" text button → `IconButton` with pencil. Accessible name unchanged: `Rename deck ${name}`.
- "Delete" text button per row → `IconButton` with trash. Accessible name unchanged.
- New "n cards" count badge added.
- All other buttons → shared `<Button>`.

- [ ] **Step 3: Replace `DeckView.module.css`**

```css
.header {
  display: flex;
  align-items: baseline;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
  flex-wrap: wrap;
}

.title {
  font-size: var(--fs-xl);
  margin: 0;
}

.titleRow {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.count {
  color: var(--color-text-muted);
  font-size: var(--fs-sm);
}

.actions {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
  margin-left: auto;
}

.empty {
  color: var(--color-text-muted);
}

.list {
  list-style: none;
  padding: 0;
  margin: 0;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  box-shadow: var(--shadow-sm);
}

.row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-border);
}

.row:last-child {
  border-bottom: 0;
}

.rowMain {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  min-width: 0;
}

.cardLink {
  color: var(--color-text);
  text-decoration: none;
  font-family: var(--font-display);
  font-weight: 600;
}

.cardLink:hover {
  text-decoration: underline;
}

.typeLine {
  font-size: var(--fs-sm);
  color: var(--color-text-muted);
  font-style: italic;
}

.printLink,
.newCardLink {
  font: inherit;
  font-family: var(--font-body);
  font-weight: 500;
  font-size: var(--fs-md);
  padding: var(--space-2) var(--space-4);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-text);
  text-decoration: none;
  display: inline-flex;
  align-items: center;
}

.printLink:hover,
.newCardLink:hover {
  background: var(--color-surface-2);
}

.newCardLink {
  background: var(--color-accent);
  color: var(--color-accent-fg);
  border-color: var(--color-accent);
}

.newCardLink:hover {
  filter: brightness(0.92);
}

.titleInput {
  font: inherit;
  font-family: var(--font-display);
  font-size: var(--fs-xl);
  font-weight: 600;
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-md);
  padding: var(--space-1) var(--space-3);
}
```

- [ ] **Step 4: Run DeckView tests**

```bash
npm test -- DeckView
```

If a test fails because it uses a class selector or text-button query that no longer matches, update that test to use `getByRole(...)` with the same accessible name. (Rename / Delete preserve their `aria-label`; "Export JSON", "Browse from API" preserve their text labels.)

- [ ] **Step 5: Run full suite and lint**

```bash
npm test
npm run lint
```

Expected: green.

- [ ] **Step 6: Commit**

```bash
git add src/views/DeckView.tsx src/views/DeckView.module.css src/views/DeckView.test.tsx
git commit -m "Migrate DeckView to shared Button/IconButton and tokens"
```

---

### Task 13: Migrate `HomeView` (deck list)

**Files:**
- Modify: `src/views/HomeView.tsx`
- Modify: `src/views/HomeView.module.css`
- Modify: `src/views/HomeView.test.tsx` (only as needed)

- [ ] **Step 1: Replace `HomeView.tsx`**

```tsx
import { Link, useNavigate } from "@tanstack/react-router";
import { type ChangeEvent, useRef } from "react";
import { useSession } from "../auth/useSession";
import { parseDeckJson } from "../decks/io";
import { useCreateDeck, useDeleteDeck, useSaveCard } from "../decks/mutations";
import { useDecks } from "../decks/queries";
import { Button } from "../lib/ui/Button";
import { IconButton } from "../lib/ui/IconButton";
import { TrashIcon } from "../lib/ui/icons/TrashIcon";
import { newId } from "../lib/id";
import styles from "./HomeView.module.css";

export function HomeView() {
  const session = useSession();
  const navigate = useNavigate();
  const ownerId = session.status === "authenticated" ? session.user.id : undefined;
  const decks = useDecks(ownerId);
  const createDeck = useCreateDeck();
  const deleteDeck = useDeleteDeck();
  const saveCard = useSaveCard();
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (session.status === "loading") return null;

  if (session.status === "unauthenticated") {
    return (
      <section className={styles.splash}>
        <h2>D&amp;D Cards</h2>
        <p>Sign in to create and edit decks. Anyone can view shared decks via link.</p>
        <Link to="/login" className={styles.cta}>
          Sign in
        </Link>
      </section>
    );
  }

  const handleImport = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !ownerId) return;
    try {
      const text = await file.text();
      const result = parseDeckJson(text);
      if (!result.ok) {
        alert(`Import failed: ${result.error}`);
        return;
      }
      const name = file.name.replace(/\.json$/i, "") || "Imported deck";
      const deck = await createDeck.mutateAsync({ name, ownerId });
      try {
        for (const card of result.deck.cards) {
          const fresh = { ...card, id: newId() };
          await saveCard.mutateAsync({ card: fresh, deckId: deck.id, isNew: true });
        }
      } catch (err) {
        await deleteDeck.mutateAsync(deck.id).catch(() => {});
        alert(`Import failed mid-way: ${err instanceof Error ? err.message : "unknown error"}`);
        return;
      }
      navigate({ to: "/deck/$deckId", params: { deckId: deck.id } });
    } finally {
      e.target.value = "";
    }
  };

  const handleCreate = async () => {
    if (!ownerId) return;
    const deck = await createDeck.mutateAsync({ name: "Untitled deck", ownerId });
    navigate({ to: "/deck/$deckId", params: { deckId: deck.id } });
  };

  const handleDelete = (deckId: string, name: string) => {
    if (!window.confirm(`Delete "${name}" and all its cards?`)) return;
    deleteDeck.mutate(deckId);
  };

  if (!decks.data || decks.data.length === 0) {
    return (
      <section className={styles.empty}>
        <h2>No decks yet</h2>
        <div className={styles.headerActions}>
          <Button variant="secondary" onPress={() => fileInputRef.current?.click()}>
            Import JSON
          </Button>
          <Button variant="primary" onPress={handleCreate} isDisabled={createDeck.isPending}>
            Create your first deck
          </Button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          aria-label="Import JSON"
          hidden
          onChange={handleImport}
        />
      </section>
    );
  }

  return (
    <section>
      <header className={styles.header}>
        <h2>Your decks</h2>
        <div className={styles.headerActions}>
          <Button variant="secondary" onPress={() => fileInputRef.current?.click()}>
            Import JSON
          </Button>
          <Button variant="primary" onPress={handleCreate} isDisabled={createDeck.isPending}>
            New deck
          </Button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          aria-label="Import JSON"
          hidden
          onChange={handleImport}
        />
      </header>
      <ul className={styles.list} role="list">
        {decks.data.map((d) => (
          <li key={d.id} className={styles.row}>
            <Link to="/deck/$deckId" params={{ deckId: d.id }} className={styles.deckLink}>
              {d.name}
            </Link>
            <IconButton
              aria-label={`Delete ${d.name}`}
              variant="danger"
              onPress={() => handleDelete(d.id, d.name)}
            >
              <TrashIcon />
            </IconButton>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

- [ ] **Step 2: Replace `HomeView.module.css`**

```css
.splash {
  text-align: center;
  margin: var(--space-6) auto;
  max-width: 32rem;
}

.splash h2 {
  font-size: var(--fs-2xl);
}

.splash p {
  color: var(--color-text-muted);
  margin-bottom: var(--space-4);
}

.cta {
  display: inline-block;
  padding: var(--space-3) var(--space-5);
  background: var(--color-accent);
  color: var(--color-accent-fg);
  border-radius: var(--radius-md);
  text-decoration: none;
  font-weight: 600;
}

.cta:hover {
  filter: brightness(0.92);
}

.empty {
  text-align: center;
  margin: var(--space-6) auto;
  max-width: 32rem;
}

.empty h2 {
  font-size: var(--fs-xl);
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-4);
  flex-wrap: wrap;
  gap: var(--space-3);
}

.header h2 {
  font-size: var(--fs-xl);
  margin: 0;
}

.headerActions {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
  justify-content: center;
}

.list {
  list-style: none;
  padding: 0;
  margin: 0;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  box-shadow: var(--shadow-sm);
}

.row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-border);
}

.row:last-child {
  border-bottom: 0;
}

.deckLink {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: var(--fs-md);
  color: var(--color-text);
  text-decoration: none;
  flex: 1;
}

.deckLink:hover {
  text-decoration: underline;
}
```

- [ ] **Step 3: Run HomeView tests and lint**

```bash
npm test -- HomeView
npm run lint
```

If any test fails on class-based or text-button selectors, update it to use `getByRole(...)` with the same accessible name (button labels are unchanged). Existing tests that already use roles (e.g., `getByRole('button', { name: /new deck/i })`) keep working.

- [ ] **Step 4: Run full suite**

```bash
npm test
```

Expected: green.

- [ ] **Step 5: Commit**

```bash
git add src/views/HomeView.tsx src/views/HomeView.module.css src/views/HomeView.test.tsx
git commit -m "Migrate HomeView to shared primitives and tokens"
```

---

### Task 14: Migrate `EditorView` (light pass)

**Files:**
- Modify: `src/views/EditorView.tsx`
- Modify: `src/views/EditorView.module.css`

- [ ] **Step 1: Replace `EditorView.tsx`**

The only changes are: import `Button`, replace the two `<button>` elements in `formActions` with `<Button>`. Body is unchanged.

```tsx
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AutoFitCard } from "../cards/AutoFitCard";
import { ItemEditor } from "../cards/ItemEditor";
import type { ItemCard } from "../cards/types";
import { useDeleteCard, useSaveCard } from "../decks/mutations";
import { useDeckCards } from "../decks/queries";
import { Button } from "../lib/ui/Button";
import { newId } from "../lib/id";
import { nowIso } from "../lib/time";
import styles from "./EditorView.module.css";

const isPristineNewCard = (card: ItemCard): boolean =>
  card.name === "Untitled item" &&
  card.typeLine === "" &&
  card.body === "" &&
  card.costWeight === undefined &&
  card.imageUrl === undefined &&
  card.createdAt === card.updatedAt;

const isTemplateItem = (card: ItemCard): boolean =>
  card.source === "api" && /\(any /i.test(card.body);

type Props = { deckId: string; cardId: string };

export function EditorView({ deckId, cardId }: Props) {
  const cardsQuery = useDeckCards(deckId);
  const saveCard = useSaveCard();
  const deleteCard = useDeleteCard();
  const navigate = useNavigate();

  const isNew = cardId === "new";

  const stub: ItemCard | null = useMemo(() => {
    if (!isNew) return null;
    const now = nowIso();
    return {
      id: newId(),
      kind: "item",
      name: "Untitled item",
      typeLine: "",
      body: "",
      source: "custom",
      createdAt: now,
      updatedAt: now,
    };
  }, [isNew]);

  const existing = cardsQuery.data?.find((c) => c.id === cardId) ?? null;
  const initial = isNew ? stub : existing;

  const [draft, setDraft] = useState<ItemCard | null>(
    initial && initial.kind === "item" ? initial : null,
  );

  useEffect(() => {
    if (initial && initial.kind === "item") setDraft(initial);
  }, [initial]);

  if (cardsQuery.isLoading && !isNew) return <p>Loading…</p>;
  if (!isNew && !existing) return <p>Card not found.</p>;
  if (existing && existing.kind !== "item") return <p>Only item cards are supported in v1.</p>;
  if (!draft) return null;

  const handleSave = async () => {
    await saveCard.mutateAsync({ card: draft, deckId, isNew });
    navigate({ to: "/deck/$deckId", params: { deckId } });
  };

  const handleCancel = async () => {
    if (!isNew && existing && existing.kind === "item" && isPristineNewCard(existing)) {
      await deleteCard.mutateAsync({ cardId: existing.id, deckId });
    }
    navigate({ to: "/deck/$deckId", params: { deckId } });
  };

  return (
    <section className={styles.editor}>
      <div className={styles.form}>
        {isTemplateItem(draft) && (
          <div className={styles.templateNotice} data-testid="template-notice">
            <strong>Template item.</strong> The dnd5eapi entry is weapon-type-agnostic (e.g.
            &ldquo;Any melee weapon&rdquo;). Rename and edit the description to match your specific
            weapon or armor.
          </div>
        )}
        <ItemEditor card={draft} onChange={setDraft} />
        <div className={styles.formActions}>
          <Button variant="primary" onPress={handleSave} isDisabled={saveCard.isPending}>
            Save
          </Button>
          <Button variant="secondary" onPress={handleCancel}>
            Cancel
          </Button>
        </div>
      </div>
      <div className={styles.preview}>
        <div className={styles.previewLabel}>Preview (4-up size)</div>
        <AutoFitCard card={draft} layout="4-up" />
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Replace `EditorView.module.css`**

```css
.editor {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: var(--space-6);
  align-items: start;
}

.form {
  min-width: 0;
}

.formActions {
  display: flex;
  gap: var(--space-2);
  margin-top: var(--space-4);
  padding-top: var(--space-4);
  border-top: 1px solid var(--color-border);
}

.templateNotice {
  background: #fff8e1;
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-4);
  margin-bottom: var(--space-4);
  font-size: var(--fs-sm);
  color: #4a3c10;
  line-height: var(--lh-body);
}

.preview {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.previewLabel {
  font-size: var(--fs-sm);
  color: var(--color-text-muted);
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

@media (max-width: 900px) {
  .editor {
    grid-template-columns: 1fr;
  }
}
```

Note: `templateNotice` keeps its warm-yellow background because it's a notice/warning UI affordance (intentional non-token color), but its border, font sizes, and spacing now use tokens.

- [ ] **Step 3: Run EditorView tests, full suite, lint**

```bash
npm test -- EditorView
npm test
npm run lint
```

Expected: green. EditorView tests use button text/role, which is preserved.

- [ ] **Step 4: Commit**

```bash
git add src/views/EditorView.tsx src/views/EditorView.module.css
git commit -m "Migrate EditorView to shared Button and tokens"
```

---

## Phase 4 — Final pass

### Task 15: Test sweep, lint, build, manual smoke

**Files:** none (verification only)

- [ ] **Step 1: Run full test suite**

```bash
npm test
```

Expected: all tests green.

- [ ] **Step 2: Lint and format check**

```bash
npm run lint
```

Expected: pass.

- [ ] **Step 3: Production build**

```bash
npm run build
```

Expected: build succeeds. (`react-aria-components` produces some bundle warnings — that's fine.)

- [ ] **Step 4: Manual smoke checks against the dev server**

```bash
npm run dev
```

Walk through:

1. Visit `/`. Splash or deck-list page renders with parchment-tinted background and Cinzel-headed brand.
2. Click "Sign in". Login page shows two visually-matched provider buttons (white background, brand logos), plus the dev sign-in button.
3. Click "Sign in as Dev User". Header transitions to show the avatar circle on the right.
4. Click the avatar. Popover opens with the email + Sign out. Press Esc — popover closes.
5. Open or create a deck. Click "Browse from API". Type a query that filters down to a few results — modal does not shrink.
6. Use the 2014/2024 toggle. Both states render correctly (selected state in burgundy).
7. Press Esc. Modal closes.
8. Click "New card". Editor renders, Save and Cancel are styled with the new primary/secondary variants.
9. Print preview (Cmd+P): the print sheet renders unchanged (cards visual is untouched). Header is hidden in print.

Stop the dev server.

- [ ] **Step 5: Commit only if anything changed during smoke**

If something needed a fix, commit it now. Otherwise, skip this step.

```bash
git status
```

If clean, no commit.

---

## Self-review checklist

(Verification — performed before handing back to the user)

**Spec coverage:**
- Username alignment fix → Tasks 8 + 9 (UserMenu has `margin-left: auto`).
- OAuth provider buttons styled per provider → Tasks 4 + 7 + 10.
- Dialog height-jump fix → Task 11 (fixed modal height + `data-stable-size` test).
- React Aria Components adoption → Task 1 + Tasks 5–11.
- Self-hosted fonts → Tasks 1 + 3.
- Design tokens → Task 2.
- Subtle fantasy theme (Cinzel headings, parchment bg, burgundy accent) → Tasks 2 + 9 across views.
- User-menu dropdown → Task 8.
- Cards + PrintView untouched → no task references those files.
- Role-based test selectors → Tasks 11 (new selectors), 12–14 (preserve where needed).

**Placeholder scan:** None. Every step contains the exact code or command.

**Type / signature consistency:**
- `Button` props: `variant: "primary" | "secondary" | "danger"`, `size: "sm" | "md"`, plus all React Aria `ButtonProps`. Used consistently across migrations (Tasks 11–14).
- `IconButton` props: `variant: "secondary" | "danger"`, requires `aria-label`. Used in DeckView, HomeView, BrowseApiModal (close button).
- `OAuthButton` props: `provider: "google" | "github" | "dev"`, plus React Aria `ButtonProps`.
- `UserMenu` is a no-prop component; consumes `useSession()`.

**No spec gaps detected.**
