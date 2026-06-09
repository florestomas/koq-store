# AGENTS.md

## Commands

```bash
npm start              # ng serve (--poll 2000 in config) → localhost:4200
npm test               # Vitest via @angular/build:unit-test (not vitest CLI)
npm test -- --include src/app/app.spec.ts   # single spec file
npm run build          # production build → dist/koq-store
npm run deploy         # npx vercel --prod
npm run preview        # npx vercel dev
```

No `vitest.config` — Angular builder manages Vitest. Use `--include` for filtering (not vitest flags). No ESLint — only Prettier (`package.json` `"prettier"` key): 100w, single quotes, Angular HTML parser. npm@11.8.0 pinned.

## Stack

- **Angular 21** standalone, bootstrapped via `bootstrapApplication` in `src/main.ts`
- **Zoneless** — no `zone.js`, no `provideZoneChangeDetection`. Do NOT import `NgZone`/`zone.runOutsideAngular()`. Use signals + `ChangeDetectorRef.markForCheck()`.
- **All components** use `ChangeDetectionStrategy.OnPush`, external `.html`/`.css` files, explicit `imports[]` arrays (no NgModules)
- **Vitest** with globals (`tsconfig.spec.json` `"types": ["vitest/globals"]`) — no `describe`/`it`/`expect` imports
- **Tailwind CSS v4** via `@tailwindcss/postcss` (`.postcssrc.json`); `@import 'tailwindcss'` in `styles.css`
- **Angular Material M3** (`material-theme.scss`, magenta primary). No `provideAnimations()` — do not add.
- **Material Icons Outlined** default (`MAT_ICON_DEFAULT_OPTIONS` in `app.config.ts`)
- Brand color `--color-koq: #ad65af` (Tailwind `@theme` in `styles.css`)
- `provideBrowserGlobalErrorListeners()` in `app.config.ts` — global error catcher
- Vercel deploy with SPA rewrites, output `dist/koq-store/browser` (`vercel.json`)
- **Supabase** JS client directly (no `provideHttpClient`). Hardcoded URL + anon key in `supabase.service.ts`. Storage bucket `product-images`.

## Architecture

```
src/app/
  app.ts / app.html / app.css     root component (just <router-outlet/>)
  app.config.ts                   router + icon defaults + error listeners
  core/
    guards/       auth.guard.ts, operador.guard.ts (CanActivateFn)
    services/     11 services (providedIn: 'root')
    utils/        supabase-utils.ts (toCamelCase T), colors.ts (getColorHex)
  shared/         sidebar, search-bar, filter-modal, product-edit-modal, variant-picker-modal
  layouts/        app-layout (route shell + sidebar)
  pages/          auth, catalog, transfer, create-product, ingreso, new-sale, alertas, historial, recepciones
  interfaces/     14 TS interfaces
  mocks/          14 .mock.ts — UNUSED (all services call Supabase directly)
```

Routes (Spanish slugs, `withComponentInputBinding` enabled):

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

`**` redirects to `/login`. `pages/categorias/` has a component but no route (stale).

Component nesting: `catalog/` → `components/product-card/` → `stock-badge.component`. Most other pages are flat.

## Auth

- `AuthService` constructor calls `initialize()` (gets session from Supabase) — guards must `await auth.waitForInit()` before checking `auth.logged()`
- `adminOverride` defaults to `signal(true)` (sidebar toggle simulates admin); `isAdmin()` = `adminOverride() && role === 'admin'`
- `operadorGuard`: allows admin OR `currentUser().idLocation === '1'` (string); redirects to `/catalogo` on deny
- Login accepts username or email (looks up email from `users` table if username)
- `toCamelCase<T>()` maps snake_case → camelCase on ALL Supabase query results
- Operators filtered by `idLocation` in catalog/alertas/history/receptions/sales services

## Color utility

`core/utils/colors.ts` — hardcoded hex map for 36 colors. Usage:

```ts
import { getColorHex } from '../../core/utils/colors';
// In component: readonly getColorHex = getColorHex;
// In template: [style.background]="getColorHex(colorName)"
```

Color names are uppercase (e.g. `NEGRO`, `VERDE PETROLEO`). The function normalizes with `.toUpperCase().trim()`. Fallback hex `#cccccc`.

## Tests

- 5 spec files (`app`, `new-sale`, `alertas`, `historial`, `recepciones`) — smoke tests, no service mocking
- Pattern: `TestBed.configureTestingModule({ imports: [Component] })`. Some provide `Router` mock if component injects it.
- Auth/Router guards are NOT mocked — tests import the component standalone; rely on `fixture.detectChanges()` not triggering guard logic

## Codegen

`ng g c foo` → `foo.component.ts` (schematic `"type": "component"` prefix in `angular.json`)

## Stale

- `.vscode/launch.json` references Karma port `9876` — Vitest doesn't use it
