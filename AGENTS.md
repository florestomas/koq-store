# AGENTS.md

## Commands

```bash
npm start              # dev server → http://localhost:4200 (file polling every 2s)
npm test               # Vitest via Angular CLI (`@angular/build:unit-test`)
npm test -- --include src/app/app.spec.ts  # single spec file
npm run build          # production build → dist/
```

No `vitest.config` — Angular build system manages Vitest under the hood.

## Tech stack

- Angular 21, standalone components (no NgModules), app bootstrapped in `src/main.ts`
- Vitest (not Jasmine/Karma), globals enabled via `tsconfig.spec.json` — no `describe`/`it`/`expect` imports needed
- Tailwind CSS v4 via `@tailwindcss/postcss` (`.postcssrc.json`)
- Angular Material M3 theming (`material-theme.scss`), Material Icons Outlined as default icon set
- Prettier config in `package.json`: 100 print width, single quotes, Angular parser for `.html` — **no ESLint**
- Package manager pinned: `npm@11.8.0`

## Architecture

```
src/app/
  core/          guards, services (providedIn: 'root'), utils
  shared/        reusable UI: sidebar, search-bar, modals
  layouts/       app-layout (route shell with sidebar)
  pages/         routed feature components (auth, catalog, transfer, create-product, new-sale, alertas, historial, recepciones)
  interfaces/    TypeScript interfaces (14 files)
  mocks/         unused — all services hit Supabase directly
```

- Routes in `app.routes.ts`, functional guards (`CanActivateFn`)
- Route paths: Spanish slugs (`/catalogo`, `/transferencia`, `/crear-producto`, `/ventas/nueva`, `/alertas`, `/historial`, `/recepciones`)
- Components use `ChangeDetectionStrategy.OnPush`, external templates (`.html` files)
- Supabase client in `supabase.service.ts` — URL + anon key **hardcoded** (no env vars)

## Conventions

- `AuthService.logged` defaults to `signal(false)` — set to `true` in tests or during development to skip login
- Tests use Vitest globals; existing spec files: `app`, `new-sale`, `alertas`, `historial`, `recepciones`
- Expandable panels use CSS `grid-template-rows: 0fr → 1fr` + `overflow: hidden` for animation
- Print views: `@media print` + `.no-print` class, triggered via `window.print()`
- All confirmation dialogs use `window.confirm()` (no Material dialog pattern)

## RBAC

- **Route guards**: `authGuard` on layout, `operadorGuard` on `/transferencia` and `/crear-producto` (redirects operators to `/catalogo`)
- **UI enforcement**: sidebar hides CREAR PRODUCTO for operators; catalog/alertas/history/receptions/sales services filter by operator's `idLocation`
- **Supabase RLS**: not yet active — SQL policies in AGENTS.md commit history for reference when backend goes live

## Diffs from default Angular

- `ng serve` has `"poll": 2000` in `angular.json` (useful for WSL/network mounts)
- `.vscode/launch.json` debug config for `ng test` points to port `9876` (Karma-era URL) — **stale for Vitest**
- Angular CLI MCP server available via `.vscode/mcp.json` (`npx @angular/cli mcp`)
- No CI/CD workflows in repository
