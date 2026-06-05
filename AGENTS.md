# AGENTS.md

## Commands

```bash
npm start              # ng serve → http://localhost:4200 (polls files every 2s)
npm test               # Vitest via Angular CLI (not vitest directly)
npm test -- --include src/app/app.spec.ts   # single spec
npm run build          # production build → dist/koq-store
npm run deploy         # npx vercel --prod
npm run preview        # npx vercel dev
```

No `vitest.config` — Angular builder manages Vitest. Use `--include` for filtering (not vitest CLI flags). No CI, no ESLint — only Prettier (100w, single quotes, Angular HTML parser in `package.json`).

## Stack

- **Angular 21** standalone (`class App`, not `AppComponent`), bootstrapped via `bootstrapApplication` in `src/main.ts`
- **Zoneless** — no `zone.js`, no `provideZoneChangeDetection`. Do NOT import `NgZone`/`zone.runOutsideAngular()`. Use signals + `ChangeDetectorRef.markForCheck()`.
- **All components** use `ChangeDetectionStrategy.OnPush`, external `.html` templates, explicit `imports[]` arrays (no NgModules)
- **Vitest** with globals (`tsconfig.spec.json` `"types": ["vitest/globals"]`) — no `describe`/`it`/`expect` imports needed
- **Tailwind CSS v4** via `@tailwindcss/postcss` (`.postcssrc.json`); `@import 'tailwindcss'` in `styles.css`. No `postcss.config.js`.
- **Angular Material M3** (`material-theme.scss`, magenta primary). No `provideAnimations()` — do not add it.
- **Material Icons Outlined** as default icon set (`MAT_ICON_DEFAULT_OPTIONS` in `app.config.ts`)
- Brand color `--color-koq: #ad65af` (Tailwind `@theme` in `styles.css`)
- npm@11.8.0 pinned; Vercel deploy SPA rewrites, output `dist/koq-store`

## Architecture

```
src/app/
  app.ts / app.html / app.css     root component (class App); app.html is just <router-outlet/>
  app.config.ts                   providers: router withComponentInputBinding, icon defaults, global error listeners
  app.routes.ts                   route definitions
  core/
    guards/       auth.guard.ts, operador.guard.ts (functional CanActivateFn)
    services/     11 services (providedIn: 'root')
    utils/        supabase-utils.ts (toCamelCase snake→camel mapper)
  shared/         sidebar, search-bar, filter-modal, product-edit-modal, variant-picker-modal
  layouts/        app-layout (route shell + sidebar)
  pages/          auth, catalog, transfer, create-product, ingreso, new-sale, alertas, historial, recepciones
  interfaces/     14 TS interfaces
  mocks/          14 .mock.ts files — UNUSED (all services call Supabase directly)
```

Routes are Spanish slugs, all guarded by `authGuard` at the layout shell level:

| Path | Page dir | Admin only? |
|------|----------|-------------|
| `/login` | `pages/auth/` | — |
| `/catalogo` (default) | `pages/catalog/` | |
| `/trasladar-stock` | `pages/transfer/` **(dir mismatch)** | |
| `/crear-producto` | `pages/create-product/` | yes |
| `/ingreso` | `pages/ingreso/` | yes |
| `/ventas/nueva` | `pages/new-sale/` | |
| `/alertas` | `pages/alertas/` | |
| `/historial` | `pages/historial/` | |
| `/recepciones` | `pages/recepciones/` | |

`withComponentInputBinding()` enabled (route params as `@Input()`). `**` redirects to `/login`.

## Auth

- `AuthService.logged` defaults to `signal(false)` — set `logged.set(true)` in test `beforeEach` to skip login
- `adminOverride` defaults to `signal(true)` (sidebar toggle for ADMIN/OPERADOR simulation); `isAdmin()` = `adminOverride() && role === 'admin'`
- Guards call `await auth.waitForInit()` before checking auth — async session init on construction
- Supabase: `getSupabase()` singleton (not injectable), URL + anon key **hardcoded** in `supabase.service.ts`; storage bucket `product-images`
- Login supports username or email; operators filtered by `idLocation` in catalog/alertas/history/receptions/sales services
- Supabase RLS not active

## Data

- All data through Supabase (no `provideHttpClient`). `toCamelCase<T>()` maps snake_case → camelCase on all query results.
- DB schema reference: `seed_catalogo.sql` at repo root (categories, colors, clothing_models, products, stock_locations, clothing_model_colors with PL/pgSQL seed logic and 4 locations)

## Tests

- 5 spec files: `app`, `new-sale`, `alertas`, `historial`, `recepciones` — basic smoke tests, no service mocking
- `.vscode/launch.json` `ng test` debug config references Karma port `9876` — stale (Vitest doesn't use it)

## Codegen

`ng g c foo --type=component` → `foo.component.ts` (schematic `type` prefix in `angular.json`)

