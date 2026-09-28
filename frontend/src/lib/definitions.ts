export interface Book {
  id: string;
  title: string;
  author: string;
  pageCount: number;
  coverUri?: string;
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

export interface Review {
  bookId: string;
  comment?: string;
  createdTimestamp: string;
  lastEditedTimestamp: string;
  stars: number;
  userId: string;
}
