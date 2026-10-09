# Backend Error Handling Plan

**Agent: backend. You own `backend/` only. Do not read, write, or edit anything under `frontend/`.**

Read `docs/api-error-contract.md` first and treat it as read-only. It is the source of truth for
every status code, code string, and message in this plan. If this plan and the contract ever
disagree, the contract wins and you should say so in your report.

Backend is Go + Gin + `database/sql` (no ORM). Go 1.27. CI runs `go test ./...`, `go vet ./...`,
`go build ./...` from `backend/`.

## Current problems, for context

- Statuses are chosen ad hoc. A missing book (`books/handlers.go:50`) returns 500 because
  `GetBookDetails` has no distinguishable "not found" error.
- `library/openlibrary.go` never checks `response.StatusCode`. An Open Library 404 decodes to an
  empty struct and silently produces a blank book.
- Raw `err.Error()` is returned to clients on 500s, leaking SQL and Go error text.
- Five handlers return a bare string to `c.JSON` instead of the `gin.H` envelope
  (`books/handlers.go:72,85`, `bookmarks/handlers.go:42,52`, `reviews/handlers.go:50`).
- `POST /auth/register` returns 500 with a unique-violation string when an email is taken.
- No validation on `POST /reviews` or `POST /bookmarks` bodies; the DB `CHECK` constraint is the
  only guard, so a bad `stars` becomes a 500.
- `POST /bookmarks` accepts any `shelfId`, including one belonging to another user. **This is a
  real authorization bug, not just a status-code issue.** Task 5.4 fixes it and changes behaviour.

---

## Phase 0 — Preflight

- [x] **0.1** Run `cd backend && go build ./... && go vet ./... && go test ./...` before changing
      anything. Record the baseline result. If a test already fails, say so in your report and
      leave it failing; do not silently fix it.
      _Baseline: all green. auth, books, config, health, library pass; no pre-existing failures._
- [x] **0.2** Read every file you touch end to end before editing it.

---

## Phase 1 — `apierr` package

New package `backend/apierr`. This is the only place allowed to build error responses.

- [x] **1.1** Create `backend/apierr/apierr.go`. Define:

  ```go
  // Body is the wire envelope. Matches docs/api-error-contract.md §1.
  type Body struct {
      Error Payload `json:"error"`
  }

  type Payload struct {
      Code    string            `json:"code"`
      Message string            `json:"message"`
      Details map[string]string `json:"details,omitempty"`
  }

  // Error is an API-safe error carrying the status to respond with.
  // cause holds the internal error for logging; it is never serialized.
  type Error struct {
      Status  int
      Code    string
      Message string
      Details map[string]string
      cause   error
  }

  func (e *Error) Error() string
  func (e *Error) Unwrap() error
  ```

  `Error()` returns the message. `Unwrap()` returns `cause`. There is no exported constructor
  taking a `cause`, so a caller cannot accidentally leak internals.

- [x] **1.2** Constructors, one per row of contract §2. Each fixes the status. Messages for
      `internal_error` and `upstream_unavailable` must be the exact fixed strings from
      contract §3 and cannot be overridden by the caller:

  ```go
  func InvalidRequest(details map[string]string) *Error   // 400, message "invalid request"
  func InvalidRequestf(details map[string]string, msg string) *Error
  func Unauthorized() *Error                             // 401, "authorization header required"
  func InvalidCredentials() *Error                      // 401, "invalid email or password"
  func InvalidToken() *Error                            // 401, "invalid or expired token"
  func BookNotFound(id string) *Error                    // 404
  func ShelfNotFound(id string) *Error                   // 404
  func NotFound(what string) *Error                      // 404, generic
  func EmailTaken() *Error                               // 409
  func Internal(cause error) *Error                      // 500, message fixed
  func Upstream(cause error) *Error                      // 502, message fixed
  ```

  Book and shelf `NotFound` take the offending ID and put it in `Details`.

- [x] **1.3** `func Respond(c *gin.Context, err error)` in `backend/apierr/apierr.go`.

  Behaviour:
  - `errors.As(err, &apiErr)` succeeds → respond with its status and payload.
  - Otherwise → treat as `Internal(err)`; 500 with the fixed message.
  - Call `c.Abort()` so a handler that forgets to `return` still stops.
  _Deviation: `Abort` alone does not achieve this. It stops the handler chain, not the
  currently-running handler, so a missed `return` appends a second JSON document to the
  body. Respond also swaps in a discarding writer after the envelope is written. Test:
  `TestRespond_AbortsContext`._
  - Log every non-2xx response with the status, the code, the method, the path, and the unwrapped
    internal cause. Use `log/slog` with the request context. `gin.Default()` already installs its
    own logger; yours supplements it, it does not replace it.

- [x] **1.4** `func BindJSON(c *gin.Context, dst any) *apierr.Error` in `backend/apierr/binding.go`.

  Wraps `c.ShouldBindJSON`. On failure returns a ready-to-`Respond` `*apierr.Error` with status
  400, code `invalid_request`, and `Details` populated per field:
  - `*json.SyntaxError` / `*json.UnmarshalTypeError` → one entry keyed `"body"`.
  - `validator.ValidationErrors` (gin returns these from `ShouldBindJSON`) → one entry per failing
    field, keyed by the struct's **JSON** field name (lower the Go field name, or read the `json`
    tag — do not use the raw Go field name). Message is `field.Message`, which gin's validator
    already populates usefully.
    _Deviation: `validator.FieldError` has no `Message` method in v10.30.1, and its `Error()`
    embeds the Go struct and field names, which must not reach a client. `messageFor` builds
    the sentence from `ActualTag()` and `Param()` instead._

  Acceptance: a unit test posts `{"stars": 99}` to a test handler and asserts the response is 400
  with `code: "invalid_request"` and a key matching the JSON name `stars`. _Done:
  `TestBindJSON_ValidatorFailureUsesJSONFieldName`._

---

## Phase 2 — Repository error hygiene

No HTTP concepts here. These changes are about making "not found" distinguishable from
"something broke".

- [x] **2.1** In `backend/books/repository.go`, `QueryBookById` (line 9) currently returns raw
      `sql.ErrNoRows`. Wrap it:

      ```go
      var ErrBookNotFound = errors.New("book not found")
      ...
      if errors.Is(err, sql.ErrNoRows) {
          return nil, fmt.Errorf("%w: %s", ErrBookNotFound, id)
      }
      ```

      Exported, because `bookmarks` imports this package.

- [x] **2.2** Replace every `err == sql.ErrNoRows` / `err != sql.ErrNoRows` comparison with
      `errors.Is`. Current sites: `books/handlers.go:71`,
      `bookmarks/repository.go:44`, `reviews/repository.go:43`. Also add the `errors` import where
      missing.
      _`books/handlers.go:71` also converted, in Phase 4 as part of task 4.6._

- [x] **2.3** In `backend/reviews/repository.go`, `upsertReview` (line 9) runs an `INSERT` and
      then falls through to an `UPDATE` on the same row even when it just inserted. That is
      intentional (it sets `last_edited_timestamp` on create), so **leave the logic alone**. Only
      wrap the returned errors so the caller can tell them apart. Add
      `var ErrReviewStoreFailed = errors.New("review store failed")` and wrap any `db.Exec`
      failure with it.

- [x] **2.4** `backend/shelves/repository.go`: `queryAllShelves` returns `*[]domain.Shelf` and a
      `nil` slice is possible. Leave the signature; task 5.5 makes the caller nil-safe.

---

## Phase 3 — Open Library error mapping

`backend/library/openlibrary.go` is the only outbound dependency and currently cannot tell a
missing book from a broken one.

- [x] **3.1** Add package-level sentinels:

  ```go
  var ErrBookNotFound = errors.New("book not found")
  var ErrUpstream = errors.New("open library request failed")
  ```

  _Declared in `books/errors.go` and aliased here instead, as 4.5 recommends: `library`
  already imports `books`, so declaring them here would need `library` to import back.
  Handlers use `books.IsNotFoundError` / `books.IsUpstreamError`._

- [x] **3.2** Give `OpenLibrarySearchService` a `*http.Client` with a 10-second `Timeout`, set in
      `NewOpenLibrarySearchService`. Replace all three bare `http.Get` calls (lines 81, 109, 176)
      with it. A timeout must surface as `ErrUpstream`, not as a generic error.

- [x] **3.3** Add a single helper and use it for all three call sites:

  ```go
  // get performs a request and returns the body, mapping transport and
  // non-2xx failures to ErrUpstream and 404 to ErrBookNotFound.
  func (s OpenLibrarySearchService) get(url string) ([]byte, error)
  ```

  Mapping rules:
  - `*url.Error` with `Timeout() == true` → wrap `ErrUpstream`.
  - any other `*url.Error` → wrap `ErrUpstream`.
  - status 404 or 410 → wrap `ErrBookNotFound`.
  - any other non-2xx → wrap `ErrUpstream`, and log the status and URL (not the body).
  - 2xx → return the body, read to completion via `io.ReadAll` with the client's timeout as the
    backstop. Do not decode JSON inside this helper.

- [x] **3.4** Rewrite `searchBooks` (line 153) and `GetBookDetails` (line 71) to call `get` then
      `json.Unmarshal` the bytes. A JSON decode failure on a 2xx response is an upstream fault:
      wrap it in `ErrUpstream`, not in a bare decode error.

- [x] **3.5** In `GetBookDetails`, the genre loop (lines 100-124) does `defer response.Body.Close()`
      inside the loop, so bodies stay open until the function returns. That goes away once `get`
      owns the body. Additionally: a failed *genre* lookup must not fail the whole request. Wrap
      each genre fetch so that a `ErrUpstream` on one genre logs and yields an empty string, while
      the works fetch and the final `searchBooks` call propagate normally.

- [x] **3.6** `GetBookDetails` returns `errors.New("book not found")` inline at line 136 when the
      search yields no rows. Change it to wrap `ErrBookNotFound`. This is what task 5.2 maps to a
      404 — it is the fix for `books/handlers.go:50` returning 500 for a missing book.

- [x] **3.7** Tests in `backend/library/openlibrary_test.go` (existing tests stay untouched and must
      keep passing):
      - Spin up an `httptest.Server` returning 404; assert `errors.Is(err, ErrBookNotFound)`.
      - Same for 500; assert `errors.Is(err, ErrUpstream)`.
      - Server returning invalid JSON with 200; assert `ErrUpstream`.
      - Server that sleeps past the client timeout; assert `ErrUpstream`.
      Point the service at the test server by making `baseUrl`/`coversUrl` a field on the service
      struct defaulting to the current constants, so tests can override it.
      _Done, in a new `library/openlibrary_errors_test.go`; the existing tests in
      `openlibrary_test.go` are untouched and still pass. The package-level `getCoverUri` was
      kept as a wrapper because `TestGetCoverUri` calls it directly._

---

## Phase 4 — Rewire the handlers

Every handler in this phase ends up going through `apierr.Respond`. No handler constructs a
response body itself.

- [x] **4.1** `backend/auth/middleware.go`. Three near-identical blocks at lines 17, 26, 36.
      Replace all three with `apierr.Respond` using `apierr.Unauthorized()`,
      `apierr.InvalidAuthorizationHeader()`, and `apierr.InvalidToken()`. The messages must stay
      byte-identical to today's (contract §3). Because `Respond` calls `c.Abort()`, drop the
      `AbortWithStatusJSON` and the manual `return`.

      If you need a distinct constructor for the malformed-header case, name it
      `InvalidAuthorizationHeader()` with message `"invalid authorization header"`.

- [x] **4.2** `backend/auth/handlers.go` `RegisterHandler` (line 20):
      - `ShouldBindJSON` → `apierr.BindJSON`. Add `binding:"required,email"` to `Email` and
        `binding:"required,min=6"` to `Password` on `registerRequest` (line 15).
      - bcrypt failure → `apierr.Respond(c, apierr.Internal(err))`.
      - `createUser` failure → classify. A duplicate email is the `users_email_key` unique
        violation; detect it with `errors.Is` against `pq.Error` code `23505` (import
        `github.com/lib/pq`; it is already a dependency) and return `apierr.EmailTaken()` → 409.
        Any other failure → `apierr.Internal(err)`.
      - Success stays `201` with `{"id", "email"}`.

- [x] **4.3** `backend/auth/handlers.go` `LoginHandler` (line 57):
      - `ShouldBindJSON` → `apierr.BindJSON` with the same tags.
      - Replace the `sql.ErrNoRows` branch (line 68) and the bcrypt-compare branch (line 86) with
        `apierr.InvalidCredentials()` → 401, same message as today.
      - JWT creation failure → `apierr.Internal(err)`.
      - Add a short comment noting the two 401s are intentionally indistinguishable.

- [x] **4.4** `backend/auth/handlers.go` `createUser` (line 102) and
      `createDefaultShelvesForUser` (line 126): the user row is inserted outside the transaction
      that creates the default shelves, so a shelf failure leaves an orphan user with no shelves
      and `register` returns 500. **Out of scope for this plan** — do not restructure the
      transaction. Leave a `// TODO(error-handling):` comment at line 117 recording it, and
      mention it in your report.

- [x] **4.5** `backend/books/handlers.go` `GetBooksHandler` (line 13):
      - The both-or-neither check at line 18 → `apierr.InvalidRequest` with `Details{"query": "specify exactly one of title or id"}`.
      - `limit`/`page` parsing at lines 24 and 30 → `apierr.InvalidRequest` with `Details{"limit": ...}` / `Details{"page": ...}`. Add range
        checks the contract now requires: `limit` must be `1..100`, `page` must be `>= 1`.
      - Search failure at line 38 → `errors.Is(err, library.ErrUpstream)` would create an import
        cycle (`library` imports `books`). So map by code instead: `GetBooksHandler` takes its
        providers as interfaces (lines 13, and `search.go` / `details.go`), so add an
        `IsUpstreamError(error) bool` and an `IsNotFoundError(error) bool` to the `books` package,
        implemented with `errors.Is` against sentinels `books.ErrUpstream` and
        `books.ErrNotFound`. `library` returns errors that satisfy both (it wraps the same
        sentinels it already declares, aliased in `library` from `books` if that keeps the
        dependency direction clean — `library` already imports `books`, so declaring them in
        `books` and aliasing them in `library` is the arrangement with no cycle).
      - `ErrUpstream` → `apierr.Upstream(err)` → 502. Everything else → `apierr.Internal(err)`.
      - Details failure at line 50 → `IsNotFoundError` → `apierr.BookNotFound(id)` → **404**.
        This is the behaviour change for missing books; everything else → 500 / 502.

- [x] **4.6** `backend/books/handlers.go` `PostBookHandler` (line 61):
      - `ShouldBindJSON(&book)` → `apierr.BindJSON`. `domain.Book` has no binding tags and lives
        in the shared `domain` package; add a separate `postBookRequest` struct in `books` with
        `binding:"required"` on each field rather than tagging `domain.Book`.
        _Deviation: `required` is on `id` and `title` only. `pageCount: 0` and an empty
        `coverUri` are both real states for a book and `book.cover_uri` is nullable, so
        requiring them would reject valid books with a 400._
      - **Delete the `fmt.Println(bookInDb)` at line 75.** It is debug output and will corrupt
        response bodies in some setups. Also drop the now-unused `fmt` import.
      - Line 71's `err != sql.ErrNoRows` → `errors.Is`, then distinguish: not-found means "go
        ahead and insert", so this is not an error path at all. Return the found book, else insert.
      - Insert failure → `apierr.Internal(err)`.
      - Stays 200 on both paths (contract §2.1).

- [x] **4.7** `backend/bookmarks/handlers.go` `PostBookmarkHandler` (line 30):
      - `ShouldBindJSON` → `apierr.BindJSON` with tags: `BookID` required,
        `ShelfID` required, `CurrentPage` `required,gte=0`.
      - The `QueryBookById` error at line 41 is currently blanket-mapped to 404, so a genuine DB
        outage also reports 404. Split it: `errors.Is(err, books.ErrBookNotFound)` →
        `apierr.BookNotFound(...)` → 404; anything else → `apierr.Internal(err)` → 500.
      - Upsert failure → `apierr.Internal(err)`.
      - Note line 56 returns a `QualifiedBookmark` with only `Book` and `CurrentPage` set;
        `ShelfID` is populated on the embedded struct. Leave the response shape alone.

- [x] **4.8** `backend/bookmarks/handlers.go` `GetBookmarkHandler` (line 12) and
      `backend/shelves/handlers.go` `GetShelvesHandler` (line 12): query failures →
      `apierr.Internal(err)`.

- [x] **4.9** `backend/shelves/handlers.go` line 37:
      `shelfById[bookmark.ShelfID].Bookmarks` panics with a nil map value if a bookmark
      references a shelf missing from the user's shelf list — for example a shelf deleted
      directly in the database, or one belonging to another user (possible until task 5.4 lands).
      Task 5.5 makes this nil-safe.

- [x] **4.10** `backend/reviews/handlers.go`:
      - `GetReviewsHandler` line 13: missing `bookId` → `apierr.InvalidRequest` with
        `Details{"bookId": "bookId is required"}`.
      - `PostReviewHandler` line 36: `ShouldBindJSON` → `apierr.BindJSON` with
        `binding:"required"` on `BookID` and `binding:"required,gte=0,lte=20"` on `Stars`.
        The `lte=20` mirrors the DB `CHECK (stars BETWEEN 0 AND 20)` and the frontend's
        quarter-star scale, so a bad rating is a 400 instead of a constraint-violation 500.
        _Deviation: `Stars` is `gte=0,lte=20` without `required`. validator's `required`
        rejects the zero value, and 0 is a legitimate rating on a 0..20 scale, so
        `required` there would 400 a valid review._
      - Before upserting, confirm `bookId` exists via `books.QueryBookById`; not found →
        `apierr.BookNotFound(...)` → 404. This is required by contract §2.1 and currently the
        FK violation surfaces as a 500.
      - Upsert failure → `apierr.Internal(err)`. Stays 200.

---

## Phase 5 — Validation and authorization

- [x] **5.1** Add the binding tags listed in 4.2, 4.3, 4.6, 4.7, 4.10. Grep for every
      `ShouldBindJSON` and confirm none was missed:
      `auth/handlers.go` (2), `books/handlers.go` (1), `bookmarks/handlers.go` (1),
      `reviews/handlers.go` (1).

- [x] **5.2** `backend/library` and `backend/books` share the not-found and upstream sentinels
      (task 4.5). Confirm the mapping is complete by writing the test in 6.3.

- [x] **5.3** `GET /books?limit=0` and `?page=0` must be 400. `limit=101` must be 400. `limit=1`
      must be 200. Cover all four in the table test.

- [x] **5.4** **Behaviour change — flagged.** `POST /bookmarks` accepts any `shelfId`, so one user
      can attach their bookmark to another user's shelf. `bookmark.shelf_id` has a foreign key to
      `shelf(id)`, which passes because the shelf exists; nothing checks ownership.

      Add to `backend/shelves/repository.go`:
      _**Chosen option: put it in `bookmarks/repository.go`**, the recommended one. The SQL
      there is identical either way; what matters is the package, because
      `shelves` → `bookmarks` already exists and the reverse would be a cycle._

      ```go
      func queryShelfBelongsToUser(db *sql.DB, shelfID, userID string) (bool, error)
      ```

      `shelves` already imports `bookmarks` (`shelves/handlers.go:7`), so `bookmarks` must **not**
      import `shelves` or you get an import cycle. Options, pick one and note it in your report:
      put `queryShelfBelongsToUser` in `bookmarks/repository.go` (no new import, recommended), or
      move `QueryAllBookmarks` into a third package. Do not create the cycle.

      Call it from `PostBookmarkHandler` before the upsert. `false` → `apierr.ShelfNotFound(...)`
      → 404. A genuine query error → 500. Per contract §2.1 a missing shelf and a foreign shelf
      are both `shelf_not_found`, so the response does not reveal which shelves exist.

- [x] **5.5** `backend/shelves/handlers.go` line 37: skip bookmarks whose `ShelfID` is absent from
      `shelfById` instead of dereferencing nil, and log the skipped bookmark with its shelf ID.
      Do not 500 — an orphaned bookmark should not break the whole shelf list.

---

## Phase 6 — Tests

Backend has good table-driven tests already (`books/handlers_test.go`). Match that style:
`[]struct{ name, ...; wantStatus int }` with subtests, fakes as plain structs, no mock library.

- [x] **6.1** `backend/apierr/apierr_test.go`: `Respond` with a wrapped `*apierr.Error` uses its
      status; with an arbitrary error produces 500 and the fixed message; `Internal` and
      `Upstream` messages cannot be overridden; `Respond` aborts the context;
      `BindJSON` maps a validator failure to a JSON field name.

- [x] **6.2** `backend/apierr/binding_test.go` or the same file: syntax error, wrong type,
      validator failure, all producing 400 + `invalid_request` + a `details` key.

- [x] **6.3** `backend/books/handlers_test.go` — **update the existing case at line 96**:
      "details provider error returns 500" currently feeds `errors.New("book not found")` and
      expects 500. Under the new contract a not-found error must be 404. Split it into two cases:
      a fake returning an error wrapping `books.ErrNotFound` expects 404, and a fake returning an
      unrelated error expects 500. Add cases: upstream error → 502; `limit=0` → 400; `limit=101` →
      400; `page=0` → 400; `limit=1&page=1` → 200.

- [x] **6.4** `backend/auth/` — `handlers_test.go` is new. Using `httptest` plus a fake database
      seam, cover: missing body → 400; bad email → 400 with an `email` detail key; short password
      → 400; duplicate email → 409 `email_taken`; login unknown email → 401
      `invalid_credentials`; login wrong password → 401 with the **same** message; login success →
      200 with `access_token`.
      If `*sql.DB` blocks a clean fake, introduce the smallest interface seam that lets you test
      it and note the seam in your report. Do not add a mocking library to `go.mod`.
      _Seam taken, and it was unavoidable: `auth`, `bookmarks`, `reviews` and `shelves` each
      gained a narrow `store` interface wrapping the few queries the handler makes, with a
      `sqlStore` production implementation. The exported handler signatures are unchanged, so
      `main.go` is unaffected. There is no in-memory Postgres driver in `go.mod` and adding
      one was not permitted._

- [x] **6.5** `backend/auth/middleware_test.go` — **extend the existing file.** Assert status 401
      for: no header, non-`Bearer` scheme, `Bearer` with empty token, garbage token, expired
      token. Assert the `error.code` and `error.message` match contract §3 exactly.

- [x] **6.6** `backend/bookmarks/handlers_test.go` (new): `bookId` absent from the `book` table →
      404 `book_not_found`; a DB failure while looking the book up → **500, not 404** (this is the
      regression test for 4.7); `shelfId` owned by another user → 404 `shelf_not_found`; negative
      `currentPage` → 400; success → 200.

- [x] **6.7** `backend/reviews/handlers_test.go` (new): missing `bookId` → 400; `stars: 99` → 400
      with a `stars` detail key; `stars: 20` → 200; `stars: -1` → 400; unknown `bookId` → 404.

- [x] **6.8** `backend/shelves/handlers_test.go` (new): a bookmark referencing a shelf not in the
      user's list is skipped, the response is 200, and the other shelves still carry their
      bookmarks.

- [x] **6.9** `backend/library/openlibrary_test.go` — the four cases from task 3.7, appended.
      Existing tests untouched.

- [x] **6.10** Update `backend/main.go`: `router.Run` at line 62 returns an error that is
      currently discarded, so a port conflict exits with status 0 and no message. Log it and
      `os.Exit(1)`. Low priority relative to the rest; do it, but do not restructure `main`.

- [x] **6.11** Final gate: `cd backend && go build ./... && go vet ./... && go test ./...` all
      pass. `gofmt -l backend/` reports nothing. No new dependency in `go.mod` beyond `pq`, which
      is already required.
      _All pass. `go mod tidy` moved `validator`, `pq`, `uuid`, `jwt`, `godotenv` and
      `golang.org/x/crypto` from the indirect block to direct, since they are now imported
      directly. No new module entered the graph; it also dropped some indirect entries that
      `tidy` found to be unused (`modernc.org/sqlite`, `glebarez/go-sqlite`, `go-humanize`,
      `go-strftime`, `bigfft`, `modernc.org/libc` and friends)._

---

## Out of scope

Do not do these. If you think one is important, say so in your report instead.

- Transactional registration (task 4.4 records it as a TODO).
- Rate limiting, refresh tokens, password reset, email verification.
- Structured request IDs or logging middleware beyond what `apierr.Respond` logs.
- Changing `POST /books` or `POST /bookmarks` from 200 to 201.
- Any change to a success response body.
- Pagination or `limit`/`page` defaults beyond the ranges in 5.3.
- Any file under `frontend/`.