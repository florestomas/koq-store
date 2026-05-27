import { Routes } from '@angular/router';
import { AuthComponent } from './pages/auth/auth.component';
import { AppLayoutComponent } from './layouts/app-layout/app-layout.component';
import { authGuard } from './core/guards/auth.guard';
import { CatalogComponent } from './pages/catalog/catalog.component';
import { TransferenciaComponent } from './pages/transfer/transferencia.component';
import { CreateProductComponent } from './pages/create-product/create-product.component';
import { NewSaleComponent } from './pages/new-sale/new-sale.component';
import { AlertasComponent } from './pages/alertas/alertas.component';
import { HistorialComponent } from './pages/historial/historial.component';
import { RecepcionesComponent } from './pages/recepciones/recepciones.component';

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
      { path: 'alertas', component: AlertasComponent },
      { path: 'historial', component: HistorialComponent },
      { path: 'recepciones', component: RecepcionesComponent },
      { path: '', redirectTo: 'catalogo', pathMatch: 'full' },
    ],
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];
