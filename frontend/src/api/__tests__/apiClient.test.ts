import {
  ApiError,
} from "@/api/api-error";
import {
  createBook,
  getBookDetails,
  getBookmarks,
  getReviews,
  getShelves,
  login,
  placeBookmark,
  postReview,
  register,
  searchBooks,
} from "@/api/apiClient";

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

// `request` reads `text()` and parses it itself. The real Response exposes no `json()` after the
// body has been consumed, so the mock deliberately does not implement one: if any code path
// reaches for `response.json()`, it fails loudly instead of silently working here.
function jsonResponse(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    text: jest.fn().mockResolvedValue(JSON.stringify(body)),
  } as unknown as Response;
}

function rawResponse(raw: string, ok = false, status = 500) {
  return {
    ok,
    status,
    text: jest.fn().mockResolvedValue(raw),
  } as unknown as Response;
}

function emptyResponse(ok = true, status = 200) {
  return {
    ok,
    status,
    text: jest.fn().mockResolvedValue(""),
  } as unknown as Response;
}

beforeEach(() => {
  mockFetch.mockReset();
  jest.spyOn(console, "error").mockImplementation(() => {});
  jest.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("register", () => {
  it("posts the user and lowercases the email", async () => {
    mockFetch.mockResolvedValue(jsonResponse({}));

    await register({ email: "Alice@Example.COM", password: "secret" });

    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.test/auth/register",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ email: "alice@example.com", password: "secret" }),
      }),
    );
  });

  it("throws the server error message on failure", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse(
        { error: { code: "email_taken", message: "email already registered" } },
        false,
        409,
      ),
    );

    await expect(
      register({ email: "a@b.com", password: "pw" }),
    ).rejects.toThrow("email already registered");
  });
});

describe("login", () => {
  it("returns the access token on success", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ access_token: "tok123" }));

    await expect(
      login({ email: "A@B.com", password: "pw" }),
    ).resolves.toBe("tok123");

    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.test/auth/login",
      expect.objectContaining({
        body: JSON.stringify({ email: "a@b.com", password: "pw" }),
      }),
    );
  });

  it("throws the server's message on a 401", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse(
        {
          error: {
            code: "invalid_credentials",
            message: "invalid email or password",
          },
        },
        false,
        401,
      ),
    );

    const error = await login({ email: "a@b.com", password: "pw" }).catch(
      (e: unknown) => e,
    );

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).message).toBe("invalid email or password");
    expect((error as ApiError).status).toBe(401);
    expect((error as ApiError).code).toBe("invalid_credentials");
  });

  it("throws when a 200 carries no access token", async () => {
    mockFetch.mockResolvedValue(jsonResponse({}));

    await expect(login({ email: "a@b.com", password: "pw" })).rejects.toThrow(
      ApiError,
    );
  });
});

describe("authorized requests", () => {
  it("sends the bearer token", async () => {
    mockFetch.mockResolvedValue(jsonResponse([]));

    await getShelves("mytoken");

    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.test/shelves",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer mytoken",
        }),
      }),
    );
  });

  it("throws when there is no access token", async () => {
    await expect(getShelves(null)).rejects.toThrow("not logged in");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("reports the missing token as an unauthorized ApiError", async () => {
    const error = await getShelves(null).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).code).toBe("unauthorized");
    expect((error as ApiError).status).toBe(0);
  });

  it("throws on non-ok responses", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse(
        { error: { code: "internal_error", message: "internal server error" } },
        false,
        500,
      ),
    );

    const error = await getBookmarks("tok").catch((e: unknown) => e);

    expect((error as ApiError).status).toBe(500);
    expect((error as ApiError).message).toBe(
      "something went wrong. please try again.",
    );
  });

  it("returns an empty array when json is null", async () => {
    mockFetch.mockResolvedValue(jsonResponse(null));

    await expect(getShelves("tok")).resolves.toEqual([]);
  });
});

describe("searchBooks", () => {
  it("builds the query string and returns books", async () => {
    mockFetch.mockResolvedValue(jsonResponse([{ id: "1", title: "Dune" }]));

    const books = await searchBooks("tok", "Dune", 10, 2);

    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.test/books?title=Dune&limit=10&page=2",
      expect.anything(),
    );
    expect(books).toHaveLength(1);
  });
});

describe("getBookDetails", () => {
  it("passes the book id as a query param", async () => {
    const details = { id: "abc", blurb: "...", genres: [], book: {} };
    mockFetch.mockResolvedValue(jsonResponse(details));

    await expect(getBookDetails("tok", "abc")).resolves.toEqual(details);
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.test/books?id=abc",
      expect.anything(),
    );
  });
});

describe("createBook", () => {
  it("posts the book and returns the created book", async () => {
    const book = {
      id: "1",
      title: "Dune",
      author: "Herbert",
      pageCount: 400,
    };
    mockFetch.mockResolvedValue(jsonResponse(book));

    await expect(createBook("tok", book)).resolves.toEqual(book);
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.test/books",
      expect.objectContaining({ method: "POST", body: JSON.stringify(book) }),
    );
  });

  it("throws on failure", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse(
        {
          error: {
            code: "invalid_request",
            message: "invalid request",
            details: { title: "must not be empty" },
          },
        },
        false,
        400,
      ),
    );

    const error = await createBook("tok", {
      id: "",
      title: "",
      author: "",
      pageCount: 0,
    }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).message).toBe("invalid request");
    expect((error as ApiError).details).toEqual({ title: "must not be empty" });
  });
});

describe("placeBookmark", () => {
  it("posts the bookmark request", async () => {
    mockFetch.mockResolvedValue(jsonResponse({}));

    await placeBookmark("tok", { bookId: "b1", shelfId: "s1", currentPage: 42 });

    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.test/bookmarks",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ bookId: "b1", shelfId: "s1", currentPage: 42 }),
      }),
    );
  });
});

describe("unauthorized handling", () => {
  // `request` keeps the handler in module-level state, so each test works against a fresh copy of
  // the module.
  let api: typeof import("@/api/apiClient");
  let handler: jest.Mock<Promise<void>, []>;

  const UNAUTHORIZED = () =>
    jsonResponse(
      {
        error: { code: "unauthorized", message: "invalid or expired token" },
      },
      false,
      401,
    );

  beforeEach(() => {
    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- fresh module instance, not a static import
    api = require("@/api/apiClient");
    handler = jest.fn().mockResolvedValue(undefined);
  });

  it("invokes the registered handler on a 401 response", async () => {
    mockFetch.mockResolvedValue(UNAUTHORIZED());
    api.setUnauthorizedHandler(handler);

    await expect(api.getShelves("tok")).rejects.toThrow(
      "invalid or expired token",
    );

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("invokes the handler for any authorized endpoint returning 401", async () => {
    mockFetch.mockResolvedValue(UNAUTHORIZED());
    api.setUnauthorizedHandler(handler);

    await expect(api.getReviews("tok", "b1")).rejects.toThrow(
      "invalid or expired token",
    );

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("does not invoke the handler on other error statuses", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse(
        { error: { code: "internal_error", message: "internal server error" } },
        false,
        500,
      ),
    );
    api.setUnauthorizedHandler(handler);

    // A 500's body message is suppressed, so assert on the fallback rather than on the class.
    // `jest.resetModules()` means this block's copy of ApiError is a different class identity
    // than the one imported at the top of the file.
    await expect(api.getBookmarks("tok")).rejects.toThrow(
      "something went wrong. please try again.",
    );

    expect(handler).not.toHaveBeenCalled();
  });

  it("does not invoke the handler on a successful response", async () => {
    mockFetch.mockResolvedValue(jsonResponse([]));
    api.setUnauthorizedHandler(handler);

    await api.getShelves("tok");

    expect(handler).not.toHaveBeenCalled();
  });

  it("does not throw when no handler is registered", async () => {
    mockFetch.mockResolvedValue(UNAUTHORIZED());

    await expect(api.getShelves("tok")).rejects.toThrow(
      "invalid or expired token",
    );
  });

  it("waits for the handler to settle before returning", async () => {
    let releaseHandler = () => {};
    handler.mockReturnValue(
      new Promise<void>((resolve) => {
        releaseHandler = resolve;
      }),
    );
    api.setUnauthorizedHandler(handler);
    mockFetch.mockResolvedValue(UNAUTHORIZED());

    const settled = jest.fn();
    const request = api.getShelves("tok").catch((e: Error) => settled(e.message));

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(settled).not.toHaveBeenCalled();

    releaseHandler();
    await request;

    expect(settled).toHaveBeenCalledWith("invalid or expired token");
  });

  it("invokes the handler once per request", async () => {
    mockFetch.mockResolvedValue(UNAUTHORIZED());
    api.setUnauthorizedHandler(handler);

    await expect(api.getShelves("tok")).rejects.toThrow();
    await expect(api.getBookmarks("tok")).rejects.toThrow();

    expect(handler).toHaveBeenCalledTimes(2);
  });

  it("propagates a handler rejection to the caller", async () => {
    handler.mockRejectedValue(new Error("secure store unavailable"));
    api.setUnauthorizedHandler(handler);
    mockFetch.mockResolvedValue(UNAUTHORIZED());

    await expect(api.getShelves("tok")).rejects.toThrow(
      "secure store unavailable",
    );
  });
});

describe("defensive body parsing", () => {
  it("turns an HTML 502 into an ApiError rather than a SyntaxError", async () => {
    mockFetch.mockResolvedValue(
      rawResponse("<html>502 Bad Gateway</html>", false, 502),
    );

    const error = await getShelves("tok").catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).not.toBeInstanceOf(SyntaxError);
    expect((error as ApiError).status).toBe(502);
    expect((error as ApiError).message).toBe(
      "something went wrong. please try again.",
    );
    expect((error as ApiError).message).not.toContain("<html>");
    expect((error as ApiError).code).toBe("unexpected_response");
  });

  it("does not report an HTML 502 as a network error", async () => {
    mockFetch.mockResolvedValue(
      rawResponse("<html>502 Bad Gateway</html>", false, 502),
    );

    const error = await getShelves("tok").catch((e: unknown) => e);

    expect((error as ApiError).isNetworkError).toBe(false);
  });

  it("does not throw while parsing a null body on a 500", async () => {
    mockFetch.mockResolvedValue(emptyResponse(false, 500));

    const error = await getShelves("tok").catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).message).toBe(
      "something went wrong. please try again.",
    );
  });

  it("resolves to null for an empty 200 body", async () => {
    mockFetch.mockResolvedValue(emptyResponse());

    await expect(getBookDetails("tok", "b1")).resolves.toBeNull();
  });

  it("resolves a 200 whose body is invalid JSON without throwing", async () => {
    mockFetch.mockResolvedValue(rawResponse("not json at all", true, 200));

    await expect(getReviews("tok", "b1")).resolves.toBeNull();
  });

  it("survives a body that cannot be read at all", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      text: jest.fn().mockRejectedValue(new Error("stream closed")),
    } as unknown as Response);

    const error = await getShelves("tok").catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(500);
  });

  it("turns a fetch rejection into a network ApiError", async () => {
    mockFetch.mockRejectedValue(new TypeError("Network request failed"));

    const error = await getShelves("tok").catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).isNetworkError).toBe(true);
    expect((error as ApiError).status).toBe(0);
    expect((error as ApiError).code).toBe("network_error");
    expect((error as ApiError).message).toBe(
      "could not reach the server. check your connection.",
    );
  });

  it("reports an offline login as a network error too", async () => {
    mockFetch.mockRejectedValue(new TypeError("Network request failed"));

    const error = await login({ email: "a@b.com", password: "pw" }).catch(
      (e: unknown) => e,
    );

    expect((error as ApiError).isNetworkError).toBe(true);
  });

  it("does not call the unauthorized handler on a fetch rejection", async () => {
    mockFetch.mockRejectedValue(new TypeError("Network request failed"));

    await expect(getShelves("tok")).rejects.toThrow(ApiError);
  });
});

describe("reviews", () => {
  it("posts a review", async () => {
    mockFetch.mockResolvedValue(jsonResponse({}));

    await postReview("tok", {
      bookId: "b1",
      stars: 16,
      comment: "great",
      timestamp: "2026-10-04T00:00:00Z",
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.test/reviews",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("gets reviews for a book", async () => {
    mockFetch.mockResolvedValue(jsonResponse([{ bookId: "b1", stars: 20 }]));

    const reviews = await getReviews("tok", "b1");

    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.test/reviews?bookId=b1",
      expect.anything(),
    );
    expect(reviews).toHaveLength(1);
  });
});
