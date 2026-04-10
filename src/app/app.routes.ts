import { Routes } from '@angular/router';
import { AuthComponent } from './pages/auth/auth.component';
import { CatalogComponent } from './pages/catalog/catalog.component';

export const routes: Routes = [
  {
    path: '',
    component: AuthComponent,
  },
  {
    path: 'catalogo',
    component: CatalogComponent,
  },
  {
    path: '**',
    redirectTo: '',
  }
];
