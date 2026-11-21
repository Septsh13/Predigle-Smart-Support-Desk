import { Component, Input } from '@angular/core';
import { TicketStatus } from '../../core/models/ticket.model';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  template: '<span class="status-badge" [class.open]="status === \'Open\'" [class.progress]="status === \'In Progress\'" [class.resolved]="status === \'Resolved\'">{{ status }}</span>',
  styleUrl: './status-badge.component.css'
})
export class StatusBadgeComponent {
  @Input({ required: true }) status!: TicketStatus;
}
