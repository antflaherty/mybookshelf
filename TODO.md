# TODO

Follow-ups from the `feature/refactor-book-consuming-pages` review. Work top to
bottom, one item at a time, ideally in a fresh agent context. Check items off as
they land; **delete this file once everything is done.**

Context for the whole list: this branch renamed backend `library/library_api.go`
to `library/openlibrary.go`, embedded a full `domain.Book` inside
`books.BookDetails`, changed `domain.Book.CoverUri` from `*string` to `string`,
and replaced the frontend `book.tsx` screen (which received a serialized `book`
param) with `book/[id].tsx` (which fetches details by id). The items below are
loose ends from that change plus a few pre-existing issues it exposed.

---

## 1. ~~Memoize `getBookDetails` in `useBook` to stop an infinite refetch loop~~ ✅

**Where:** `frontend/src/hooks/book.ts`

**Problem:** `useBook()` returns a brand-new arrow function on every render:

```ts
export function useBook() {
  const { accessToken } = useAuth();
  return {
    getBookDetails: (id: string) => getBookDetails(accessToken, id),
  };
}
```

Both consumers put that function in a dependency array:
- `frontend/src/app/(authenticated)/book/[id].tsx` — `useFocusEffect(useCallback(..., [id, getBookDetails]))`
- `frontend/src/app/(authenticated)/reviews/[bookId].tsx` — `useEffect(..., [bookId, accessToken, getBookDetails])`

Because the identity changes every render, each `setState` re-renders → new
function → effect re-runs → fetch → `setState` → … The book details screen
refetches forever.

**Suggested fix:** Wrap the function in `useCallback` keyed on `accessToken`
(and consider dropping the now-redundant `accessToken` dep at the call sites):

```ts
const getBookDetails = useCallback(
  (id: string) => getBookDetails(accessToken, id),
  [accessToken],
);
return { getBookDetails };
```

**Done when:** Opening a book details page / reviews page fetches once per id
(verify in the network log or by adding a temporary `console.log`), and
`npx tsc --noEmit` passes in `frontend/`.

---

## 2. ~~Seed `pageCount` from the fetched book in `book/[id].tsx`~~ ✅

**Where:** `frontend/src/app/(authenticated)/book/[id].tsx` (state init around
line 40; `handleAddToShelf` / `handleStartReading` below it)

**Problem:** `pageCount` is initialized as:

```ts
const [pageCount, setPageCount] = useState(
  bookmark?.book.pageCount || bookDetails?.book.pageCount || 0,
);
```

`bookDetails` is `undefined` at first render, so without an existing bookmark
this locks in `0`. The parent's `pageCount` feeds `addNewBookToShelf` and
`startReading`, so the wrong value gets saved. `BookHeader` tracks its own copy
of the count via `onPageCountChange`, so the header can look correct while the
value used for the action is wrong. The old `book.tsx` avoided this because the
book (and its `pageCount`) arrived through route params.

**Suggested fix:** Once details load, seed the count if it's not already known,
e.g. inside `loadBookDetails`:

```ts
const details = await getBookDetails(id);
setBookDetails(details);
setPageCount((current) => current || details.book.pageCount);
```

**Done when:** Adding a book with no existing bookmark preserves the fetched
page count through to the request. `tsc --noEmit` passes.

---

## 3. Don't leave spinners stuck when a fetch throws

**Where:** `frontend/src/app/(authenticated)/book/[id].tsx` (`loadBookDetails`)
and `frontend/src/app/(authenticated)/reviews/[bookId].tsx` (`load`)

**Problem:** Both loaders only call `setIsLoading(false)` on the success path.
If `getBookDetails` / `getReviews` rejects, the screen shows an activity
indicator forever with no error state.

**Suggested fix:** Wrap the body in `try { ... } finally { setIsLoading(false) }`
and add an error state (or at least log + fall through). Note there is already a
`feature/loading-error-handling` branch — check whether this is intentionally
being handled there before duplicating work.

**Done when:** Forcing the API to fail (bad token / stop the backend) leaves the
screen in a non-loading state instead of spinning. `tsc --noEmit` passes.

---

## 4. ~~Handle nullable `cover_uri` after the `*string` → `string` change~~ ✅

**Where:** `backend/domain/models.go` (`CoverUri string`),
`backend/books/repository.go` (`QueryBookById`, `insertBook`),
`backend/bookmarks/repository.go` (`QueryAllBookmarks`)

**Problem:** `domain.Book.CoverUri` is now `string`, but the `Books.cover_uri`
column is nullable (`VARCHAR(255)`, no `NOT NULL` — see `local.db` schema). A
single row with `NULL` cover_uri makes `row.Scan(&b.CoverUri)` fail at runtime.
The current `local.db` happens to have zero NULLs, so this builds and runs today
but is a latent break. Separately, `QueryAllBooks` selects only
`Id, Title, Author, PageCount`, so books returned from it carry an empty-string
cover even when one exists.

**Suggested fix — pick one:**
- revert `CoverUri` to `*string` (frontend already treats it as optional:
  `coverUri?: string`), **or**
- scan through `sql.NullString` and convert, **or**
- add a `NOT NULL` constraint and default `''`.

Also decide whether `QueryAllBooks` should select `cover_uri`.

**Done when:** Inserting/reading a book with no cover does not error, and a
smoke test of `GET /books` / `GET /bookmarks` returns sensible cover values.
`go build ./...` passes in `backend/`.

---

## 5. Align the reviews page with the new hook pattern

**Where:** `frontend/src/app/(authenticated)/reviews/[bookId].tsx`

**Problem:** The page uses the new `useBook` hook for book details but still
calls `getReviews` and `useAuth` directly. Inconsistent, and the mixing
contributes to the dependency-array churn in item 1.

**Suggested fix:** Add a `useReviews(bookId)` hook (mirroring `useBook`) or fold
both fetches into a single hook, then consume only hooks for data access.

**Done when:** The screen no longer imports `getReviews`/`useAuth` directly and
still loads reviews + header. `tsc --noEmit` passes.

---

## 6. ~~Stop serializing whole books through route params~~ ✅

**Where:** `frontend/src/app/(authenticated)/(tabs)/place-bookmark.tsx`
(passes `params: { book: JSON.stringify(book) }` to `/review-book`, around
lines 89 and 118), `frontend/src/app/(authenticated)/review-book.tsx` (parses
the `book` param), `frontend/src/app/(authenticated)/book/[id].tsx`
(`/place-bookmark` currently passes the whole `bookmark`).

**Problem:** `book-search-result-item.tsx` was updated to route by `id`, but
these screens still pass `JSON.stringify(book)`. This is fragile and
inconsistent. There is also a pre-existing bug: in `place-bookmark.tsx` the
`book` passed to `/review-book` is derived from the incoming `bookmark` param
(`const book = bookmark?.book`), which is `undefined` when the screen is opened
directly from the tab — so `/review-book` renders nothing.

**Suggested fix:** Route by id (e.g. `/review-book?bookId=…`) and have
`review-book.tsx` fetch the book via `useBook` (same pattern as
`book/[id].tsx`).

**Done when:** No screen sends a serialized `Book` through navigation params,
and `/review-book` works both when reached from `/place-bookmark` and directly.
`tsc --noEmit` passes.
