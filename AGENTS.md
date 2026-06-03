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

## Tech stack

- Angular 21, standalone components (no NgModules), app bootstrapped in `src/main.ts`
- Vitest (not Jasmine/Karma), globals enabled via `tsconfig.spec.json` — no `describe`/`it`/`expect` imports needed
- Tailwind CSS v4 via `@tailwindcss/postcss` (`.postcssrc.json`); import with `@import 'tailwindcss'` in `styles.css`
- Angular Material M3 theming (`material-theme.scss`), Material Icons Outlined as default icon set
- Prettier config in `package.json`: 100 print width, single quotes, Angular parser for `.html` — **no ESLint**
- Package manager pinned: `npm@11.8.0`
- Brand color: `--color-koq: #ad65af` (Tailwind theme in `styles.css`)
- Angular CLI MCP server available via `.vscode/mcp.json` (`npx @angular/cli mcp`)
- Vercel deploy target: `vercel.json` configures SPA rewrites; output dir is `dist/koq-store`

## Architecture

```
src/app/
  app.ts / app.html / app.css   root component (class named App, not AppComponent)
  app.config.ts                 providers (router, icon defaults, global error listeners)
  app.routes.ts                 route definitions
  app.spec.ts                   root spec
  core/
    guards/       auth.guard.ts, operador.guard.ts (functional CanActivateFn)
    services/     11 services (providedIn: 'root'): auth, catalog, sale, reception, alert,
                  ingreso, transfer, transfer-history, sales-history, stock-movement, supabase
    utils/        supabase-utils.ts (toCamelCase snake→camel mapper)
  shared/         search-bar, sidebar (with nav-item), filter-modal, product-edit-modal, variant-picker-modal
  layouts/        app-layout (route shell with sidebar)
  pages/          auth, catalog, transfer, create-product, ingreso, new-sale, alertas, historial, recepciones
  interfaces/     14 TypeScript interface files
  mocks/          unused — all services hit Supabase directly
```

- Routes use Spanish slugs: `/catalogo`, `/transferencia`, `/crear-producto`, `/ingreso`, `/ventas/nueva`, `/alertas`, `/historial`, `/recepciones`
- Router uses `withComponentInputBinding()` — route params arrive as `@Input()` bindings
- Components use `ChangeDetectionStrategy.OnPush`, external templates (`.html` files)
- `app.config.ts` uses `provideBrowserGlobalErrorListeners()` (Angular 19+ API)
- Supabase client in `supabase.service.ts` — URL + anon key **hardcoded** (no env vars)
- No `provideHttpClient` — all data goes through Supabase; storage bucket name is `product-images`
- `ng serve` has `"poll": 2000` in `angular.json` (useful for WSL/network mounts)

## Conventions

- `AuthService.logged` defaults to `signal(false)` — set to `true` in tests or during development to skip login
- **`adminOverride`**: `AuthService` has a `signal(true)` flag. Sidebar shows an ADMIN/OPERADOR toggle button; when off, `isAdmin()` returns `false` even for admin users. Useful to test operator flows without creating a separate operator account.
- Tests use Vitest globals. Existing spec files: `app`, `new-sale`, `alertas`, `historial`, `recepciones`
- Expandable panels use CSS `grid-template-rows: 0fr → 1fr` + `overflow: hidden` for animation
- Print views: `@media print` + `.no-print` class, triggered via `window.print()`
- All confirmation dialogs use `window.confirm()` (no Material dialog pattern)
- All generated schematics use type suffix (e.g. `ng g c foo --type=component` produces `foo.component.ts`)
- `.vscode/launch.json` `ng test` debug config still points to port `9876` (Karma-era URL) — **stale for Vitest**

## RBAC

- **Route guards**: `authGuard` on layout; `operadorGuard` on `/crear-producto` and `/ingreso` (redirects operators to `/catalogo`)
- **UI enforcement**: sidebar conditionally shows CREAR PRODUCTO and INGRESO only when `isAdmin()` is true; catalog/alertas/history/receptions/sales services filter by operator's `idLocation`
- **Supabase RLS**: not yet active
