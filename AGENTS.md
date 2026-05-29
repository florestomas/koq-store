# AGENTS.md

## Commands

```bash
npm start              # dev server (http://localhost:4200), polls fs every 2s
npm test               # run unit tests (Vitest)
npm test -- --include src/app/app.spec.ts  # run a single test file
npm run build          # production build → dist/
```

## Tech stack

- Angular 21 (standalone components — no NgModules)
- Vitest (not Jasmine/Karma) for unit tests, via `@angular/build:unit-test` builder
- Tailwind CSS v4 via PostCSS (`@tailwindcss/postcss`) — no `postcss.config.js` or `tailwind.config.js` (integrated through Angular builder)
- Angular Material (M3 theming) with Material Icons Outlined by default
- Prettier: 100 print width, single quotes, Angular parser for `.html` — config in `package.json` (no `.prettierrc`), no ESLint in the project

## Architecture

```
src/app/
  core/          guards, services, utils (providedIn: 'root' or module-level singletons)
  shared/        reusable UI components (sidebar, search-bar, product-edit-modal, filter-modal, variant-picker-modal)
  layouts/       route-level layout components
  pages/         routed feature components (auth, catalog, transfer, create-product, new-sale, alertas, historial, recepciones)
  interfaces/    TypeScript interfaces
  services/      empty — unused directory
  mocks/         unused — kept as reference, all services now hit Supabase directly
```

- Single project, single app: `src/main.ts` bootstraps `App` with `appConfig`
- Routes defined in `app.routes.ts`, guards are functional (`CanActivateFn`)
- Route paths use Spanish slugs: `/catalogo`, `/transferencia`, `/crear-producto`, `/ventas/nueva`, `/alertas`, `/historial`, `/recepciones`
- Supabase anon key is hardcoded in `src/app/core/services/supabase.service.ts` — no `.env` files

## Conventions & gotchas

- Components use `ChangeDetectionStrategy.OnPush` by default
- Templates are external (`.html` files), as configured in `.vscode/settings.json`
- `AuthService.logged` is `signal(false)` initially; auth is restored from the cached Supabase session in `initialize()` (constructor), so users auto-login if they have an active session in localStorage
- `authGuard` calls `auth.waitForInit()` (async) before checking auth state
- Tests use Vitest globals (configured in `tsconfig.spec.json`); no need to import `describe`/`it`/`expect`
- Spec files: `app.spec.ts`, `new-sale.spec.ts`, `alertas.spec.ts`, `historial.spec.ts`, `recepciones.spec.ts`
- Expandable detail panels use CSS `grid-template-rows` transition (0fr → 1fr) with `overflow: hidden` for smooth animation
- Print views use `@media print` + `.no-print` class (native `window.print()`)
- All confirmation dialogs use `window.confirm()` (no Material dialog pattern yet)
- All Supabase queries use the module-level singleton from `getSupabase()`, never `createClient()` directly
- Snake_case column names from Supabase are mapped to camelCase via `toCamelCase()` utility

## Role-Based Access Control (RBAC)

### Layer 1 — Route guards
- `authGuard` on the entire layout: blocks unauthenticated users
- `operadorGuard` on `/crear-producto`: blocks `operator` role, redirects to `/catalogo`

### Layer 2 — UI & service enforcement
- **Sidebar**: `CREAR PRODUCTO` nav item hidden for operators
- **Catalog**: `setLocationFilter()` is a no-op for operators; `filteredItems` computed forces `idLocation` to operator's own location
- **Alerts**: service filters by `idLocation` for operators; location filter bar hidden
- **History**: service filters by `idLocation` for operators; location `<select>` hidden
- **Receptions**: service filters pending transfers by `idDestination` for operators
- **Sales**: `new-sale` component reads stock and writes sale using the user's `idLocation`

### Supabase RLS policies (reference for backend activation)

Policies below use `auth.role() = 'authenticated'` — grants access to any logged-in user.
App-level RBAC (route guards, service enforcement, UI hiding) handles the actual admin/operator split.
For per-role RLS (future), a Supabase Auth Hook must inject `role` and `id_location` into JWT claims.

```sql
CREATE POLICY "authenticated_all" ON clothing_models FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_all" ON products FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_all" ON stock_locations FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_all" ON sales FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_all" ON transfers FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_all" ON transfer_details FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_all" ON sale_details FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_all" ON stock_movements FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_all" ON clothing_model_colors FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_all" ON colors FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_all" ON categories FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_all" ON locations FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_all" ON users FOR ALL USING (auth.role() = 'authenticated');
```

## Supabase Storage — product images

Images are uploaded to the `product-images` bucket. Upload/delete helpers live in `supabase.service.ts`.

**One-time bucket setup** (Supabase Dashboard → Storage → New Bucket):

1. Bucket name: `product-images`
2. Make it **public** (uncheck "Make bucket private")
3. Storage policy — allow public SELECT and authenticated INSERT/DELETE:

```sql
-- Allow public read access to product images
CREATE POLICY "public_read_product_images" ON storage.objects
  FOR SELECT USING (bucket_id = 'product-images');

-- Allow authenticated users to upload/delete images
CREATE POLICY "authenticated_manage_product_images" ON storage.objects
  FOR ALL USING (
    bucket_id = 'product-images'
    AND auth.role() = 'authenticated'
  );
```
