import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CreateTicketPayload,
  SimilarQuery,
  SimilarResponse,
  Ticket,
  TicketFilters,
  TicketStats,
  UpdateTicketPayload
} from '../models/ticket.model';

@Injectable({ providedIn: 'root' })
export class TicketService {
  private readonly http = inject(HttpClient);
  private readonly ticketsUrl = `${environment.apiUrl}/tickets/`;

  list(filters: TicketFilters = {}): Observable<Ticket[]> {
    let params = new HttpParams();
    if (filters.status) params = params.set('status', filters.status);
    if (filters.category) params = params.set('category', filters.category);
    return this.http.get<Ticket[]>(this.ticketsUrl, { params });
  }

  get(id: string): Observable<Ticket> {
    return this.http.get<Ticket>(`${this.ticketsUrl}${encodeURIComponent(id)}/`);
  }

  create(payload: CreateTicketPayload): Observable<Ticket> {
    return this.http.post<Ticket>(this.ticketsUrl, payload);
  }

  update(id: string, payload: UpdateTicketPayload): Observable<Ticket> {
    return this.http.patch<Ticket>(`${this.ticketsUrl}${encodeURIComponent(id)}/`, payload);
  }

  stats(): Observable<TicketStats> {
    return this.http.get<TicketStats>(`${this.ticketsUrl}stats/`);
  }

  similar(payload: SimilarQuery): Observable<SimilarResponse> {
    return this.http.post<SimilarResponse>(`${this.ticketsUrl}similar/`, payload);
  }
}
