export type TicketStatus = 'Open' | 'In Progress' | 'Resolved';
export type TicketCategory = 'Account' | 'Technical' | 'Billing' | 'Other';
export type SupportRole = 'user' | 'agent';

export interface Ticket {
  id: string;
  title: string;
  description: string;
  category: TicketCategory;
  status: TicketStatus;
  created_at: string;
  resolution_note?: string;
}

export interface TicketStats {
  total: number;
  open: number;
  in_progress: number;
  resolved: number;
}

export interface SimilarTicket {
  id: string;
  title: string;
  category: TicketCategory;
  status: 'Resolved';
  similarity_score: number;
  match_label: 'Strong match' | 'Related';
  resolution_note: string;
}

export interface SimilarResponse {
  count: number;
  results: SimilarTicket[];
  disclaimer: string;
}

export interface CreateTicketPayload {
  title: string;
  description: string;
  category: TicketCategory;
}

export interface UpdateTicketPayload {
  status?: TicketStatus;
  resolution_note?: string;
}

export interface TicketFilters {
  status?: TicketStatus | '';
  category?: TicketCategory | '';
}

export interface SimilarQuery {
  title: string;
  description: string;
}
