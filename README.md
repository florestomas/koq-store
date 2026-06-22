<p align="center">
  <img src="public/favicon.ico" alt="KoqStore" width="72">
</p>

<h1 align="center">KoqStore</h1>

<p align="center">
  Sistema de gestión de stock, ventas y transferencias para indumentaria.
  <br>
  <a href="https://koq-store.vercel.app"><strong>koq-store.vercel.app »</strong></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Angular-21-DD0031?logo=angular&logoColor=white" alt="Angular 21">
  <img src="https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind CSS v4">
  <img src="https://img.shields.io/badge/Supabase-2.x-3FCF8E?logo=supabase&logoColor=white" alt="Supabase">
  <img src="https://img.shields.io/badge/Zoneless-✓-8A2BE2" alt="Zoneless">
  <img src="https://img.shields.io/badge/Material_M3-✓-purple?logo=materialdesign&logoColor=white" alt="Material M3">
  <img src="https://img.shields.io/badge/Vitest-4.x-6E9F18?logo=vitest&logoColor=white" alt="Vitest">
  <img src="https://img.shields.io/badge/Vercel-✓-000000?logo=vercel&logoColor=white" alt="Vercel">
</p>

---

## Funcionalidades

- **Catálogo** — navegación y búsqueda de productos con filtros por categoría, color y talle
- **Venta rápida** — registro de ventas con selección por variante (color + talle), canales local/WhatsApp, recargos
- **Transferencias de stock** — movimiento de stock entre sucursales con confirmación en destino
- **Ingreso de mercadería** — carga de nuevos lotes al sistema
- **Alertas de stock** — productos por debajo del mínimo configurado
- **Historial** — trazabilidad de movimientos y ventas
- **Recepciones** — confirmación de transferencias entrantes
- **Roles** — operadores (sucursal específica) y administradores (visión global)

## Stack

| | |
|---|---|
| **Framework** | Angular 21 (standalone, sin NgModules) |
| **Lenguaje** | TypeScript 5.9 |
| **UI** | Angular Material M3 · Tailwind CSS v4 |
| **Estado** | Signals · ChangeDetectionStrategy.OnPush · Zoneless |
| **Backend** | Supabase (PostgreSQL, Auth, Storage) |
| **Testing** | Vitest v4 via `@angular/build:unit-test` |
| **Deploy** | Vercel (SPA rewrites) |

## Primeros pasos

```bash
git clone <repo-url>
cd koq-store
npm install
npm start
```

La aplicación se abre en `http://localhost:4200/`.

> No requiere variables de entorno — las credenciales de Supabase están hardcodeadas en `src/app/core/services/supabase.service.ts`.

## Comandos

```bash
npm start              # Servidor de desarrollo → localhost:4200
npm test               # Tests unitarios (Vitest)
npm test -- --include src/app/app.spec.ts  # Test individual
npm run build          # Build producción → dist/koq-store/browser
npm run deploy         # Deploy a Vercel (producción)
npm run preview        # Preview local de build Vercel
```

## Tests

```bash
npm test                            # Todos los tests
npm test -- --include src/app/pages/new-sale/new-sale.spec.ts  # Test específico
```

Los tests son smoke tests que verifican creación de componentes sin mockear servicios ni guards. Usan `TestBed.configureTestingModule({ imports: [Component] })`.

## Arquitectura

```
src/app/
  core/           guards, servicios (11), utils
  shared/         sidebar, search-bar, modals
  layouts/        app-layout (shell + sidebar)
  pages/          auth, catalog, transfer, create-product,
                  ingreso, new-sale, alertas, historial, recepciones
  interfaces/     14 interfaces TypeScript
  mocks/          14 mocks (sin uso — todos los servicios llaman a Supabase directo)
```

## Despliegue

Automatizado con Vercel. El build de producción se configura en `vercel.json`:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist/koq-store/browser",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

## Licencia

Uso interno — KoqStore.
