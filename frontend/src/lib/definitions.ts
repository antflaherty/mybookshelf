export interface Book {
  id: string;
  title: string;
  author: string;
  pageCount: number;
}

export interface Bookmark {
  id: string;
  shelfId: string;
  currentPage: number;
}

export interface Shelf {
  id: string;
  name: string;
}

export interface User {
  email: string;
  password: string;
}
