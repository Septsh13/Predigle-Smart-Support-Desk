import { Component, DestroyRef, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, distinctUntilChanged, EMPTY, map, Subject, switchMap, tap } from 'rxjs';
import { Ticket, TicketCategory, TicketFilters, TicketStatus } from '../../core/models/ticket.model';
import { TicketService } from '../../core/services/ticket.service';
import { TicketTableComponent } from '../../shared/ticket-table/ticket-table.component';

@Component({
  selector: 'app-ticket-list',
  standalone: true,
  imports: [RouterLink, TicketTableComponent],
  templateUrl: './ticket-list.component.html',
  styleUrl: './ticket-list.component.css'
})
export class TicketListComponent {
  private readonly ticketService = inject(TicketService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly reloadRequests = new Subject<TicketFilters>();

  readonly tickets = signal<Ticket[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);
  filters: TicketFilters = { status: '', category: '' };

  constructor() {
    this.reloadRequests
      .pipe(
        switchMap((filters) => {
          this.loading.set(true);
          this.error.set(false);
          return this.ticketService.list(filters).pipe(
            tap((tickets) => {
              this.tickets.set(tickets);
              this.loading.set(false);
            }),
            catchError(() => {
              this.tickets.set([]);
              this.error.set(true);
              this.loading.set(false);
              return EMPTY;
            })
          );
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe();

    this.route.queryParamMap
      .pipe(
        map((params) => ({
          status: this.validStatus(params.get('status')),
          category: this.validCategory(params.get('category'))
        })),
        distinctUntilChanged((a, b) => a.status === b.status && a.category === b.category),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((filters) => {
        this.filters = filters;
        this.reloadRequests.next(filters);
      });
  }

  onFiltersChange(filters: TicketFilters): void {
    this.filters = filters;
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        status: filters.status || null,
        category: filters.category || null
      },
      replaceUrl: true
    });
  }

  openTicket(ticket: Ticket): void {
    void this.router.navigate(['/tickets', ticket.id]);
  }

  retry(): void {
    this.reloadRequests.next(this.filters);
  }

  private validStatus(value: string | null): TicketStatus | '' {
    return value === 'Open' || value === 'In Progress' || value === 'Resolved' ? value : '';
  }

  private validCategory(value: string | null): TicketCategory | '' {
    return value === 'Account' || value === 'Technical' || value === 'Billing' || value === 'Other'
      ? value
      : '';
  }
}
