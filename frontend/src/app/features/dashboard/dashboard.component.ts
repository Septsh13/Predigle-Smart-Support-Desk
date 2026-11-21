import { Component, DestroyRef, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of, startWith, Subject, switchMap, tap } from 'rxjs';
import { Ticket, TicketFilters, TicketStats } from '../../core/models/ticket.model';
import { TicketService } from '../../core/services/ticket.service';
import { relativeDate, shortTicketId } from '../../core/utils/ticket-format';
import { StatusBadgeComponent } from '../../shared/status-badge/status-badge.component';
import { TicketTableComponent } from '../../shared/ticket-table/ticket-table.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, StatusBadgeComponent, TicketTableComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent {
  private readonly ticketService = inject(TicketService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly ticketRequests = new Subject<TicketFilters>();

  readonly stats = signal<TicketStats | null>(null);
  readonly selectedTicket = signal<Ticket | null>(null);
  readonly recentTickets = signal<Ticket[]>([]);
  readonly statsLoading = signal(true);
  readonly ticketsLoading = signal(true);
  readonly statsError = signal(false);
  readonly ticketsError = signal(false);
  filters: TicketFilters = { status: '', category: '' };
  readonly shortId = shortTicketId;
  readonly relativeDate = relativeDate;

  constructor() {
    this.loadStats();
    this.ticketRequests
      .pipe(
        startWith(this.filters),
        tap(() => {
          this.ticketsLoading.set(true);
          this.ticketsError.set(false);
        }),
        switchMap((filters) => this.ticketService.list(filters).pipe(
          catchError(() => {
            this.ticketsError.set(true);
            this.ticketsLoading.set(false);
            this.recentTickets.set([]);
            this.selectedTicket.set(null);
            return of(null);
          })
        )),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((tickets) => {
        if (!tickets) return;
        const recent = tickets.slice(0, 5);
        this.recentTickets.set(recent);
        const current = this.selectedTicket();
        this.selectedTicket.set(
          recent.find((ticket) => ticket.id === current?.id) ?? recent[0] ?? null
        );
        this.ticketsLoading.set(false);
      });
  }

  private loadStats(): void {
    this.statsLoading.set(true);
    this.statsError.set(false);
    this.ticketService.stats().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (stats) => {
        this.stats.set(stats);
        this.statsLoading.set(false);
      },
      error: () => {
        this.statsError.set(true);
        this.statsLoading.set(false);
      }
    });
  }

  onFiltersChange(filters: TicketFilters): void {
    this.filters = filters;
    this.ticketRequests.next(filters);
  }

  selectTicket(ticket: Ticket): void {
    this.selectedTicket.set(ticket);
  }

  retry(): void {
    this.loadStats();
    this.ticketRequests.next(this.filters);
  }
}
