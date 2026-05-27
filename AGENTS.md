# AGENTS.md

## Commands

```bash
npm start              # dev server (http://localhost:4200)
npm test               # run unit tests (Vitest)
npm test -- --include src/app/app.spec.ts  # run a single test file
npm run build          # production build → dist/
```

## Tech stack

- Angular 21 (standalone components — no NgModules)
- Vitest (not Jasmine/Karma) for unit tests
- Tailwind CSS v4 via PostCSS (`@tailwindcss/postcss`)
- Angular Material (M3 theming) with Material Icons Outlined by default
- Prettier: 100 print width, single quotes, Angular parser for `.html` — config in `package.json` (no `.prettierrc`), no ESLint in the project

## Architecture

```
src/app/
  core/          guards, services (providedIn: 'root')
  shared/        reusable UI components (sidebar, search-bar)
  layouts/       route-level layout components
  pages/         routed feature components (auth, catalog, transfer, create-product)
  interfaces/    TypeScript interfaces
  mocks/         hard-coded mock data (no real backend yet)
```

- Single project, single app: `src/main.ts` bootstraps `App` with `appConfig`
- Routes defined in `app.routes.ts`, guards are functional (`CanActivateFn`)
- Route paths use Spanish slugs: `/catalogo`, `/transferencia`, `/crear-producto`, `/ventas/nueva`, `/alertas`, `/historial`, `/recepciones`

## Conventions & gotchas

- Components use `ChangeDetectionStrategy.OnPush` by default
- Templates are external (`.html` files), as configured in `.vscode/settings.json`
- `AuthService.logged` is `signal(true)` by default so the app skips login during development
- Tests use Vitest globals (configured in `tsconfig.spec.json`); no need to import `describe`/`it`/`expect`
- Mock data arrays in `src/app/mocks/` are mutated at runtime (CreateProduct, TransferService) — stateful across the session
- Spec files: `app.spec.ts`, `new-sale.spec.ts`, `alertas.spec.ts`, `historial.spec.ts`, `recepciones.spec.ts`
- New mock transactions (confirm sale, cancel sale, confirm reception) mutate `STOCK_LOCATIONS`, `TRANSFERS`, and `TRANSFER_DETAILS` arrays in place — stateful across the session
- Expandable detail panels use CSS `grid-template-rows` transition (0fr → 1fr) with `overflow: hidden` for smooth animation
- Print views use `@media print` + `.no-print` class (native `window.print()`)
- All confirmation dialogs use `window.confirm()` (no Material dialog pattern yet)

## Role-Based Access Control (RBAC)

### Layer 1 — Route guards
- `authGuard` on the entire layout: blocks unauthenticated users
- `operadorGuard` on `/transferencia` and `/crear-producto`: blocks `operator` role, redirects to `/catalogo`

### Layer 2 — UI & service enforcement
- **Sidebar**: `CREAR PRODUCTO` nav item hidden for operators
- **Catalog**: `setLocationFilter()` is a no-op for operators; `filteredItems` computed forces `idLocation` to operator's own location
- **Alerts**: service filters by `idLocation` for operators; location filter bar hidden
- **History**: service filters by `idLocation` for operators; location `<select>` hidden
- **Receptions**: service filters pending transfers by `idDestination` for operators
- **Sales**: `new-sale` component reads stock and writes sale using the user's `idLocation`

### Supabase RLS policies (to implement when backend is active)
```sql
-- stock_locations: operators see only their location
CREATE POLICY "operator_select_own_location" ON stock_locations
  FOR SELECT USING (
    auth.jwt() ->> 'role' = 'operator'
    AND id_location = (auth.jwt() ->> 'id_location')::int
  );

-- stock_locations: only admins can write
CREATE POLICY "admin_write_stock" ON stock_locations
  FOR INSERT WITH CHECK ((auth.jwt() ->> 'role') = 'admin');
CREATE POLICY "admin_update_stock" ON stock_locations
  FOR UPDATE USING ((auth.jwt() ->> 'role') = 'admin');

-- sales: operators select/insert only their location
CREATE POLICY "operator_sales_scope" ON sales
  FOR ALL USING (
    auth.jwt() ->> 'role' = 'operator'
    AND id_location = (auth.jwt() ->> 'id_location')::int
  );

-- transfers: admins only
CREATE POLICY "admin_transfers" ON transfers
  FOR ALL USING ((auth.jwt() ->> 'role') = 'admin');

-- products / clothing_models / colors / categories: admins only
CREATE POLICY "admin_write_catalog" ON clothing_models
  FOR INSERT WITH CHECK ((auth.jwt() ->> 'role') = 'admin');
CREATE POLICY "admin_write_products" ON products
  FOR INSERT WITH CHECK ((auth.jwt() ->> 'role') = 'admin');
```
