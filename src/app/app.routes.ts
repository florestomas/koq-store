import { Routes } from '@angular/router';
import { AuthComponent } from './pages/auth/auth.component';
import { AppLayoutComponent } from './layouts/app-layout/app-layout.component';
import { authGuard } from './core/guards/auth.guard';
import { CatalogComponent } from './pages/catalog/catalog.component';
import { TransferenciaComponent } from './pages/transfer/transferencia.component';
import { CreateProductComponent } from './pages/create-product/create-product.component';
import { NewSaleComponent } from './pages/new-sale/new-sale.component';

export const routes: Routes = [
  {
    path: 'login',
    component: AuthComponent,
  },
  {
    path: '',
    component: AppLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: 'catalogo', component: CatalogComponent },
      { path: 'transferencia', component: TransferenciaComponent },
      { path: 'crear-producto', component: CreateProductComponent },
      { path: 'ventas/nueva', component: NewSaleComponent },
      { path: '', redirectTo: 'catalogo', pathMatch: 'full' },
    ],
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];
