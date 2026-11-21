import { Component, EventEmitter, Input, Output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, Subject } from 'rxjs';
import { Ticket, TicketCategory, TicketFilters, TicketStatus } from '../../core/models/ticket.model';
import { relativeDate, shortTicketId } from '../../core/utils/ticket-format';
import { StatusBadgeComponent } from '../status-badge/status-badge.component';

@Component({
  selector: 'app-ticket-table',
  standalone: true,
  imports: [StatusBadgeComponent],
  templateUrl: './ticket-table.component.html',
  styleUrl: './ticket-table.component.css'
})
export class TicketTableComponent {
  @Input() tickets: Ticket[] = [];
  @Input() filters: TicketFilters = {};
  @Input() selectable = false;
  @Input() navigable = false;
  @Input() selectedId: string | null = null;
  @Input() showCount = false;
  @Input() totalCount = 0;
  @Output() filtersChange = new EventEmitter<TicketFilters>();
  @Output() ticketSelected = new EventEmitter<Ticket>();
  @Output() ticketActivated = new EventEmitter<Ticket>();

  readonly statuses: TicketStatus[] = ['Open', 'In Progress', 'Resolved'];
  readonly categories: TicketCategory[] = ['Account', 'Technical', 'Billing', 'Other'];
  searchInput = '';
  private searchTerm = '';
  private readonly searchChanges = new Subject<string>();

  constructor() {
    this.searchChanges
      .pipe(debounceTime(250), takeUntilDestroyed())
      .subscribe((value) => (this.searchTerm = value.trim().toLocaleLowerCase()));
  }

  get visibleTickets(): Ticket[] {
    if (!this.searchTerm) return this.tickets;
    return this.tickets.filter((ticket) =>
      `${ticket.title} ${ticket.description}`.toLocaleLowerCase().includes(this.searchTerm)
    );
  }

  get hasActiveFilters(): boolean {
    return Boolean(this.filters.status || this.filters.category || this.searchInput.trim());
  }

  readonly shortId = shortTicketId;
  readonly submittedDate = (createdAt: string) => `Submitted ${relativeDate(createdAt)}`;

  onSearch(event: Event): void {
    this.searchInput = (event.target as HTMLInputElement).value;
    this.searchChanges.next(this.searchInput);
  }

  onStatusChange(event: Event): void {
    const status = (event.target as HTMLSelectElement).value as TicketStatus | '';
    this.filtersChange.emit({ ...this.filters, status });
  }

  onCategoryChange(event: Event): void {
    const category = (event.target as HTMLSelectElement).value as TicketCategory | '';
    this.filtersChange.emit({ ...this.filters, category });
  }

  clearFilters(): void {
    this.searchInput = '';
    this.searchTerm = '';
    this.searchChanges.next('');
    if (this.filters.status || this.filters.category) {
      this.filtersChange.emit({ status: '', category: '' });
    }
  }

  activate(ticket: Ticket): void {
    if (this.selectable) this.ticketSelected.emit(ticket);
    if (this.navigable) this.ticketActivated.emit(ticket);
  }

  onRowKey(event: KeyboardEvent, ticket: Ticket): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.activate(ticket);
    }
  }
}
