import { Book, Bookmark, Shelf, User } from "@/lib/definitions";

const API_URL = "http://192.168.0.108:8080";
const REGISTER_ROUTE = "/auth/register";
const LOGIN_ROUTE = "/auth/login";
const BOOKS_ROUTE = "/books";
const READING_PROGRESS_ROUTE = "/bookmarks";
const SHELVES_ROUTE = "/shelves";

export async function register(user: User) {
  const url = API_URL + REGISTER_ROUTE;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(user),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(`status: ${response.status}, error: ${result.error}`);
  }
}

export async function login(user: User): Promise<string> {
  const url = API_URL + LOGIN_ROUTE;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ...user, email: user.email.toLowerCase() }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(`status: ${response.status}, error: ${result.error}`);
  }

  return result.access_token;
}

export async function getShelves(accessToken: string | null): Promise<Shelf[]> {
  const url = API_URL + SHELVES_ROUTE;
  const response = await authorizedFetch(accessToken, url, "GET");

  if (!response.ok) {
    throw new Error(`Response status: ${response.status}`);
  }

  const result = await response.json();
  return result ?? [];
}

export async function getBookmarks(
  accessToken: string | null,
): Promise<(Book & Bookmark)[]> {
  const url = API_URL + READING_PROGRESS_ROUTE;
  const response = await authorizedFetch(accessToken, url, "GET");

  if (!response.ok) {
    throw new Error(`Response status: ${response.status}`);
  }

  const result = await response.json();
  return result ?? [];
}

export async function searchBooks(
  accessToken: string | null,
  title: string,
): Promise<Book[]> {
  const params = new URLSearchParams({
    title,
  });

  const url = `${API_URL}${BOOKS_ROUTE}?${params.toString()}`;

  const response = await authorizedFetch(accessToken, url, "GET");

  if (!response.ok) {
    throw new Error(`Response status: ${response.status}`);
  }

  const result = await response.json();
  return result ?? [];
}

export async function createBook(
  accessToken: string | null,
  book: Book,
): Promise<Book> {
  const url = `${API_URL}${BOOKS_ROUTE}`;

  const response = await authorizedFetch(
    accessToken,
    url,
    "POST",
    JSON.stringify(book),
  );

  if (!response.ok) {
    console.error(await response.text());
    throw new Error(`HTTP error! Status: ${response.status}`);
  }

  return await response.json();
}

export async function placeBookmark(
  accessToken: string | null,
  bookmark: Bookmark,
): Promise<void> {
  const url = `${API_URL}${READING_PROGRESS_ROUTE}`;

  const response = await authorizedFetch(
    accessToken,
    url,
    "POST",
    JSON.stringify({
      ...bookmark,
      bookId: bookmark.id,
      shelfId: bookmark.shelfId,
    }),
  );

  if (!response.ok) {
    console.error(await response.text());
    throw new Error(`HTTP error! Status: ${response.status}`);
  }
}

async function authorizedFetch(
  accessToken: string | null,
  url: string,
  method: "GET" | "POST",
  body?: string,
): Promise<Response> {
  if (accessToken == null) {
    throw new Error("not logged in");
  }

  return fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body,
  });
}
