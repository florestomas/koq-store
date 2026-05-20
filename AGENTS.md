# AGENTS.md

## Commands

```bash
npm start              # dev server (http://localhost:4200)
npm test               # run unit tests (Vitest)
npx vitest --run       # run tests directly without Angular CLI
npx vitest --run src/app/app.spec.ts  # run a single test file
npm run build          # production build → dist/
```

## Tech stack

- Angular 21 (standalone components — no NgModules)
- Vitest (not Jasmine/Karma) for unit tests
- Tailwind CSS v4 via PostCSS (`@tailwindcss/postcss`)
- Angular Material (M3 theming) with Material Icons Outlined by default
- Prettier: 100 print width, single quotes, Angular parser for `.html`

## Architecture

```
src/app/
  core/          guards, services (providedIn: 'root')
  shared/        reusable UI components (sidebar, search-bar)
  layouts/       route-level layout components
  pages/         routed feature components (auth, catalog)
  interfaces/    TypeScript interfaces
  mocks/         hard-coded mock data (no real backend yet)
```

- Single project, single app: `src/main.ts` bootstraps `App` with `appConfig`
- Routes defined in `app.routes.ts`, guards are functional (`CanActivateFn`)

## Conventions & gotchas

- Components use `ChangeDetectionStrategy.OnPush` by default
- Templates are external (`.html` files), as configured in `.vscode/settings.json`
- `AuthService.logged` is `signal(true)` by default so the app skips login during development
- Tests use Vitest globals (configured in `tsconfig.spec.json`); no need to import `describe`/`it`/`expect`
