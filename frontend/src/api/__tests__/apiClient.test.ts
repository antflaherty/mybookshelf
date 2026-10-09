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

function jsonResponse(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: jest.fn().mockResolvedValue(body),
    text: jest.fn().mockResolvedValue(JSON.stringify(body)),
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
      jsonResponse({ error: "email taken" }, false, 409),
    );

    await expect(
      register({ email: "a@b.com", password: "pw" }),
    ).rejects.toThrow("email taken");
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

  it("throws with status and error on failure", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({ error: "bad credentials" }, false, 401),
    );

    await expect(
      login({ email: "a@b.com", password: "pw" }),
    ).rejects.toThrow("status: 401, error: bad credentials");
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

  it("throws on non-ok responses", async () => {
    mockFetch.mockResolvedValue(jsonResponse({}, false, 500));

    await expect(getBookmarks("tok")).rejects.toThrow("Response status: 500");
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
    mockFetch.mockResolvedValue(jsonResponse({}, false, 400));

    await expect(
      createBook("tok", { id: "", title: "", author: "", pageCount: 0 }),
    ).rejects.toThrow("HTTP error! Status: 400");
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
  // authorizedFetch keeps the handler in module-level state, so each test
  // works against a fresh copy of the module.
  let api: typeof import("@/api/apiClient");
  let handler: jest.Mock<Promise<void>, []>;

  beforeEach(() => {
    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- fresh module instance, not a static import
    api = require("@/api/apiClient");
    handler = jest.fn().mockResolvedValue(undefined);
  });

  it("invokes the registered handler on a 401 response", async () => {
    mockFetch.mockResolvedValue(jsonResponse({}, false, 401));
    api.setUnauthorizedHandler(handler);

    await expect(api.getShelves("tok")).rejects.toThrow(
      "Response status: 401",
    );

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("invokes the handler for any authorized endpoint returning 401", async () => {
    mockFetch.mockResolvedValue(jsonResponse({}, false, 401));
    api.setUnauthorizedHandler(handler);

    await expect(api.getReviews("tok", "b1")).rejects.toThrow(
      "Response status: 401",
    );

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("does not invoke the handler on other error statuses", async () => {
    mockFetch.mockResolvedValue(jsonResponse({}, false, 500));
    api.setUnauthorizedHandler(handler);

    await expect(api.getBookmarks("tok")).rejects.toThrow(
      "Response status: 500",
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
    mockFetch.mockResolvedValue(jsonResponse({}, false, 401));

    await expect(api.getShelves("tok")).rejects.toThrow(
      "Response status: 401",
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
    mockFetch.mockResolvedValue(jsonResponse({}, false, 401));

    const settled = jest.fn();
    const request = api.getShelves("tok").catch((e: Error) => settled(e.message));

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(settled).not.toHaveBeenCalled();

    releaseHandler();
    await request;

    expect(settled).toHaveBeenCalledWith("Response status: 401");
  });

  it("invokes the handler once per request", async () => {
    mockFetch.mockResolvedValue(jsonResponse({}, false, 401));
    api.setUnauthorizedHandler(handler);

    await expect(api.getShelves("tok")).rejects.toThrow();
    await expect(api.getBookmarks("tok")).rejects.toThrow();

    expect(handler).toHaveBeenCalledTimes(2);
  });

  it("propagates a handler rejection to the caller", async () => {
    handler.mockRejectedValue(new Error("secure store unavailable"));
    api.setUnauthorizedHandler(handler);
    mockFetch.mockResolvedValue(jsonResponse({}, false, 401));

    await expect(api.getShelves("tok")).rejects.toThrow(
      "secure store unavailable",
    );
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
