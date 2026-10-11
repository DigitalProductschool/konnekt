export interface ApiResponse<T> {
  data: T;
  message?: string | null;
}

export interface ApiErrorResponse {
  error: string;
  message: string;
  /** Only on 5xx answers: the ID under which the backend logged what went wrong */
  error_id?: string;
}

/** What a page shows after a failed call: a message and, after a 5xx answer, its error ID */
export type ErrorNotice = Pick<ApiErrorResponse, 'message' | 'error_id'>;
