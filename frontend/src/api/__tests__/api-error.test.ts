import { ApiError, GENERIC_ERROR_MESSAGE } from "@/api/api-error";

beforeEach(() => {
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("fromResponse with a well-formed body", () => {
  it("uses the server's code, message and details", () => {
    const error = ApiError.fromResponse(404, {
      error: {
        code: "book_not_found",
        message: "book not found",
        details: { bookId: "/works/OL1M" },
      },
    });

    expect(error.status).toBe(404);
    expect(error.code).toBe("book_not_found");
    expect(error.message).toBe("book not found");
    expect(error.details).toEqual({ bookId: "/works/OL1M" });
    expect(error.isNetworkError).toBe(false);
  });

  it("leaves details undefined when the response omits them", () => {
    const error = ApiError.fromResponse(409, {
      error: { code: "email_taken", message: "email already registered" },
    });

    expect(error.details).toBeUndefined();
    expect(error.code).toBe("email_taken");
  });
});

describe("fromResponse with a missing or unusable body", () => {
  it("falls back by status for a null body", () => {
    const error = ApiError.fromResponse(404, null);

    expect(error.status).toBe(404);
    expect(error.code).toBe("unexpected_response");
    expect(error.message).toBe("not found");
  });

  it("does not surface an HTML string body", () => {
    const error = ApiError.fromResponse(502, "<html><body>502 Bad Gateway</body></html>");

    expect(error.message).toBe(GENERIC_ERROR_MESSAGE);
    expect(error.message).not.toContain("<html>");
    expect(error.code).toBe("unexpected_response");
  });

  it("falls back when the message is missing", () => {
    const error = ApiError.fromResponse(400, { error: { code: "invalid_request" } });

    expect(error.code).toBe("invalid_request");
    expect(error.message).toBe("invalid request");
  });

  it("falls back when the message is empty or whitespace", () => {
    const error = ApiError.fromResponse(404, {
      error: { code: "not_found", message: "   " },
    });

    expect(error.message).toBe("not found");
  });

  it("treats an unknown code as unexpected_response but keeps the message", () => {
    const error = ApiError.fromResponse(400, {
      error: { code: "teapot_error", message: "i am a teapot" },
    });

    expect(error.code).toBe("unexpected_response");
    expect(error.message).toBe("i am a teapot");
  });

  it("ignores a non-string code", () => {
    const error = ApiError.fromResponse(400, {
      error: { code: 42, message: "bad" },
    });

    expect(error.code).toBe("unexpected_response");
    expect(error.message).toBe("bad");
  });

  it("ignores an error field that is not an object", () => {
    const error = ApiError.fromResponse(409, { error: "email taken" });

    expect(error.code).toBe("unexpected_response");
    expect(error.message).toBe("conflict");
  });

  it("survives an empty object", () => {
    const error = ApiError.fromResponse(404, {});

    expect(error.code).toBe("unexpected_response");
    expect(error.message).toBe("not found");
  });
});

describe("fromResponse details parsing", () => {
  it("drops details that are not a plain object", () => {
    const error = ApiError.fromResponse(400, {
      error: { code: "invalid_request", message: "bad", details: "oops" },
    });

    expect(error.details).toBeUndefined();
  });

  it("drops details whose values are not all strings", () => {
    const error = ApiError.fromResponse(400, {
      error: {
        code: "invalid_request",
        message: "bad",
        details: { currentPage: 12, limit: "too big" },
      },
    });

    expect(error.details).toBeUndefined();
  });

  it("drops an array passed as details", () => {
    const error = ApiError.fromResponse(400, {
      error: { code: "invalid_request", details: ["currentPage"] },
    });

    expect(error.details).toBeUndefined();
  });

  it("accepts an empty details object", () => {
    const error = ApiError.fromResponse(400, {
      error: { code: "invalid_request", message: "bad", details: {} },
    });

    expect(error.details).toEqual({});
  });
});

describe("5xx messages are never surfaced", () => {
  it("replaces a malicious 500 message with the fallback", () => {
    const error = ApiError.fromResponse(500, {
      error: {
        code: "internal_error",
        message: "<script>alert('pwned')</script> pq: password authentication failed",
      },
    });

    expect(error.message).toBe(GENERIC_ERROR_MESSAGE);
    expect(error.code).toBe("internal_error");
    expect(error.status).toBe(500);
  });

  it("replaces a 502 upstream message too", () => {
    const error = ApiError.fromResponse(502, {
      error: { code: "upstream_unavailable", message: "dial tcp 10.0.0.1:80" },
    });

    expect(error.message).toBe(GENERIC_ERROR_MESSAGE);
  });

  it("uses the generic fallback for a 5xx with no body at all", () => {
    const error = ApiError.fromResponse(503, null);

    expect(error.message).toBe(GENERIC_ERROR_MESSAGE);
  });

  it("logs the suppressed body to the console", () => {
    ApiError.fromResponse(500, {
      error: { code: "internal_error", message: "sql: no such table" },
    });

    expect(console.error).toHaveBeenCalled();
  });

  it("does not log a non-5xx error", () => {
    ApiError.fromResponse(404, {
      error: { code: "book_not_found", message: "book not found" },
    });

    expect(console.error).not.toHaveBeenCalled();
  });
});

describe("status fallback messages", () => {
  it.each([
    [400, "invalid request"],
    [401, "please sign in again"],
    [403, "not allowed"],
    [404, "not found"],
    [409, "conflict"],
    [418, GENERIC_ERROR_MESSAGE],
    [500, GENERIC_ERROR_MESSAGE],
    [503, GENERIC_ERROR_MESSAGE],
  ])("maps %i to %s", (status, expected) => {
    expect(ApiError.fromResponse(status, null).message).toBe(expected);
  });
});

describe("network", () => {
  it("reports status 0, the network code and keeps the cause", () => {
    const cause = new TypeError("Network request failed");
    const error = ApiError.network(cause);

    expect(error.status).toBe(0);
    expect(error.code).toBe("network_error");
    expect(error.isNetworkError).toBe(true);
    expect(error.message).toBe("could not reach the server. check your connection.");
    expect(error.cause).toBe(cause);
  });

  it("accepts a non-Error cause", () => {
    const error = ApiError.network("socket hang up");

    expect(error.cause).toBe("socket hang up");
    expect(error.message).toBe("could not reach the server. check your connection.");
  });
});

describe("instanceof", () => {
  it("is an Error from fromResponse", () => {
    const error = ApiError.fromResponse(500, null);

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.name).toBe("ApiError");
  });

  it("is an Error from network", () => {
    const error = ApiError.network(new Error("boom"));

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.name).toBe("ApiError");
  });
});
