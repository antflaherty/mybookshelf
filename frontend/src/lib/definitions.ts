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
  userId: string;
  bookmarks: (Book & Bookmark)[];
}

export interface User {
  email: string;
  password: string;
}
