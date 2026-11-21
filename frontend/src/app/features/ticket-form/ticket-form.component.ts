import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CreateTicketPayload, SimilarResponse, TicketCategory } from '../../core/models/ticket.model';
import { TicketService } from '../../core/services/ticket.service';
import { shortTicketId } from '../../core/utils/ticket-format';

type FieldName = 'title' | 'description' | 'category';

@Component({
  selector: 'app-ticket-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './ticket-form.component.html',
  styleUrl: './ticket-form.component.css'
})
export class TicketFormComponent {
  @ViewChild('titleInput') private titleInput?: ElementRef<HTMLInputElement>;
  @ViewChild('descriptionInput') private descriptionInput?: ElementRef<HTMLTextAreaElement>;
  @ViewChild('categoryInput') private categoryInput?: ElementRef<HTMLSelectElement>;

  readonly form = new FormGroup({
    title: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(150)]
    }),
    description: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(10)]
    }),
    category: new FormControl<TicketCategory | ''>('', {
      nonNullable: true,
      validators: [Validators.required]
    })
  });

  readonly categories: TicketCategory[] = ['Account', 'Technical', 'Billing', 'Other'];
  readonly shortTicketId = shortTicketId;
  readonly submitAttempted = signal(false);
  readonly isSubmitting = signal(false);
  readonly fieldErrors = signal<Partial<Record<FieldName, string>>>({});
  readonly generalError = signal<string | null>(null);
  readonly checkingSimilar = signal(false);
  readonly hasCheckedSimilar = signal(false);
  readonly similarIsStale = signal(false);
  readonly similarError = signal(false);
  readonly similarResponse = signal<SimilarResponse | null>(null);

  private readonly ticketService = inject(TicketService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private lastCheckedText = { title: '', description: '' };

  constructor() {
    let previousValue = this.form.getRawValue();
    this.form.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        if (value.title !== previousValue.title) this.clearFieldError('title');
        if (value.description !== previousValue.description) this.clearFieldError('description');
        if (value.category !== previousValue.category) this.clearFieldError('category');
        previousValue = this.form.getRawValue();

        if (this.hasCheckedSimilar()) {
          const currentText = this.currentQuery();
          this.similarIsStale.set(
            currentText.title !== this.lastCheckedText.title ||
            currentText.description !== this.lastCheckedText.description
          );
        }
      });
  }

  get canCheckSimilar(): boolean {
    return Boolean(this.form.controls.title.value.trim() && this.form.controls.description.value.trim());
  }

  checkSimilar(): void {
    if (!this.canCheckSimilar || this.checkingSimilar()) return;

    const query = this.currentQuery();
    this.lastCheckedText = query;
    this.hasCheckedSimilar.set(true);
    this.similarIsStale.set(false);
    this.similarError.set(false);
    this.similarResponse.set(null);
    this.checkingSimilar.set(true);

    this.ticketService.similar(query)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.similarResponse.set(response);
          this.checkingSimilar.set(false);
        },
        error: () => {
          this.similarError.set(true);
          this.checkingSimilar.set(false);
        }
      });
  }

  showFieldError(field: FieldName): boolean {
    const control = this.form.controls[field];
    return Boolean(this.fieldErrors()[field]) || ((control.touched || this.submitAttempted()) && control.invalid);
  }

  fieldError(field: FieldName): string {
    const serverError = this.fieldErrors()[field];
    if (serverError) return serverError;

    const control = this.form.controls[field];
    if (field === 'title') {
      if (control.hasError('required')) return 'Title is required';
      if (control.hasError('maxlength')) return 'Title cannot be longer than 150 characters';
    }
    if (field === 'description') {
      return 'Please describe the issue (at least 10 characters)';
    }
    if (field === 'category') return 'Please select a category';
    return 'Please check this field';
  }

  submit(): void {
    this.submitAttempted.set(true);
    this.generalError.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.focusFirstInvalidField();
      return;
    }
    if (this.isSubmitting()) return;

    const values = this.form.getRawValue();
    const payload: CreateTicketPayload = {
      title: values.title.trim(),
      description: values.description.trim(),
      category: values.category as TicketCategory
    };
    this.isSubmitting.set(true);
    this.fieldErrors.set({});

    this.ticketService.create(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (ticket) => {
          this.isSubmitting.set(false);
          void this.router.navigate(['/tickets', ticket.id], {
            state: { ticketCreated: true }
          });
        },
        error: (error: HttpErrorResponse) => this.handleSubmitError(error)
      });
  }

  retrySimilar(): void {
    this.checkSimilar();
  }

  private currentQuery(): { title: string; description: string } {
    return {
      title: this.form.controls.title.value.trim(),
      description: this.form.controls.description.value.trim()
    };
  }

  private focusFirstInvalidField(): void {
    requestAnimationFrame(() => {
      if (this.form.controls.title.invalid) this.titleInput?.nativeElement.focus();
      else if (this.form.controls.description.invalid) this.descriptionInput?.nativeElement.focus();
      else if (this.form.controls.category.invalid) this.categoryInput?.nativeElement.focus();
    });
  }

  private handleSubmitError(error: HttpErrorResponse): void {
    this.isSubmitting.set(false);
    if (error.status === 400 && error.error && typeof error.error === 'object') {
      const response = error.error as Record<string, unknown>;
      this.fieldErrors.set({
        title: this.firstError(response['title']),
        description: this.firstError(response['description']),
        category: this.firstError(response['category'])
      });
      const fields = new Set(['title', 'description', 'category']);
      const otherErrors = Object.entries(response)
        .filter(([key]) => !fields.has(key))
        .flatMap(([, value]) => this.errorsFor(value));
      this.generalError.set(otherErrors.join(' ') || null);
      return;
    }

    this.generalError.set(
      error.status === 0
        ? 'Cannot reach the server. Your text is still here - try again.'
        : 'Could not submit ticket. Please try again.'
    );
  }

  private firstError(value: unknown): string | undefined {
    return this.errorsFor(value)[0];
  }

  private errorsFor(value: unknown): string[] {
    if (Array.isArray(value)) return value.map(String);
    if (typeof value === 'string') return [value];
    return [];
  }

  private clearFieldError(field: FieldName): void {
    const current = this.fieldErrors();
    if (!current[field]) return;
    const updated = { ...current };
    delete updated[field];
    this.fieldErrors.set(updated);
    this.generalError.set(null);
  }
}
