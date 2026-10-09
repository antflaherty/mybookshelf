# API Error Contract

**Status: frozen. Both agents implement against this document. It is read-only for them.**

Neither the backend agent nor the frontend agent may change this file without flagging it in
their final report. If implementation reality and this document disagree, the document is
correct and the implementation is wrong.

Last updated: 2026-10-09, alongside plans in `docs/plans/`.

---

## 1. Envelope

Every non-2xx response body has exactly this shape:

```json
{
  "error": {
    "code": "book_not_found",
    "message": "book not found",
    "details": { "bookId": "/works/OL1M" }
  }
}
```

| Field     | Type                | Required | Purpose                                                     |
| --------- | ------------------- | -------- | ----------------------------------------------------------- |
| `code`    | string, snake_case  | always   | Stable machine-readable identifier. Clients switch on this.  |
| `message` | string              | always   | Human-readable, safe to show a user verbatim. Never contains SQL, driver text, or stack traces. |
| `details` | object of strings   | no       | Field-level validation messages. Present only on `invalid_request`. Omitted entirely otherwise. |

Success responses are unchanged. No success response gains an `error` field.

`details` keys are the JSON field names from the request body (e.g. `currentPage`), or the query
parameter name for query-level failures (e.g. `limit`).

## 2. Codes and statuses

The status code is derived from the code. This table is exhaustive.

| Status | `code`                 | When                                                             |
| ------ | ---------------------- | ---------------------------------------------------------------- |
| 400    | `invalid_request`      | Body or query params fail to bind or validate. Always has `details`. |
| 401    | `unauthorized`         | Missing, malformed, or invalid/expired `Authorization` header.   |
| 401    | `invalid_credentials`  | Login email or password is wrong. Deliberately non-specific so it cannot enumerate accounts. |
| 404    | `book_not_found`       | Book ID unknown to Open Library, or not present in the `book` table. |
| 404    | `shelf_not_found`      | Shelf does not exist, or is not owned by the caller. Treated identically to avoid leaking other users' shelf IDs. |
| 404    | `not_found`            | Generic 404 for resources with no specific code.                  |
| 409    | `email_taken`          | Registration email already exists.                               |
| 500    | `internal_error`       | Unexpected server failure. `message` is always exactly `"internal server error"`. Detail goes to logs only. |
| 502    | `upstream_unavailable` | Open Library returned non-2xx, timed out, or sent unparseable JSON. `message` is always exactly `"book service unavailable"`. |

`internal_error` and `upstream_unavailable` are the only codes whose message is fixed regardless
of cause. Everything else may carry a specific message.

### 2.1 Status code per endpoint

**`POST /auth/register`**

| Condition                       | Status | `code`             |
| ------------------------------- | ------ | ------------------ |
| Body unreadable / bad email / password under 6 chars | 400 | `invalid_request` |
| Email already registered        | 409    | `email_taken`      |
| bcrypt failure, insert failure  | 500    | `internal_error`   |

**`POST /auth/login`**

| Condition                          | Status | `code`                |
| ---------------------------------- | ------ | --------------------- |
| Body unreadable                    | 400    | `invalid_request`     |
| Unknown email, or wrong password  | 401    | `invalid_credentials` |
| JWT signing failure, query failure | 500   | `internal_error`      |

**`GET /books?title=...`**

| Condition                                            | Status | `code`                 |
| ---------------------------------------------------- | ------ | ---------------------- |
| Neither or both of `title` / `id` given             | 400    | `invalid_request`      |
| `limit` or `page` non-numeric, or out of range       | 400    | `invalid_request`      |
| Open Library 5xx, timeout, or unparseable JSON       | 502    | `upstream_unavailable` |
| Success, zero results                               | 200    | `[]`                   |

**`GET /books?id=...`**

| Condition                                        | Status | `code`                 |
| ------------------------------------------------ | ------ | ---------------------- |
| Open Library has no such work                    | 404    | `book_not_found`       |
| Open Library 5xx, timeout, or unparseable JSON   | 502    | `upstream_unavailable` |
| Success                                          | 200    | book details object    |

**`POST /books`**

| Condition                                  | Status | `code`            |
| ------------------------------------------ | ------ | ----------------- |
| Body fails to bind / validate              | 400    | `invalid_request` |
| Insert fails                               | 500    | `internal_error`  |

Stays `200 OK` on both the create and the already-exists path. This is a client-driven upsert,
not a resource-creation endpoint; changing it to 201 is out of scope for this work.

**`GET /bookmarks`, `GET /shelves`**

| Condition  | Status | `code`            |
| ---------- | ------ | ----------------- |
| Query failure | 500 | `internal_error`  |

**`POST /bookmarks`**

| Condition                                        | Status | `code`            |
| ------------------------------------------------ | ------ | ----------------- |
| Body fails to bind / validate                    | 400    | `invalid_request` |
| `bookId` not in the `book` table                 | 404    | `book_not_found`  |
| `shelfId` missing, or not owned by the caller    | 404    | `shelf_not_found` |
| Upsert failure                                   | 500    | `internal_error`  |

**`GET /reviews`**

| Condition          | Status | `code`            |
| ------------------ | ------ | ----------------- |
| `bookId` absent    | 400    | `invalid_request` |
| Query failure      | 500    | `internal_error`  |

**`POST /reviews`**

| Condition                     | Status | `code`            |
| ----------------------------- | ------ | ----------------- |
| Body fails to bind / validate | 400    | `invalid_request` |
| `bookId` not in `book` table  | 404    | `book_not_found`  |
| Upsert failure                | 500    | `internal_error`  |

`stars` is validated in range `0..20` inclusive at the handler, matching the
`CHECK (stars BETWEEN 0 AND 20)` constraint and the frontend's quarter-star scale
(`StarRating`, `MAX_RATING = 20`). Out-of-range is a 400, not a 500 from the constraint.

**All protected routes** additionally return `401` / `unauthorized` from the auth middleware.

## 3. Messages that must not change

These strings are asserted by frontend tests and shown to users:

- `"invalid email or password"` (login failure)
- `"authorization header required"` (missing header)
- `"invalid authorization header"` (malformed header)
- `"invalid or expired token"` (bad token)
- `"internal server error"` (any 500)
- `"book service unavailable"` (any 502)

## 4. Non-responses

These are not errors and must not be changed into errors:

- `GET /books?title=...` returning `[]` is a 200 with an empty array, not a 404.
- `GET /reviews` returning `[]` is a 200 with an empty array.
- `GET /bookmarks` and `GET /shelves` returning empty collections is a 200.