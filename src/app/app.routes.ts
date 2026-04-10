import { Routes } from '@angular/router';
import { AuthComponent } from './pages/auth/auth.component';
import { AppLayoutComponent } from './layouts/app-layout/app-layout.component';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    component: AuthComponent,
  },
  {
    path: 'app',
    component: AppLayoutComponent,
    canActivate: [authGuard],
  },
  {
    path: '**',
    redirectTo: 'login',
  }
];
