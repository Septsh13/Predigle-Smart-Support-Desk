import { Routes } from '@angular/router';
import { ShellComponent } from './layout/shell/shell.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { TicketListComponent } from './features/ticket-list/ticket-list.component';
import { TicketDetailComponent } from './features/ticket-detail/ticket-detail.component';
import { TicketFormComponent } from './features/ticket-form/ticket-form.component';
import { ComingSoonComponent } from './features/coming-soon/coming-soon.component';
import { PageNotFoundComponent } from './features/page-not-found/page-not-found.component';

export const routes: Routes = [
  {
    path: '',
    component: ShellComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardComponent, data: { title: 'Overview' } },
      { path: 'tickets/new', component: TicketFormComponent, data: { title: 'New ticket' } },
      { path: 'tickets', component: TicketListComponent, data: { title: 'All tickets' } },
      { path: 'tickets/:id', component: TicketDetailComponent, data: { title: 'Ticket details' } },
      {
        path: 'knowledge-base',
        component: ComingSoonComponent,
        data: { title: 'Knowledge base' }
      },
      { path: 'settings', component: ComingSoonComponent, data: { title: 'Settings' } },
      { path: '**', component: PageNotFoundComponent, data: { title: 'Page not found' } }
    ]
  }
];
