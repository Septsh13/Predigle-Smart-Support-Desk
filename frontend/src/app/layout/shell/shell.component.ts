import { Component, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter, startWith } from 'rxjs';
import { RoleService } from '../../core/services/role.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.css'
})
export class ShellComponent {
  readonly roleService = inject(RoleService);
  readonly sidebarCollapsed = signal(false);
  readonly mobileSidebarOpen = signal(false);
  readonly pageTitle = signal('Overview');

  private readonly router = inject(Router);
  private readonly route = inject(Router).routerState.root;

  constructor() {
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        startWith(null),
        takeUntilDestroyed()
      )
      .subscribe(() => this.readPageTitle());
  }

  toggleSidebar(): void {
    if (window.matchMedia('(max-width: 899px)').matches) {
      this.mobileSidebarOpen.update((open) => !open);
      return;
    }
    this.sidebarCollapsed.update((collapsed) => !collapsed);
  }

  closeMobileSidebar(): void {
    this.mobileSidebarOpen.set(false);
  }

  setRole(role: 'user' | 'agent'): void {
    this.roleService.setRole(role);
  }

  private readPageTitle(): void {
    let activeRoute = this.route;
    while (activeRoute.firstChild) activeRoute = activeRoute.firstChild;
    this.pageTitle.set(activeRoute.snapshot.data['title'] ?? 'Overview');
  }
}
