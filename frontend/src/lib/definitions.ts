export interface Book {
  id: string;
  title: string;
  author: string;
  pageCount: number;
}

export interface BookDetails {
  id: string;
  blurb: string;
  genres: string[];
}

export interface Bookmark {
  shelfId: string;
  currentPage: number;
  book: Book;
}

export interface Shelf {
  id: string;
  sortOrder: number;
  name: string;
  userId: string;
  bookmarks: Bookmark[];
}

export interface User {
  email: string;
  password: string;
}
