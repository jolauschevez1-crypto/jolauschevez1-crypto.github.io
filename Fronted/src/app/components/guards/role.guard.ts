import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../../services/auth.service';

/**
 * Protege rutas según el rol del usuario logueado.
 *
 * Uso en app.routes.ts:
 *   { path: 'admin/dashboard', component: Dashboard,
 *     canActivate: [roleGuard], data: { roles: ['admin'] } }
 *
 * Si no se pasa `data: { roles: [...] }`, solo exige que haya sesión
 * iniciada (cualquier rol pasa).
 */
export const roleGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isLoggedIn()) {
    try {
      sessionStorage.setItem('returnUrl', state.url);
    } catch {
      // Si sessionStorage no está disponible, seguimos sin returnUrl.
    }

    router.navigate(['/login']);
    return false;
  }

  const rolesPermitidos = route.data['roles'] as string[] | undefined;

  if (rolesPermitidos && rolesPermitidos.length > 0) {
    const rolActual = auth.role();

    if (!rolActual || !rolesPermitidos.includes(rolActual)) {
      router.navigate(['/']);
      return false;
    }
  }

  return true;
};
