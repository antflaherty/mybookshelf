/**
 * Typed representation of every failure the API client can surface.
 *
 * The wire format is:
 *
 *     { "error": { "code": "...", "message": "...", "details": { ... } } }
 *
 * Parsing is deliberately defensive. The body of a failed request is untrusted: it can be absent,
 * `null`, an HTML error page from a proxy or a spun-down Render instance, or JSON that does not
 * match the wire format above. None of those may throw, and none of them may put raw markup or driver text
 * in front of a user.
 */

export type ApiErrorCode =
  | "invalid_request"
  | "unauthorized"
  | "invalid_credentials"
  | "book_not_found"
  | "shelf_not_found"
  | "not_found"
  | "email_taken"
  | "internal_error"
  | "upstream_unavailable"
  | "network_error"
  | "unexpected_response";

/** Every value of `ApiErrorCode`. A `code` outside this set is not trusted. */
const KNOWN_ERROR_CODES: readonly string[] = [
  "invalid_request",
  "unauthorized",
  "invalid_credentials",
  "book_not_found",
  "shelf_not_found",
  "not_found",
  "email_taken",
  "internal_error",
  "upstream_unavailable",
  "network_error",
  "unexpected_response",
];

export const GENERIC_ERROR_MESSAGE = "something went wrong. please try again.";

const NETWORK_ERROR_MESSAGE = "could not reach the server. check your connection.";

function fallbackMessageForStatus(status: number): string {
  if (status === 400) {
    return "invalid request";
  }
  if (status === 401) {
    return "please sign in again";
  }
  if (status === 403) {
    return "not allowed";
  }
  if (status === 404) {
    return "not found";
  }
  if (status === 409) {
    return "conflict";
  }
  return GENERIC_ERROR_MESSAGE;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readStringMap(value: unknown): Record<string, string> | undefined {
  if (!isPlainObject(value)) {
    return undefined;
  }

  const entries = Object.entries(value);

  if (!entries.every(([, entry]) => typeof entry === "string")) {
    return undefined;
  }

  return Object.fromEntries(entries) as Record<string, string>;
}

interface ApiErrorInit {
  /** 0 when the request never completed (offline, DNS failure, ...). */
  status: number;
  code: ApiErrorCode;
  details?: Record<string, string>;
  isNetworkError?: boolean;
  cause?: unknown;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly details?: Record<string, string>;
  readonly isNetworkError: boolean;
  readonly cause?: unknown;

  constructor(message: string, init: ApiErrorInit) {
    super(message);

    this.name = "ApiError";
    this.status = init.status;
    this.code = init.code;
    this.details = init.details;
    this.isNetworkError = init.isNetworkError ?? false;
    this.cause = init.cause;
  }

  /**
   * Builds an error from a non-2xx response. `body` is whatever could be parsed out of the
   * response text, which may be `null` when the body was empty or unparseable.
   */
  static fromResponse(status: number, body: unknown): ApiError {
    const envelope = isPlainObject(body) ? body.error : undefined;
    const error = isPlainObject(envelope) ? envelope : undefined;

    const code = ApiError.readCode(error);

    let message: string;
    if (status >= 500) {
      // A 5xx message is never surfaced verbatim, even when the body carries one. The API
      // fixes those messages, but a proxy or load balancer sitting in front of it does not,
      // and an HTML error page must not end up on a user's screen. The real body goes to the
      // console instead.
      message = fallbackMessageForStatus(status);

      if (error !== undefined) {
        console.error(
          `ApiError: suppressing ${status} response body`,
          JSON.stringify(error),
        );
      }
    } else {
      const serverMessage = error?.message;

      message =
        typeof serverMessage === "string" && serverMessage.trim() !== ""
          ? serverMessage
          : fallbackMessageForStatus(status);
    }

    return new ApiError(message, {
      status,
      code,
      details: readStringMap(error?.details),
    });
  }

  /** A `fetch` rejection. The request never produced a response. */
  static network(cause: unknown): ApiError {
    return new ApiError(NETWORK_ERROR_MESSAGE, {
      status: 0,
      code: "network_error",
      isNetworkError: true,
      cause,
    });
  }

  private static readCode(
    error: Record<string, unknown> | undefined,
  ): ApiErrorCode {
    const code = error?.code;

    if (typeof code !== "string") {
      // No envelope at all: HTML page, empty body, or a shape we do not recognise.
      return "unexpected_response";
    }

    if (KNOWN_ERROR_CODES.includes(code)) {
      return code as ApiErrorCode;
    }

    return "unexpected_response";
  }
}
