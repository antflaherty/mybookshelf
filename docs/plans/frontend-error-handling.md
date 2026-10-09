# Frontend Error Handling Plan

**Agent: frontend. You own `frontend/` only. Do not read, write, or edit anything under `backend/`.**

Read `docs/api-error-contract.md` first and treat it as read-only. It is the source of truth for
every status code and error body shape. The backend agent is implementing it in parallel, so:

- **Code against the contract, not against a running backend.** Do not start the Go server, do not
  point `EXPO_PUBLIC_API_URL` at anything, and do not add tests that need a live server.
- **Do not wait for the backend.** Everything below is verifiable against Jest mocks.
- If the backend agent later deviates, the fix is in your `ApiError` parsing, not in your screens.
  Design it to be tolerant of a missing or unexpected body.

Frontend is Expo SDK 57 / React Native 0.86 / React 19.2 / Expo Router 57. CI runs
`npm run lint`, `npx tsc --noEmit`, and `npm test` from `frontend/`.

**Before writing any code, read the versioned docs at https://docs.expo.dev/versions/v57.0.0/**
(per `frontend/AGENTS.md`). Especially relevant: `expo-router` error handling, `Stack.Protected`,
and any API you introduce for error surfaces.

## Current problems, for context

- `apiClient.ts` parses the body *before* checking `response.ok` (lines 35, 53). A 502 HTML error
  page from a spun-down Render instance makes `response.json()` throw `SyntaxError`, so the user
  sees a parse error instead of "service unavailable".
- Three different throw formats coexist: `` `status: ${s}, error: ${e}` ``,
  `` `Response status: ${s}` ``, `` `HTTP error! Status: ${s}` ``. Two of them discard the server's
  `error` field, which is the message worth showing.
- Five `console.error(await response.text())` leftovers.
- No handling of `fetch` rejections, so an offline device surfaces a raw
  `TypeError: Network request failed`.
- **Almost no screen has a `try`/`catch`.** A failure inside an async press handler is an
  unhandled rejection: `login.tsx:16` shows the user nothing at all and never navigates. Worse,
  every screen sets `isLoading` *after* the awaited call, so a throw leaves a spinner spinning
  forever.
- `shelf-provider.tsx:54-58` non-null-asserts `shelves.find(...)`. If shelves fail to load or a
  name is missing, consumers get `undefined` and crash later on `currentlyReading.id`
  (`hooks/book-actions.ts:37`, `place-bookmark.tsx:92`).
- `reviews/[bookId].tsx` has no error state, so a failed load renders a blank screen.

---

## Phase 0 — Preflight

- [x] **0.1** `cd frontend && npm run lint && npx tsc --noEmit && npm test` before changing
      anything. Record the baseline. If a test already fails, say so in your report and leave it
      failing.
      _Baseline 2026-10-09: lint clean, tsc clean, 22 suites / 82 tests all passing. No pre-existing
      failures._
- [x] **0.2** Read `src/api/apiClient.ts`, `src/auth/auth-context.tsx`,
      `src/context/shelf-provider.tsx`, and every screen you touch, end to end.
- [x] **0.3** Note that `frontend/AGENTS.md` mandates reading the Expo v57 docs. Do it.
      _Read `/versions/v57.0.0/`, `sdk/router`, `sdk/router/stack` (no route-level `ErrorBoundary`
      export in use; the inline `<ErrorMessage>` idiom stands), and `sdk/securestore` (v57
      `SecureStore.setItem` is synchronous and returns `void`; `setItemAsync` returns a promise) —
      which changed 4.3's implementation, see that item._

---

## Phase 1 — `ApiError`

New file `src/api/api-error.ts`. This replaces every ad-hoc `new Error(...)` in `apiClient.ts`.

- [x] **1.1** Define:

  ```ts
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

  export class ApiError extends Error {
    readonly status: number;        // 0 when the request never completed
    readonly code: ApiErrorCode;
    readonly details?: Record<string, string>;
    readonly isNetworkError: boolean;
  }
  ```

  Extend `Error` and call `super(message)` so `instanceof Error` still holds — several call sites
  and tests rely on that. Set `this.name = "ApiError"`.

- [x] **1.2** Two named constructors, and nothing else:

  ```ts
  ApiError.fromResponse(status: number, body: unknown): ApiError
  ApiError.network(cause: unknown): ApiError   // status 0, code "network_error"
  ```

  `fromResponse` must tolerate a body that is `null`, a string, an HTML string, or an object
  missing every field. Its rules, in order:
  1. If the body is an object with a string `error.code`, use that code if it is a known
     `ApiErrorCode`, else `"unexpected_response"`.
  2. `message` = the body's `error.message` if it is a non-empty string, else a status-derived
     fallback.
  3. `details` = the body's `error.details` if it is a plain object of strings.
  4. Fallback messages by status: 400 `"invalid request"`, 401 `"please sign in again"`,
     403 `"not allowed"`, 404 `"not found"`, 409 `"conflict"`, 5xx `"something went wrong.
     please try again."`.

  `network(cause)` sets `message` to `"could not reach the server. check your connection."`,
  `isNetworkError = true`, and keeps `cause` on the property.

  _Done. The two rules above are implemented in order. The private `readCode` helper takes only
  the error envelope, because rule 1 does not need the status. The public surface is exactly the
  two named constructors._

- [x] **1.3** Never surface a raw server `message` for 5xx. For `status >= 500`, force the
      fallback message even when the body carries one. The contract fixes those messages, but
      this keeps a proxy or load balancer from putting HTML in a user's face. Log the real body to
      `console.error` in that case only.

- [x] **1.4** Unit tests in `src/api/__tests__/api-error.test.ts`: well-formed body; null body;
      HTML string body; missing `message`; unknown `code`; non-object `details`; 500 with a
      malicious message (assert the fallback wins); `network()` shape; `instanceof Error`.
      _31 tests, all passing._

---

## Phase 2 — Rewrite `apiClient`

`src/api/apiClient.ts`, 251 lines today. Keep the exported function names and signatures exactly
as they are — other modules import them. Only the internals change.

- [x] **2.1** One private `request<T>()` that every endpoint funnels through:

  ```ts
  async function request<T>(
    path: string,
    method: "GET" | "POST",
    options: { accessToken?: string | null; body?: unknown; query?: Record<string, string | number> }
  ): Promise<T>
  ```

  It builds the URL from `API_URL` + `path` + `query`, sets
      `Content-Type: application/json` and, when authorized, `Authorization: Bearer <token>`, and
  then, in order:
  1. `try` the `fetch`. On rejection throw `ApiError.network(cause)`.
  2. On 401, `await unauthorizedHandler?.()` — keep this exactly as it works today. It is tested
     in `apiClient.test.ts` and there are tests for the handler's promise settling before the
     caller sees the error. Do not change its semantics.
  3. Read the body defensively:
     ```ts
     let raw = "";
     try { raw = await response.text(); } catch { /* body unreadable; fall through */ }
     let body: unknown = null;
     if (raw) { try { body = JSON.parse(raw); } catch { body = null; } }
     ```
     Never call `response.json()` directly. A body can only be read once, and `text()` plus a
     guarded `JSON.parse` is what makes the HTML-502 case work.
  4. If `!response.ok`, throw `ApiError.fromResponse(response.status, body)`.
  5. Otherwise return `body as T`. On a 200 with an empty body, return `null` — callers that want
     `[]` already do `result ?? []`.

- [x] **2.2** `authorizedFetch` is replaced by `request`. Its "no token" behaviour becomes part of
      `request`: when an endpoint requires auth and `accessToken == null`, throw an `ApiError` with
      code `"unauthorized"` and a message like `"not logged in"`. Keep the message containing
      `"not logged in"` — `apiClient.test.ts:106` asserts on it.
      _Distinguished by presence, not by value: `accessToken: null` means "protected but signed
      out" and throws before any fetch; omitting the key entirely means a public endpoint. That is
      what lets `register`/`login` share one helper without sending `Authorization: Bearer null`._

- [x] **2.3** Delete all five `console.error(await response.text())` calls (lines 67, 106, 128,
      148, 202) and the `console.log(await response.json())` in `postReview` (line 205). Response
      parsing now happens once, inside `request`.

- [x] **2.4** `register` and `login` become thin wrappers over `request` with no `accessToken`.
      Note the behaviour change: `login` today throws `status: 401, error: invalid email or
      password`, and per the contract the message is just `invalid email or password`. That is an
      improvement; do not preserve the old format.
      _`login` additionally rejects a 200 whose body carries no `access_token`, since storing
      `undefined` would leave the user silently logged out on next launch. That case is not in
      the contract (which does not cover success bodies), so it maps to `unexpected_response`._

- [x] **2.5** Preserve the `?? []` behaviour for `getShelves`, `getBookmarks`, and `searchBooks`
      (today lines 72, 86, 111). `getReviews` and `getBookDetails` return raw and let callers
      cope; `reviews/[bookId].tsx` already does `reviews || []`.
      _`reviews/[bookId].tsx` also has to cope with the literal `null` an empty body now yields;
      handled in 6.4._

- [x] **2.6** Keep `setUnauthorizedHandler` and the module-level `unauthorizedHandler` variable.
      `auth-context.tsx` depends on both, and `apiClient.test.ts:192-296` exercises them with
      `jest.resetModules()` to get a fresh module. Do not refactor this to a React context.

- [x] **2.7** `getReviews`' `Review` type: the backend sends `userID` (capital D) in
      `domain.Review` (`backend/domain/models.go:34`) but `lib/definitions.ts` declares `userId`.
      **Do not fix this** — the backend agent owns it and the contract does not cover success
      bodies. Leave a `// TODO:` comment. Out of scope.
      _Also renamed two parameters (`placeBookmark`'s and `postReview`'s second argument from
      `request` to `bookmark`/`review`) because they shadowed the new private `request` helper and
      failed `tsc`. Exported signatures and parameter names-as-called are unchanged; these were
      positional._

- [x] **2.8** Update `src/api/__tests__/apiClient.test.ts`. The existing suite is good; keep its
      structure. Changes:
      - Lines 78-86, 110-114, 167-173, 205-274, 287-295 assert the old message strings. Update
        them to the new messages. For the 401 cases, `ApiError.fromResponse(401, {error: {code:
        "unauthorized", message: "invalid or expired token"}})` means the message is now the
        server's.
      - The `jsonResponse` helper must implement `text()` and *not* `json()`, matching the new
        `request`. Keep `mockFetch` and the `beforeEach`/`afterEach` reset pattern.
      - Add cases: a 502 whose body is `"<html>502 Bad Gateway</html>"` throws a network-free
        `ApiError` with a sane message and not a `SyntaxError`; an empty 200 body returns `null`;
        a body that is `null` on a 500 does not throw while parsing; `fetch` rejecting throws
        `ApiError.network` with `isNetworkError === true`; a 200 whose body is invalid JSON
        resolves without throwing.
      _Done: 65 tests across `src/api`, all passing. One note — the `unauthorized handling` block
      calls `jest.resetModules()`, so the `ApiError` class it throws is a *different* class
      identity from the statically imported one. That test asserts on the message, not on
      `toBeInstanceOf(ApiError)`._

---

## Phase 3 — `useAsyncAction` and `ErrorMessage`

Two small shared pieces, so screens do not each invent their own.

- [x] **3.1** `src/hooks/use-async-action.ts`:

  ```ts
  export function useAsyncAction<Args extends unknown[], T>(
    action: (...args: Args) => Promise<T>
  ): {
    run: (...args: Args) => Promise<{ ok: true; value: T } | { ok: false; error: ApiError }>;
    isLoading: boolean;
    error: string | null;
    reset: () => void;
  }
  ```

  - Wraps the call in `try`/`catch`/`finally`. `isLoading` is cleared in `finally` **only**, so it
    can never get stuck. This is the single most important property of this hook.
  - Never throws. It returns a result object instead. That keeps every screen's error path
    reachable without a `try`/`catch` in the component.
  - `error` is `ApiError.message` for an `ApiError`, `"something went wrong. please try again."`
    for anything else. Never a raw stack or an un-parseable body.
  - `run` clears `error` on entry.
  - `reset()` clears the error, for a retry button.
  - Guard against a stale `run` landing after unmount. Do not setState after unmount.
    _`action` is read through a ref so `run` stays referentially stable across renders — screens
    pass an inline arrow, and a changing `run` identity would defeat `useCallback` deps in the
    screens that build handlers from it._

- [x] **3.2** `src/components/error-message.tsx`:

  ```tsx
  export default function ErrorMessage({ message, onRetry }: { message: string; onRetry?: () => void })
  ```

  Renders `<Text style={{ color: theme.errorText }}>{message}</Text>` via `useTheme()`. When
  `onRetry` is given, render a `ThemedPressable` labelled `"try again"` that calls it. Use the
  existing `theme.errorText` (already used in `register.tsx:93`) and reuse
  `@/components/themed-pressable` — do not introduce a new visual idiom.

- [x] **3.3** Tests for both: `use-async-action.test.ts` (resolves to `ok: true`; a rejected
      action sets `error` and clears `isLoading`; a non-`ApiError` rejection gets the fallback
      message; `run` clears a previous error) and
      `error-message.test.tsx` (renders the message in the error colour; renders the retry button
      only when `onRetry` is passed; pressing it calls it).
      _7 + 5 tests, all passing. The hook suite also covers `reset` and a run landing after
      unmount. Note the file is `.tsx`, not `.ts` as written above — the probes render `Text`._

---

## Phase 4 — Auth context

`src/auth/auth-context.tsx` is the highest-value target. `login.tsx` currently has no
`try`/`catch`, so a failed login is invisible.

- [x] **4.1** Extend `AuthContextValue`:

  ```ts
  login: (user: User) => Promise<{ ok: boolean; error?: string }>;
  ```

  Returning a result instead of throwing. `login` is called only by `src/app/login.tsx` (and
  mocked in its test), so this is a contained change.
  _Exported as `LoginResult` so the screen can name the type; `AuthContextValue` itself stays
  unexported, as before._

- [x] **4.2** In `login`, wrap `apiLogin` in `try`/`catch`. On failure return
      `{ ok: false, error: message }` where `message` is the `ApiError` message, falling back to
      a generic one. Do not set `accessToken` and do not `storeAccessToken` on failure.

- [x] **4.3** `storeAccessToken` at line 48 is not awaited. If secure storage throws, `login`
      resolves successfully with a token that was never persisted, and the user is logged out on
      next launch. `await` it and treat a throw as a login failure.
      _Awaiting alone would not have been enough: per the v57 SecureStore docs
      `SecureStore.setItem` is synchronous and returns `void`, so there was nothing to await and a
      failure would have surfaced as an unhandled rejection rather than a catchable one.
      `storeAccessToken` now uses `setItemAsync` and returns a promise; `secureStore.test.ts`
      updated to match._

- [x] **4.4** `restoreToken` at line 31 already has a `try`/`catch` that only logs. Keep the
      behaviour, but log the actual error object too (currently it logs the string
      `"Failed to restore authentication"` and drops `error`).
      _No change needed: the existing call is already
      `console.error("Failed to restore authentication", error)`, so the error object was never
      dropped. Verified at `auth-context.tsx` rather than assumed — this item's premise was
      incorrect._

- [x] **4.5** Update `src/auth/__tests__/auth-context.test.tsx`: `login` resolves `{ok: true}` on
      success and `{ok: false, error: ...}` on rejection; the token is not stored on failure;
      `storeAccessToken` throwing surfaces as a failed login.
      _Added 4 tests (9 in the file). The probe now renders the result so `{ok: false}` is
      observable rather than only inferred from the token staying `none`._

---

## Phase 5 — Shelf context

`src/context/shelf-provider.tsx` is the app's main data source and is currently the least safe
thing in the app.

- [x] **5.1** Add `error: string | null` and keep `isLoading`. Collapse the duplicated load logic
      at lines 33-48 into one `loadShelves` used by both the effect and callers; the `useEffect`
      body currently bypasses `setIsLoading(true)` and duplicates the sort.
      _Restructured slightly from the plan's wording, for a lint reason: `expo lint`'s
      `react-hooks/set-state-in-effect` rule statically rejects calling a `setState`-containing
      function from an effect body, even when every `setState` is after an `await`. So the shared
      piece is a module-level pure `fetchShelves(accessToken)` that returns
      `{ shelves, error }` and never touches state; the effect's inline async body and the public
      `loadShelves` both apply that result. One fetch, one sort, no duplication. The sort copies
      before sorting — `[...loaded].sort()` — because `Array.sort` mutates and the array may be
      shared with a caller._

- [x] **5.2** Wrap `getShelves` in `try`/`catch`. On failure set `error` and, importantly, leave
      `shelves` as `[]`. Clear `isLoading` in a `finally` so a failure cannot leave the tabs
      screen spinning forever.

- [x] **5.3** **Remove the `!` non-null assertions at lines 54-58.** Change the type of
      `toBeRead`, `currentlyReading`, and `finished` to `Shelf | undefined`. Consumers must handle
      `undefined`:
      - `src/app/(authenticated)/(tabs)/index.tsx` — maps `shelves`, no change needed.
      - `src/hooks/book-actions.ts:37` — `currentlyReading.id`; bail out early if undefined.
      - `src/app/(authenticated)/(tabs)/place-bookmark.tsx:92,105` — `currentlyReading.id`,
        `finished.id`; guard both handlers.
      - `src/app/(authenticated)/book/[id].tsx:110,112` — `toBeRead.id`, `finished.id`; treat
        undefined as "hide the action".
      The existing `shelf-provider.test.tsx` already renders `{toBeRead?.name}`, so it will keep
      passing. Add a case where the shelves load but the named ones are absent, asserting no
      crash.
      _All four consumers updated. `startReading` bails out before `createBook` when
      `currentlyReading` is undefined, so it does not create a book it has nowhere to put; it
      throws an `ApiError` the caller surfaces. In `[id].tsx`, `showPlaceBookmark` now requires
      both named shelves, and `showStartReading` uses `toBeRead?.id`._

- [x] **5.4** While in `index.tsx`: `isLoading` is currently the only branch (line 13), so a
      failed load renders an empty screen with no explanation. Render `ErrorMessage` with
      `reset={loadShelves}` when `error` is set.
      _Rendered as `onRetry={() => void loadShelves()}`, which clears the error and refetches.
      Shelves only render when `error` is null, so a stale list cannot sit under an error._

- [x] **5.5** Add tests: `getShelves` rejecting sets `error` and clears `isLoading`;
      `loadShelves` called manually clears a previous error; shelves missing a named shelf does
      not throw.
      _6 tests added, 8 in the file. Also covers the empty-list case and asserts the provider does
      not mutate the array it was handed._

---

## Phase 6 — Screens

Do these in the order listed; they are ordered by user impact. Each must have a test.

- [x] **6.1** `src/app/login.tsx` — **worst case in the app today.** No `try`/`catch`, no
      `isLoading`, no error UI, and `router.push("/")` at line 17 never runs on failure so the
      user sees nothing at all. Use `useAsyncAction`. Render the error with `ErrorMessage`; only
      `router.push("/")` when `ok`. Add `isLoading` so the button can be disabled while
      submitting. No field validation needed here — `register.tsx` has the zod pattern if you
      want it, but that is scope creep. Keep it out.
      _One adaptation: `login` returns `{ok, error}` rather than throwing (4.1), so
      `useAsyncAction` would have seen a success. The action re-throws an `ApiError` on the
      `!ok` branch so the hook's error and loading behaviour still apply, and the handler's own
      `result.ok` check gates the navigation._

- [x] **6.2** `src/app/(authenticated)/(tabs)/search-books.tsx` — `handleSearchPress` (line 27) and
      `handleResultListEndReached` (line 44) both await `searchBooks` unguarded, so a failure
      leaves `isLoading` true forever and the spinner never goes away. Add error state and clear
      both loading flags in a `finally`. On error, show `ErrorMessage`; on a *pagination* failure
      keep the existing results rather than clearing them — a user with 20 books on screen should
      not lose them because page 2 timed out.
      _Left as explicit `try`/`catch`/`finally` rather than `useAsyncAction`, because there are
      two independent calls that each manage their own flag and whose failure handling differs
      (initial search clears results, pagination does not)._

- [x] **6.3** `src/app/(authenticated)/book/[id].tsx` — `loadBookDetails` (line 49) is unguarded,
      so a failed load means `isLoading` stays true forever and the screen is a permanent spinner.
      Add error state. Note that the render at line 124 returns
      `bookDetails && (...)`, which renders nothing when details failed — that is a blank screen
      and is exactly what the new error state must replace. Also guard `handleAddToShelf` (line
      72): it calls `addNewBookToShelf(...)` **without awaiting** (line 77) and then navigates
      immediately, so a failed save navigates away as if it worked. Await it and only navigate
      on success. `handleStartReading` (line 93) already awaits but still navigates on failure.
      _The `bookDetails &&` guard became an explicit `!bookDetails ? <ErrorMessage/> : ...` branch,
      which also let the inner `bookDetails?.` optional chains go away. Both actions take the book
      as an argument rather than closing over state, so no non-null assertion was needed._

- [x] **6.4** `src/app/(authenticated)/reviews/[bookId].tsx` — the `load` effect (line 22) awaits
      two requests unguarded, so a failure leaves `isLoading` true forever. Add error state. Two
      extra things worth noting: the sequential `await getReviews` then `await getBookDetails`
      (lines 25-26) means the slowest possible total latency, and it should use `Promise.all` so
      a `getBookDetails` failure still leaves the reviews visible. Also `setLoading(false)` is
      never called if `bookId` is falsy (line 23), another permanent spinner. The existing
      `key={review.userId}` at line 54 is fine.
      _Used `Promise.allSettled` rather than `Promise.all`. Plain `Promise.all` rejects on the
      first failure, which is precisely the "one failure discards the other result" behaviour the
      item asks to avoid; `allSettled` keeps whichever half succeeded and reports the first
      rejection as the error._

- [x] **6.5** `src/app/(authenticated)/review/[bookId].tsx` — `handleSubmit` (line 42) awaits
      `postReview` unguarded and navigates home on failure. Wrap it; only navigate on success;
      show the error. The `load` effect (line 28) needs the same treatment as 6.4.

- [x] **6.6** `src/app/(authenticated)/(tabs)/place-bookmark.tsx` — two problems. First,
      `handlePlaceBookmarkPress`'s `catch` (line 118) only handles `z.ZodError`; an `ApiError` from
      `placeBookmark` is swallowed and the user sees nothing, and `isLoading` is never involved.
      Add a general `Error` branch that shows the message. Second, `handleBookCompletedPress`
      (line 53) has **no** `try`/`catch` and throws a bare `Error("book not found on shelf")` at
      line 65 straight into the void. Replace that throw with the existing `setTitleError`
      pattern the function already uses two lines earlier — it is not an exceptional condition,
      it is a validation failure. Do the same for the unguarded `placeBookmark` await at line 74.
      _Deviation: the new branch is `error instanceof ApiError`, with everything else falling back
      to the generic message, rather than the plan's `instanceof Error`. A test caught this: a
      rejected `TypeError("Network request failed")` was rendering its raw `.message` to the user,
      which is the same leak `useAsyncAction` and `ApiError` exist to prevent._

- [x] **6.7** `src/app/(authenticated)/select-shelf.tsx` — `createShelfPressHandler` (line 19)
      awaits `placeBookmark` and `loadShelves` unguarded, then navigates home (line 30) even when
      both failed. Wrap it; only navigate on success. Because the handler is created per shelf in
      a loop, make sure error state is shared rather than per-button.
      _One `useAsyncAction` takes the shelf id as an argument, so all the per-shelf buttons share
      a single error. A failed `loadShelves` after a successful save also blocks navigation,
      since the screen would otherwise show a shelf list that does not contain the new bookmark._

- [x] **6.8** `src/hooks/book-actions.ts` — `addNewBookToShelf` (line 10) and `startReading`
      (line 24) are multi-step: `createBook` then `placeBookmark` then `loadShelves`. A failure in
      the middle leaves the book created but the bookmark missing, and the throw is handled
      nowhere useful. These already return promises the screens await, so with 6.3 awaiting them
      the screens can show the error. Add a comment noting the partial-write behaviour is not
      transactional and is a known backend concern. Do not attempt a rollback.
      _Comment added above `addNewBookToShelf`. Also added the 5.3 guard: `startReading` throws
      before `createBook` when `currentlyReading` is undefined, so it cannot create a book it has
      nowhere to put._

- [x] **6.9** Audit for anything missed. Grep the app for `await ` inside `onPress` handlers and
      for `useEffect` bodies containing an `await`. Every one needs error handling. Also check
      `src/components/book-actions.tsx` — it forwards handlers straight to `ThemedPressable`
      (lines 18-38), so all error surfacing must happen in the screens, which 6.3 covers.
      _Audited every `await` under `src/app` and `src/hooks`. All are now inside either
      `useAsyncAction` or a `try`/`catch`; the remaining `onPress` handlers are synchronous
      `router.push` only. `book-actions.tsx` needed no change — it just forwards. The only
      pre-existing screen left alone is `register.tsx`, which already had a complete
      `try`/`catch`/`finally` and inline `theme.errorText` error UI._

- [x] **6.10** Per-screen tests, matching the existing style in `src/app/__tests__/` (mock
      `@/api/apiClient`, mock `expo-router`, wrap in `ThemeProvider`):
      - `login.test.tsx`: a rejected `login` shows the server's message and does not navigate; a
        successful one navigates.
      - `search-books.test.tsx`: a rejected search shows an error and hides the spinner;
        `hasMore` stays usable after a failed page load so the user can retry.
      - `book.test.tsx`: a rejected `getBookDetails` shows an error instead of a permanent
        spinner; a failed `addNewBookToShelf` does not navigate.
      - `reviews/[bookId]`: a rejected `getReviews` shows an error.
      - `review.test.tsx`: a rejected `postReview` shows an error and does not navigate.
      - `place-bookmark.test.tsx`: an `ApiError` from `placeBookmark` shows its message;
        "book completed" with an unmatched selection shows the field error instead of crashing.
      - `select-shelf.test.tsx`: a rejected `placeBookmark` does not navigate.
      - `settings.test.tsx` needs no change — `logout` is wired directly and has no error path
        worth surfacing. Say so in your report rather than inventing one.
      _All written. `reviews/[bookId]` had no test file at all, so a new `reviews.test.tsx` was
      added (7 tests). Suite totals went 82 -> 191 tests._

---

## Phase 7 — Gate

- [x] **7.1** `cd frontend && npm run lint && npx tsc --noEmit && npm test` all pass.
      _All three clean: lint 0 errors / 0 warnings, tsc clean, 26 suites / 191 tests passing
      (baseline was 22 / 82)._

- [x] **7.2** `grep -rn "console.error\|console.log" src/` shows only intentional logging: the
      5xx body log in `api-error.ts` (1.3) and the token-restore log in `auth-context.tsx` (4.4).
      _Exactly the two expected, plus one pre-existing unrelated line in
      `src/components/book-cover.tsx:23` (an `Image.getSize` failure callback that already
      handles the error via `setHasError`; not a network path and out of scope). The five
      `console.error(await response.text())` leftovers and the `console.log(await
      response.json())` are gone (2.3)._

- [x] **7.3** `grep -rn "HTTP error!\|Response status:\|status: \${" src/` returns nothing. All
      three legacy message formats are gone.
      _Verified empty._

- [x] **7.4** Confirm no unhandled rejection remains: every `await` in a press handler and in an
      effect is either inside `useAsyncAction` or wrapped in a `try`/`catch`.
      _Audited every `await` under `src/app` and `src/hooks`; each one verified to sit inside a
      `useAsyncAction` action closure or a `try` block._

- [x] **7.5** Confirm `apiClient.test.ts`'s `unauthorized handling` block still passes unchanged
      in spirit. The 401 → `logout` behaviour is load-bearing and must not regress.
      _All 8 tests pass. Only the asserted message strings changed, from `Response status: 401`
      to the server's `invalid or expired token`, because `fromResponse` now surfaces the
      contract's message. The block still uses `jest.resetModules()`, and the
      "waits for the handler to settle before returning" and "propagates a handler rejection"
      cases are byte-for-byte the same logic as before._

---

## Out of scope

Do not do these. If you think one is important, say so in your report instead.

- Offline support, caching, retry with backoff, or request queuing. Surface the error and move on.
- Toasts or a global error snackbar. `<ErrorMessage>` inline is the established idiom in this
  codebase (`register.tsx` already does it).
- Optimistic updates or rollback on failure.
- New dependencies. No toast library, no query library, no axios. `fetch` is fine.
- Changing `src/lib/definitions.ts` types to match the backend's JSON field names (see 2.7).
- Touching `src/api/apiClient.ts`'s exported names or signatures beyond `login` (4.1).
- Any file under `backend/`.