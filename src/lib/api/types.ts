/** Pagination envelope returned by list endpoints. */
export interface Page<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface PageRequest {
  page?: number;
  size?: number;
  sort?: string;
}
