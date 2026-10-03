# TODO

Follow-ups from the `feature/refactor-book-consuming-pages` review. Work top to
bottom, one item at a time. Check items off as they land.

## Bugs

- [ ] **Memoize `getBookDetails` in `useBook` to stop an infinite refetch loop.**
  `frontend/src/hooks/book.ts` returns a new arrow function on every render, but
  both callers use it in a dependency array (`useFocusEffect` in
  `book/[id].tsx`, `useEffect` in `reviews/[bookId].tsx`). Each `setState`
  re-renders, which creates a new function, which re-runs the effect forever.
  Wrap it in `useCallback(..., [accessToken])`.

- [ ] **Seed `pageCount` from the fetched book in `book/[id].tsx`.**
  `pageCount` is initialized from `bookDetails?.book.pageCount || 0` while
  `bookDetails` is still `undefined`, so it stays `0`. The actions then use the
  wrong page count unless an existing bookmark provides one. Sync it once
  details load (the old `book.tsx` passed the count in via params).

- [ ] **Don't leave spinners stuck on fetch errors.**
  In `book/[id].tsx` and `reviews/[bookId].tsx`, `setLoading(false)` only runs
  on success. If `getBookDetails` / `getReviews` throws, the screen spins
  forever. Wrap the loads in `try` / `finally`. (See also the existing
  `feature/loading-error-handling` branch.)

## Correctness / robustness

- [ ] **Handle nullable `cover_uri` after the `*string` -> `string` change.**
  `domain.Book.CoverUri` is now `string`, but the `cover_uri` column is nullable
  (`VARCHAR(255)`, no `NOT NULL`). A single NULL row will make
  `row.Scan(&b.CoverUri)` error. Either keep `*string`, scan via
  `sql.NullString`, or make the column `NOT NULL`. Also note `QueryAllBooks`
  doesn't select `cover_uri` at all, so list results ship an empty string.

## Consistency cleanups (optional)

- [ ] **Align the reviews page with the new hook pattern.**
  `reviews/[bookId].tsx` still calls `getReviews` and `useAuth` directly while
  using `useBook` for details. Consider a `useReviews` hook, or fold both calls
  into the book hook.

- [ ] **Stop serializing whole books through route params.**
  `place-bookmark.tsx` and `review-book.tsx` still pass
  `JSON.stringify(book)`; `book-search-result-item` now routes by `id`. Move
  the remaining screens to id-based params + fetch.

## Tests

- [ ] **Add backend tests for the pure helpers.**
  `searchBooks` (query-string building) and `getCoverUri` are pure and easy
  wins. There are currently no tests on either side of the repo.
