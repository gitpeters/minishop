export class APIResponse<T> {
  status: string;
  data: T;
  pagination?: PaginationResult;

  constructor(status: string, data: T, pagination?: PaginationResult) {
    this.status = status;
    this.data = data;
    this.pagination = pagination;
  }
}

export class PaginationResult {
  totalPage: number;
  elementPerPage: number;
  totalElements: number;
  currentPageSize: number;

  constructor(
    totalPage: number,
    elementPerPage: number,
    totalElements: number,
    currentPageSize: number,
  ) {
    this.totalPage = totalPage;
    this.elementPerPage = elementPerPage;
    this.totalElements = totalElements;
    this.currentPageSize = currentPageSize;
  }
}

export class Pagination {
  private page: number;
  private limit: number;
  constructor(page: number, limit: number) {
    this.page = page;
    this.limit = limit;
  }

  getSkip(): number {
    return (this.page - 1) * this.limit;
  }

  getTake(): number {
    return this.limit;
  }
}
