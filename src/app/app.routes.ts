import { Routes } from '@angular/router';
import { AuthComponent } from './pages/auth/auth.component';
import { AppLayoutComponent } from './layouts/app-layout/app-layout.component';

export const routes: Routes = [
  {
    path: 'login',
    component: AuthComponent,
  },
  {
    path: 'app',
    component: AppLayoutComponent,
  },
  {
    path: '**',
    redirectTo: 'login',
  }
];
