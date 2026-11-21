import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SimilarTicket, Ticket, TicketStatus, UpdateTicketPayload } from '../../core/models/ticket.model';
import { RoleService } from '../../core/services/role.service';
import { TicketService } from '../../core/services/ticket.service';
import { localDateTime, shortTicketId } from '../../core/utils/ticket-format';
import { StatusBadgeComponent } from '../../shared/status-badge/status-badge.component';

type RetryAction = 'ticket' | 'save' | null;

@Component({
  selector: 'app-ticket-detail',
  standalone: true,
  imports: [RouterLink, StatusBadgeComponent],
  templateUrl: './ticket-detail.component.html',
  styleUrl: './ticket-detail.component.css'
})
export class TicketDetailComponent {
  readonly roleService = inject(RoleService);
  readonly ticket = signal<Ticket | null>(null);
  readonly similarTickets = signal<SimilarTicket[]>([]);
  readonly disclaimer = signal('');
  readonly ticketLoading = signal(true);
  readonly ticketNotFound = signal(false);
  readonly pageError = signal<string | null>(null);
  readonly retryAction = signal<RetryAction>('ticket');
  readonly similarLoading = signal(false);
  readonly similarError = signal(false);
  readonly isSaving = signal(false);
  readonly toastMessage = signal<string | null>(null);
  readonly validationErrors = signal<{ status?: string; resolution_note?: string }>({});
  readonly formStatus = signal<TicketStatus>('Open');
  readonly formNote = signal('');

  readonly statuses: TicketStatus[] = ['Open', 'In Progress', 'Resolved'];
  readonly shortId = shortTicketId;
  readonly localDateTime = localDateTime;

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly ticketService = inject(TicketService);
  private readonly destroyRef = inject(DestroyRef);
  private currentId = '';
  private toastTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    if (this.router.getCurrentNavigation()?.extras.state?.['ticketCreated']) {
      this.showToast('Ticket created');
    }

    this.destroyRef.onDestroy(() => {
      if (this.toastTimer) clearTimeout(this.toastTimer);
    });

    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const id = params.get('id') ?? '';
        if (!id) return;
        this.currentId = id;
        this.loadTicket(id);
      });
  }

  get noteRequired(): boolean {
    return this.formStatus() === 'Resolved' && !this.formNote().trim();
  }

  get hasChanges(): boolean {
    const current = this.ticket();
    if (!current) return false;
    return this.formStatus() !== current.status ||
      this.formNote() !== (current.resolution_note ?? '');
  }

  get saveDisabled(): boolean {
    return this.isSaving() || this.noteRequired || !this.hasChanges;
  }

  retry(): void {
    if (this.retryAction() === 'save') {
      this.save();
      return;
    }
    this.loadTicket(this.currentId);
  }

  retrySimilar(): void {
    const current = this.ticket();
    if (current) this.loadSimilar(current);
  }

  onStatusChange(event: Event): void {
    this.formStatus.set((event.target as HTMLSelectElement).value as TicketStatus);
    this.clearFieldError('status');
    this.clearFieldError('resolution_note');
  }

  onNoteInput(event: Event): void {
    this.formNote.set((event.target as HTMLTextAreaElement).value);
    this.clearFieldError('resolution_note');
  }

  save(): void {
    const current = this.ticket();
    if (!current || this.saveDisabled) return;

    const payload: UpdateTicketPayload = {};
    if (this.formStatus() !== current.status) payload.status = this.formStatus();
    if (this.formNote() !== (current.resolution_note ?? '')) {
      payload.resolution_note = this.formNote();
    }

    const oldStatus = current.status;
    const oldNote = current.resolution_note ?? '';
    this.isSaving.set(true);
    this.pageError.set(null);
    this.retryAction.set(null);
    this.validationErrors.set({});

    this.ticketService.update(current.id, payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          const statusChanged = updated.status !== oldStatus;
          const noteChanged = (updated.resolution_note ?? '') !== oldNote;
          this.ticket.set(updated);
          this.formStatus.set(updated.status);
          this.formNote.set(updated.resolution_note ?? '');
          this.isSaving.set(false);
          this.showToast(
            updated.status === 'Resolved'
              ? 'Ticket updated. This ticket can now appear as a suggestion for new tickets.'
              : 'Ticket updated'
          );
          if (statusChanged || noteChanged) this.loadSimilar(updated);
        },
        error: (error: HttpErrorResponse) => this.handleSaveError(error)
      });
  }

  private loadTicket(id: string): void {
    if (this.ticket()?.id !== id) {
      this.ticket.set(null);
      this.similarTickets.set([]);
      this.disclaimer.set('');
    }
    this.ticketLoading.set(true);
    this.ticketNotFound.set(false);
    this.pageError.set(null);
    this.retryAction.set('ticket');
    this.ticketService.get(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (ticket) => {
          if (id !== this.currentId) return;
          this.ticket.set(ticket);
          this.formStatus.set(ticket.status);
          this.formNote.set((ticket.resolution_note ?? '').slice(0, 1000));
          this.ticketLoading.set(false);
          this.validationErrors.set({});
          this.loadSimilar(ticket);
        },
        error: (error: HttpErrorResponse) => {
          if (id !== this.currentId) return;
          this.ticketLoading.set(false);
          if (error.status === 404) {
            this.ticket.set(null);
            this.ticketNotFound.set(true);
          } else {
            this.ticketNotFound.set(false);
            this.pageError.set(
              error.status === 0
                ? 'Cannot reach the server. Is the backend running at http://127.0.0.1:8000?'
                : 'Could not load this ticket.'
            );
            this.retryAction.set('ticket');
          }
        }
      });
  }

  private loadSimilar(ticket: Ticket): void {
    this.similarLoading.set(true);
    this.similarError.set(false);
    this.similarTickets.set([]);
    this.disclaimer.set('');
    this.ticketService.similar({ title: ticket.title, description: ticket.description })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          if (ticket.id !== this.currentId) return;
          this.similarTickets.set(
            response.results.filter((suggestion) => suggestion.id !== ticket.id).slice(0, 3)
          );
          this.disclaimer.set(response.disclaimer);
          this.similarLoading.set(false);
        },
        error: () => {
          if (ticket.id !== this.currentId) return;
          this.similarError.set(true);
          this.similarLoading.set(false);
        }
      });
  }

  private handleSaveError(error: HttpErrorResponse): void {
    this.isSaving.set(false);
    if (error.status === 400) {
      const body = error.error as Record<string, unknown> | null;
      const statusError = this.firstError(body?.['status']);
      const noteError = this.firstError(body?.['resolution_note']);
      this.validationErrors.set({ status: statusError, resolution_note: noteError });
      const fieldKeys = new Set(['status', 'resolution_note']);
      const generalMessages = body
        ? Object.entries(body)
            .filter(([key]) => !fieldKeys.has(key))
            .flatMap(([, value]) => this.errorsFor(value))
        : [];
      this.pageError.set(generalMessages.join(' ') || null);
      this.retryAction.set(null);
      return;
    }
    if (error.status === 403) {
      this.pageError.set(
        'Only support agents can update tickets. Switch the role to Support Agent at the top.'
      );
      this.retryAction.set(null);
      return;
    }
    if (error.status === 404) {
      this.ticket.set(null);
      this.ticketNotFound.set(true);
      this.retryAction.set('ticket');
      return;
    }
    this.pageError.set(
      error.status === 0
        ? 'Could not save changes because the server could not be reached.'
        : 'Could not update this ticket.'
    );
    this.retryAction.set(error.status === 0 ? 'save' : 'ticket');
  }

  private firstError(value: unknown): string | undefined {
    return this.errorsFor(value)[0];
  }

  private errorsFor(value: unknown): string[] {
    if (Array.isArray(value)) return value.map(String);
    if (typeof value === 'string') return [value];
    return [];
  }

  private clearFieldError(field: 'status' | 'resolution_note'): void {
    const current = this.validationErrors();
    if (current[field]) this.validationErrors.set({ ...current, [field]: undefined });
    if (!current.status && !current.resolution_note) this.pageError.set(null);
  }

  private showToast(message: string): void {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastMessage.set(message);
    this.toastTimer = setTimeout(() => this.toastMessage.set(null), 4000);
  }
}
