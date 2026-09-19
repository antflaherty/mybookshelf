export interface Book {
  id: string;
  title: string;
  author: string;
  pageCount: number;
}

export interface ReadingProgress {
  id: string;
  currentPage: number;
}
