import { Injectable, signal } from '@angular/core';
import { SupportRole } from '../models/ticket.model';

function initialRole(): SupportRole {
  if (typeof localStorage === 'undefined') return 'user';
  return localStorage.getItem('ssd_role') === 'agent' ? 'agent' : 'user';
}

@Injectable({ providedIn: 'root' })
export class RoleService {
  readonly role = signal<SupportRole>(initialRole());

  setRole(role: SupportRole): void {
    this.role.set(role);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('ssd_role', role);
    }
  }
}
