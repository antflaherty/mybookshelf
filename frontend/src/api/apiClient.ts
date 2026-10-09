import {
  Book,
  BookDetails,
  Bookmark,
  Review,
  Shelf,
  User,
} from "@/lib/definitions";
import { ApiError } from "@/api/api-error";

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

interface RequestOptions {
  /**
   * Pass the caller's token for a protected endpoint. Omit it entirely for a public one.
   * An explicit `null` means "protected but signed out" and never reaches the network.
   */
  accessToken?: string | null;
  body?: unknown;
  query?: Record<string, string | number>;
}

/**
 * The single path every endpoint goes through.
 *
 * The ordering below is load-bearing. `fetch` rejections become `ApiError.network`, the 401 hook
 * runs and is awaited *before* the caller sees its error, the body is read defensively, and only
 * then is `response.ok` consulted.
 */
async function request<T>(
  path: string,
  method: "GET" | "POST",
  options: RequestOptions = {},
): Promise<T> {
  const { accessToken, body, query } = options;

  if (accessToken === null) {
    throw new ApiError("not logged in", { status: 0, code: "unauthorized" });
  }

  let url = `${API_URL}${path}`;

  if (query) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      params.set(key, String(value));
    }
    url += `?${params.toString()}`;
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch (cause) {
    throw ApiError.network(cause);
  }

  if (response.status === 401) {
    // Awaited before the error surfaces so the logout has settled by the time the caller reacts.
    // Deliberately not wrapped: a rejection here belongs to the caller, not to `fetch`.
    await unauthorizedHandler?.();
  }

  // A body can only be read once, and it is not guaranteed to exist or to be JSON. An HTML error
  // page from a proxy used to make `response.json()` throw a bare SyntaxError; `text()` plus a
  // guarded parse turns that into an ordinary ApiError.
  let raw = "";
  try {
    raw = await response.text();
  } catch {
    // Body unreadable. Fall through with `raw` still empty.
  }

  let parsed: unknown = null;
  if (raw) {
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = null;
    }
  }

  if (!response.ok) {
    throw ApiError.fromResponse(response.status, parsed);
  }

  // A 200 with an empty body resolves to null. Callers that want a collection already do `?? []`.
  return parsed as T;
}

export async function register(user: User) {
  await request(REGISTER_ROUTE, "POST", {
    body: { ...user, email: user.email.toLowerCase() },
  });
}

export async function login(user: User): Promise<string> {
  const result = await request<{ access_token?: string }>(LOGIN_ROUTE, "POST", {
    body: { ...user, email: user.email.toLowerCase() },
  });

  if (typeof result?.access_token !== "string") {
    // A 200 that carries no token is not a successful login. The contract does not cover success
    // bodies, so this stays tolerant: whatever came back is treated as unexpected.
    throw ApiError.fromResponse(200, result);
  }

  return result.access_token;
}

export async function getShelves(accessToken: string | null): Promise<Shelf[]> {
  const result = await request<Shelf[] | null>(SHELVES_ROUTE, "GET", { accessToken });

  return result ?? [];
}

export async function getBookmarks(
  accessToken: string | null,
): Promise<Bookmark[]> {
  const result = await request<Bookmark[] | null>(BOOKMARKS_ROUTE, "GET", {
    accessToken,
  });

  return result ?? [];
}

export async function searchBooks(
  accessToken: string | null,
  title: string,
  limit: number,
  page: number,
): Promise<Book[]> {
  const result = await request<Book[] | null>(BOOKS_ROUTE, "GET", {
    accessToken,
    query: { title, limit, page },
  });

  return result ?? [];
}

export async function getBookDetails(
  accessToken: string | null,
  bookId: string,
): Promise<BookDetails> {
  return request<BookDetails>(BOOKS_ROUTE, "GET", {
    accessToken,
    query: { id: bookId },
  });
}

export async function createBook(
  accessToken: string | null,
  book: Book,
): Promise<Book> {
  return request<Book>(BOOKS_ROUTE, "POST", { accessToken, body: book });
}

export interface PlaceBookmarkRequest {
  bookId: string;
  shelfId: string;
  currentPage: number;
}

export async function placeBookmark(
  accessToken: string | null,
  bookmark: PlaceBookmarkRequest,
): Promise<void> {
  await request(BOOKMARKS_ROUTE, "POST", { accessToken, body: bookmark });
}

interface PostReviewRequest {
  bookId: string;
  stars: number;
  comment?: string;
  timestamp: string;
}

export async function postReview(
  accessToken: string | null,
  review: PostReviewRequest,
) {
  await request(REVIEWS_ROUTE, "POST", { accessToken, body: review });
}

export async function getReviews(
  accessToken: string | null,
  bookId: string,
): Promise<Review[]> {
  // TODO: the backend sends `userID` in `domain.Review` (capital D) but `lib/definitions.ts`
  // declares `userId`. The contract does not cover success bodies, so the backend agent owns the
  // field name. Left as-is rather than guessed at. `reviews/[bookId].tsx` keys on `userId`.
  return request<Review[]>(REVIEWS_ROUTE, "GET", {
    accessToken,
    query: { bookId },
  });
}
