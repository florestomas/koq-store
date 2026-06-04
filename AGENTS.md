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

No `vitest.config` — Angular builder manages Vitest. You cannot pass vitest CLI flags; use `--include` for filtering.
No CI (no `.github/`). No ESLint — only Prettier (100w, single quotes, Angular HTML parser).

## Stack

- **Angular 21** standalone (`class App`, not `AppComponent`), bootstrapped in `src/main.ts`
- **Zoneless** — no `zone.js` dep, no `provideZoneChangeDetection`. Do NOT import `NgZone`/`zone.runOutsideAngular()`. Use signals + `ChangeDetectorRef.markForCheck()`.
- **All components** use `ChangeDetectionStrategy.OnPush`, external `.html` templates, explicit `imports[]` arrays (no NgModules)
- **Vitest** with globals (`tsconfig.spec.json` `"types": ["vitest/globals"]`) — no `describe`/`it`/`expect` imports needed
- **Tailwind CSS v4** via `@tailwindcss/postcss`; `@import 'tailwindcss'` in `styles.css`. No `postcss.config.js` — Angular build handles it.
- **Angular Material M3** (`material-theme.scss`, magenta primary). No `provideAnimations()` in `app.config.ts` — do not add it.
- **Material Icons Outlined** as default icon set (configured in `app.config.ts`)
- Brand color `--color-koq: #ad65af` (Tailwind `@theme` in `styles.css`)
- Vercel deploy: SPA rewrites in `vercel.json`, output `dist/koq-store`
- npm@11.8.0 pinned as package manager

## Architecture

```
src/app/
  app.ts / app.html / app.css     root component (class App); app.html is just <router-outlet/>
  app.config.ts                   providers: router, icon defaults, global error listeners
  app.routes.ts                   route definitions
  core/
    guards/       auth.guard.ts, operador.guard.ts (functional CanActivateFn)
    services/     11 services (providedIn: 'root')
    utils/        supabase-utils.ts (snake→camel mapper)
  shared/         sidebar (nav-item), search-bar, filter-modal, product-edit-modal, variant-picker-modal
  layouts/        app-layout (route shell + sidebar)
  pages/          auth, catalog, transfer, create-product, ingreso, new-sale, alertas, historial, recepciones
  interfaces/     14 TS interfaces
  mocks/          14 .mock.ts files — unused (all services call Supabase directly)
```

### Routes (Spanish slugs, layout shell guards all children)

| Path | Page dir | Admin only? |
|------|----------|-------------|
| `/login` | `pages/auth/` | — |
| `/catalogo` (default) | `pages/catalog/` | |
| `/trasladar-stock` | `pages/transfer/` (note mismatch) | |
| `/crear-producto` | `pages/create-product/` | yes |
| `/ingreso` | `pages/ingreso/` | yes |
| `/ventas/nueva` | `pages/new-sale/` | |
| `/alertas` | `pages/alertas/` | |
| `/historial` | `pages/historial/` | |
| `/recepciones` | `pages/recepciones/` | |

- `withComponentInputBinding()` enabled — route params mapped as `@Input()` bindings
- `provideBrowserGlobalErrorListeners()` in config (Angular 19+ API)
- Redirect: `**` → `/login`

## Conventions

### Auth

- `AuthService.logged` defaults to `signal(false)` — set `logged.set(true)` in test `beforeEach` to skip login
- `AuthService.adminOverride` defaults to `signal(true)` — sidebar can toggle this for ADMIN/OPERADOR simulation; `isAdmin()` computed as `adminOverride() && role === 'admin'`
- Guards call `await auth.waitForInit()` before checking auth — async session init on construction
- Supabase accessed via `getSupabase()` singleton function (not an injectable class); URL + anon key **hardcoded** in `supabase.service.ts`
- Storage bucket: `product-images`

### Data

- All services `providedIn: 'root'`; no `provideHttpClient` — all data through Supabase
- `toCamelCase<T>()` maps Supabase snake_case → camelCase on all query results

### Codegen

- `ng g c foo --type=component` → `foo.component.ts` (schematic prefix configured in `angular.json`)

### Tests

- 5 spec files: `app`, `new-sale`, `alertas`, `historial`, `recepciones` — basic smoke tests, no service mocking
- `.vscode/launch.json` `ng test` debug config references Karma port `9876` — **stale, Vitest doesn't use this**

### RBAC

- Route `operadorGuard` blocks `/crear-producto`, `/ingreso` for operators → redirects `/catalogo`
- Sidebar hides CREAR PRODUCTO/INGRESO when `isAdmin()` is false
- Catalog/alertas/history/receptions/sales services filter by operator's `idLocation`
- Supabase RLS: not active
