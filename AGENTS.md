# AGENTS.md

## Commands

```bash
npm start              # ng serve → localhost:4200
npm test               # Vitest via Angular CLI (not vitest directly)
npm test -- --include src/app/app.spec.ts   # single spec file
npm run build          # production build → dist/koq-store
npm run deploy         # npx vercel --prod
npm run preview        # npx vercel dev
```

No `vitest.config` — Angular builder manages Vitest. Use `--include` for filtering (not vitest CLI flags). No CI, no ESLint — only Prettier (config in `package.json` `"prettier"` key): 100w, single quotes, Angular HTML parser. npm@11.8.0 pinned.

## Stack

- **Angular 21** standalone (`class App`), bootstrapped via `bootstrapApplication` in `src/main.ts`
- **Zoneless** — no `zone.js`, no `provideZoneChangeDetection`. Do NOT import `NgZone`/`zone.runOutsideAngular()`. Use signals + `ChangeDetectorRef.markForCheck()`.
- **All components** use `ChangeDetectionStrategy.OnPush`, external `.html`/`.css` files, explicit `imports[]` arrays (no NgModules)
- **Vitest** with globals (`tsconfig.spec.json` `"types": ["vitest/globals"]`) — no `describe`/`it`/`expect` imports
- **Tailwind CSS v4** via `@tailwindcss/postcss` (`.postcssrc.json`); `@import 'tailwindcss'` in `styles.css`
- **Angular Material M3** (`material-theme.scss`, magenta primary). No `provideAnimations()` — do not add.
- **Material Icons Outlined** default (`MAT_ICON_DEFAULT_OPTIONS` in `app.config.ts`)
- Brand color `--color-koq: #ad65af` (Tailwind `@theme` in `styles.css`)
- `provideBrowserGlobalErrorListeners()` in `app.config.ts` — global error catcher
- Vercel deploy with SPA rewrites, output `dist/koq-store` (`vercel.json`)

## Architecture

```
src/app/
  app.ts / app.html / app.css     root component (just <router-outlet/>)
  app.config.ts                   router (withComponentInputBinding), icon defaults, error listeners
  core/
    guards/       auth.guard.ts, operador.guard.ts (CanActivateFn)
    services/     11 services (providedIn: 'root')
    utils/        supabase-utils.ts (toCamelCase T)
  shared/         sidebar, search-bar, filter-modal, product-edit-modal, variant-picker-modal
  layouts/        app-layout (route shell + sidebar)
  pages/          auth, catalog, transfer, create-product, ingreso, new-sale, alertas, historial, recepciones
  interfaces/     14 TS interfaces
  mocks/          14 .mock.ts — UNUSED (all services call Supabase directly)
```

Routes are Spanish slugs, all guarded by `authGuard` at the layout shell level:

| Path | Page dir | Guard |
|------|----------|-------|
| `/login` | `pages/auth/` | none |
| `/catalogo` (default) | `pages/catalog/` | auth |
| `/trasladar-stock` | `pages/transfer/` **(dir ≠ slug)** | auth |
| `/crear-producto` | `pages/create-product/` | auth + operador |
| `/ingreso` | `pages/ingreso/` | auth + operador |
| `/ventas/nueva` | `pages/new-sale/` | auth |
| `/alertas` | `pages/alertas/` | auth |
| `/historial` | `pages/historial/` | auth |
| `/recepciones` | `pages/recepciones/` | auth |

`withComponentInputBinding()` enabled — route params as `@Input()`. `**` redirects to `/login`. `pages/categorias/` has a component but no route (stale/abandoned).

## Auth & data

- **Supabase** JS client directly (no `provideHttpClient`). `getSupabase()` singleton (not injectable), URL + anon key **hardcoded** in `supabase.service.ts`; storage bucket `product-images`
- `AuthService` constructor calls `initialize()` (gets session from Supabase) — guards must `await auth.waitForInit()` before checking `auth.logged()`
- `adminOverride` defaults to `signal(true)` (sidebar toggle simulates admin); `isAdmin()` = `adminOverride() && role === 'admin'`; `isOperator()` = `role === 'operator'`
- `operadorGuard`: allows admin OR `currentUser().idLocation === '1'` (string); redirects to `/catalogo` on deny
- Login accepts username or email (looks up email from `users` table if username)
- `toCamelCase<T>()` maps snake_case → camelCase on ALL Supabase query results
- DB schema: `seed_catalogo.sql` at repo root (categories, colors, clothing_models, products, stock_locations, clothing_model_colors). Supabase RLS not active.
- Operators filtered by `idLocation` in catalog/alertas/history/receptions/sales services

## Tests

- 5 spec files (`app`, `new-sale`, `alertas`, `historial`, `recepciones`) — smoke tests, no service mocking
- All follow the same pattern: `TestBed.configureTestingModule({ imports: [Component] })`, no providers array
- Set `auth.logged.set(true)` in `beforeEach` to bypass login
- `.vscode/launch.json` `ng test` debug config references Karma port `9876` — stale/misleading (Vitest doesn't use it)

## Codegen

`ng g c foo` → `foo.component.ts` (schematic `"type": "component"` prefix in `angular.json`)

