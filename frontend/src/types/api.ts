export interface ApiResponse<T> {
  data: T;
  message?: string | null;
}

export interface ApiErrorResponse {
  error: string;
  message: string;
}
