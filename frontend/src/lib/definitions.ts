export interface Book {
  id: string;
  title: string;
  author: string;
  pageCount: number;
}

export interface Bookmark {
  id: string;
  currentPage: number;
}

export interface User {
  email: string;
  password: string;
}
