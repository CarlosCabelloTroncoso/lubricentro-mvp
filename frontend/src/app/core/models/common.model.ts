/** Envelope uniforme que devuelve toda la API (ver docs/api.md). */
export interface Meta {
  total: number;
  page: number;
  limit: number;
}

export interface ApiListResponse<T> {
  data: T[];
  meta: Meta;
}

export interface ApiItemResponse<T> {
  data: T;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: Array<{ campo: string; mensaje: string }>;
  };
}
