import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const operadorGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await auth.waitForInit();

  if (auth.isAdmin() || auth.currentUser()?.idLocation === '1') {
    return true;
  }
  return router.createUrlTree(['/catalogo']);
};
