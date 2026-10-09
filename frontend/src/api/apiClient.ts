import {
  Book,
  BookDetails,
  Bookmark,
  Review,
  Shelf,
  User,
} from "@/lib/definitions";

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const REGISTER_ROUTE = "/auth/register";
const LOGIN_ROUTE = "/auth/login";
const BOOKS_ROUTE = "/books";
const BOOKMARKS_ROUTE = "/bookmarks";
const SHELVES_ROUTE = "/shelves";
const REVIEWS_ROUTE = "/reviews";

let unauthorizedHandler: () => Promise<void>;

export function setUnauthorizedHandler(handler: () => Promise<void>) {
  unauthorizedHandler = handler;
}

export async function register(user: User) {
  const url = API_URL + REGISTER_ROUTE;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ...user, email: user.email.toLowerCase() }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error);
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
    console.error(await response.text());
    throw new Error(`Response status: ${response.status}`);
  }

  const result = await response.json();
  return result ?? [];
}

export async function getBookmarks(
  accessToken: string | null,
): Promise<Bookmark[]> {
  const url = API_URL + BOOKMARKS_ROUTE;
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
  limit: number,
  page: number,
): Promise<Book[]> {
  const params = new URLSearchParams({
    title,
    limit: `${limit}`,
    page: `${page}`,
  });

  const url = `${API_URL}${BOOKS_ROUTE}?${params.toString()}`;

  const response = await authorizedFetch(accessToken, url, "GET");

  if (!response.ok) {
    console.error(await response.text());
    throw new Error(`Response status: ${response.status}`);
  }

  const result = await response.json();
  return result ?? [];
}

export async function getBookDetails(
  accessToken: string | null,
  bookId: string,
): Promise<BookDetails> {
  const params = new URLSearchParams({
    id: bookId,
  });

  const url = `${API_URL}${BOOKS_ROUTE}?${params.toString()}`;

  const response = await authorizedFetch(accessToken, url, "GET");

  if (!response.ok) {
    console.error(await response.text());
    throw new Error(`Response status: ${response.status}`);
  }

  return await response.json();
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

export interface PlaceBookmarkRequest {
  bookId: string;
  shelfId: string;
  currentPage: number;
}

export async function placeBookmark(
  accessToken: string | null,
  request: PlaceBookmarkRequest,
): Promise<void> {
  const url = `${API_URL}${BOOKMARKS_ROUTE}`;

  const response = await authorizedFetch(
    accessToken,
    url,
    "POST",
    JSON.stringify(request),
  );

  if (!response.ok) {
    console.error(await response.text());
    throw new Error(`HTTP error! Status: ${response.status}`);
  }
}

interface PostReviewRequest {
  bookId: string;
  stars: number;
  comment?: string;
  timestamp: string;
}

export async function postReview(
  accessToken: string | null,
  request: PostReviewRequest,
) {
  const url = `${API_URL}${REVIEWS_ROUTE}`;

  const response = await authorizedFetch(
    accessToken,
    url,
    "POST",
    JSON.stringify(request),
  );

  if (!response.ok) {
    console.error(await response.text());
    throw new Error(`HTTP error! Status: ${response.status}`);
  }

  console.log(await response.json());
}

export async function getReviews(
  accessToken: string | null,
  bookId: string,
): Promise<Review[]> {
  const params = new URLSearchParams({
    bookId,
  });

  const url = `${API_URL}${REVIEWS_ROUTE}?${params.toString()}`;

  const response = await authorizedFetch(accessToken, url, "GET");

  if (!response.ok) {
    console.error(await response.text());
    throw new Error(`Response status: ${response.status}`);
  }

  return await response.json();
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

  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body,
  });

  if (response.status === 401) {
    await unauthorizedHandler?.();
  }
  return response;
}
