import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { RoleService } from '../services/role.service';

export const roleInterceptor: HttpInterceptorFn = (request, next) => {
  if (!request.url.startsWith(environment.apiUrl)) return next(request);

  const role = inject(RoleService).role();
  return next(request.clone({ setHeaders: { 'X-Role': role } }));
};
