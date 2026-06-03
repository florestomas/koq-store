# AGENTS.md

## Commands

```bash
npm start              # dev server → http://localhost:4200 (file polling every 2s)
npm test               # Vitest via Angular CLI (`@angular/build:unit-test`)
npm test -- --include src/app/app.spec.ts  # single spec file
npm run build          # production build → dist/
npm run deploy         # npx vercel --prod
npm run preview        # npx vercel dev
```

No `vitest.config` — Angular build system manages Vitest under the hood.

## Stack

- **Angular 21** standalone (class `App`, not `AppComponent`), bootstrapped in `src/main.ts`
- **Vitest** (no Jasmine/Karma), globals via `tsconfig.spec.json` — no `describe`/`it`/`expect` imports
- **Tailwind CSS v4** via `@tailwindcss/postcss`; `@import 'tailwindcss'` in `styles.css`
- **Angular Material M3** (`material-theme.scss`), Material Icons Outlined as default icon set
- **Prettier** in `package.json` (100w, single quotes, Angular parser for `.html`) — no ESLint
- **npm@11.8.0** pinned as package manager
- Brand color `--color-koq: #ad65af` (Tailwind `@theme` in `styles.css`)
- Angular CLI MCP via `.vscode/mcp.json` (`npx @angular/cli mcp`)
- Vercel deploy: `vercel.json` SPA rewrites, output `dist/koq-store`

## Architecture

```
src/app/
  app.ts / app.html / app.css     root component (class App)
  app.config.ts                   providers (router, icon defaults, error listeners)
  app.routes.ts                   route definitions
  core/
    guards/       auth.guard.ts, operador.guard.ts (functional CanActivateFn)
    services/     11 services (providedIn: 'root')
    utils/        supabase-utils.ts (snake→camel mapper)
  shared/         sidebar (nav-item), search-bar, filter-modal, product-edit-modal, variant-picker-modal
  layouts/        app-layout (route shell + sidebar)
  pages/          auth, catalog, transfer, create-product, ingreso, new-sale, alertas, historial, recepciones
  interfaces/     14 TS interfaces
  mocks/          unused — all services call Supabase directly
```

- Routes use Spanish slugs (`/catalogo`, `/transferencia`, `/crear-producto`, `/ingreso`, `/ventas/nueva`, `/alertas`, `/historial`, `/recepciones`); default redirect `/` → `/catalogo`
- `withComponentInputBinding()` — route params as `@Input()` bindings
- `ChangeDetectionStrategy.OnPush` on all components; external `.html` templates
- `app.config.ts` uses `provideBrowserGlobalErrorListeners()` (Angular 19+ API)
- Supabase URL + anon key **hardcoded** in `supabase.service.ts` (no env vars); storage bucket: `product-images`
- `ng serve` has `"poll": 2000` in `angular.json` (WSL/network mounts)
- `mocks/` directory exists but is **unused** — all services hit Supabase directly

## Conventions

### Auth
- `AuthService.logged` defaults to `signal(false)` — set `true` in tests to skip login
- `AuthService.adminOverride` defaults to `signal(true)` — sidebar ADMIN/OPERADOR toggle; `isAdmin()` returns `false` when off (test operator flows without separate account)
- Guards call `await auth.waitForInit()` before checking auth (async session init)
- Supabase accessed via `getSupabase()` singleton function from `supabase.service.ts` (not a class-based injectable)

### Data
- `toCamelCase()` in `core/utils/supabase-utils.ts` maps Supabase snake_case → camelCase for all query results
- All `providedIn: 'root'` services; no `provideHttpClient` — all data through Supabase

### Codegen
- `ng g c foo --type=component` produces `foo.component.ts` (suffix configured in `angular.json` schematics)

### Tests
- Vitest globals — 5 spec files: `app`, `new-sale`, `alertas`, `historial`, `recepciones`
- `.vscode/launch.json` `ng test` debug config still on port `9876` (Karma-era) — **stale for Vitest**

## RBAC

- **Route guards**: `authGuard` on layout shell; `operadorGuard` blocks `/crear-producto` and `/ingreso` for operators (redirects to `/catalogo`)
- **UI enforcement**: sidebar hides CREAR PRODUCTO and INGRESO when `isAdmin()` is false; catalog/alertas/history/receptions/sales services filter by operator's `idLocation`
- **Supabase RLS**: not yet active
