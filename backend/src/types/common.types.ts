export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** The one error shape the whole API returns. */
export interface ErrorBody {
  statusCode: number;
  code: string;
  message: string | string[];
  details?: unknown;
}

export interface MailMessage {
  subject: string;
  html: string;
  text: string;
}
