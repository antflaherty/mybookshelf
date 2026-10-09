# Agent Prompts

Two prompts, one per agent. They run **simultaneously**. Each prompt is self-contained: paste it
into a fresh agent session pointed at this repo.

Both agents read `docs/api-error-contract.md` and must not modify it.

| | Backend agent | Frontend agent |
| --- | --- | --- |
| Plan | `docs/plans/backend-error-handling.md` | `docs/plans/frontend-error-handling.md` |
| Owns | `backend/` | `frontend/` |
| Touches the other side | never | never |
| New dependency risk | `pq` (already required) | none permitted |

## Working rules for both

Both agents work in the same checkout on the currently checked out branch. There is no branch
setup and nothing to merge afterwards. This works because the plans touch disjoint directories.

What that requires from you:

- **Scope every commit to your own directory.** `git add backend/ && git commit -m "..."` or
  `git add frontend/ && git commit -m "..."`. Never `git commit -a`, never `git add -A`, never
  `git add .` — those stage the other agent's uncommitted work into your commit.
- Commit per phase, not per file. A phase that leaves the build broken is not a commit boundary.
- **Never** `git checkout`, `git restore`, `git reset`, `git stash`, `git clean`, or `git rebase`.
  Those are repo-wide and will destroy the other agent's in-flight work. There is no undo for it.
- `git status` will show a mix of both agents' files. That is expected. Ignore what is not yours.
- Run your full CI gate before reporting done, and paste the actual output.
- If a plan task turns out to be wrong, do the closest correct thing and say so prominently in
  your report. Do not silently reinterpret it.
- If you find a bug on the other side of the repo, **do not fix it.** Note it in your report.

---

## Backend agent prompt

```text
You are the backend agent on the mybookshelf repo. Work only in `backend/`.

You own Go, Gin, and database/sql code. You do not touch `frontend/` — another agent is working
there in parallel right now, and editing it will destroy their work.

## Setup

1. Read `docs/api-error-contract.md` in full. It is frozen and authoritative: every status code,
   error code string, and user-facing message you produce must match it. You may not edit it.
2. Read `docs/plans/backend-error-handling.md` in full. Work through it phase by phase. It has
   checkbox tasks; tick them as you go so the diff shows progress.
3. You are already on the right branch (`feature/error-handling`), alongside a frontend agent
   working in the same checkout. Stay on it. Do not create or switch branches.
4. Run `cd backend && go build ./... && go vet ./... && go test ./...` before changing anything.
   Record the baseline result. If something already fails, report it and leave it failing.

## What you are doing

The API returns inconsistent statuses, leaks internal error strings to clients, and cannot
distinguish "not found" from "something broke". Your job:

- Introduce `backend/apierr`: one error envelope, typed constructors per the contract, and a
  `Respond` helper every handler funnels through.
- Make the Open Library client check HTTP statuses, use a timeout, and return distinguishable
  not-found and upstream errors, so a missing book becomes a 404 instead of a 500.
- Replace every raw `err.Error()` in a response with either a safe client message or a log-only
  internal error. Also delete the stray `fmt.Println` in `books/handlers.go`.
- Add request validation so bad input is a 400, not a constraint-violation 500.
- Return 409 for a duplicate registration email instead of 500.
- Fix an authorization bug: `POST /bookmarks` accepts any `shelfId`, including another user's.
  This one changes behaviour and is flagged as such in the plan.
- Add table-driven tests in the existing style. Several existing tests assert old behaviour and
  the plan tells you exactly which ones to update.

## Hard constraints

- Do not create an import cycle. `library` imports `books` and `shelves` imports `bookmarks`; the
  plan flags two specific traps.
- No new dependency in `go.mod` beyond `github.com/lib/pq`, which is already there.
- No mocking library. Existing tests use plain fake structs; keep that.
- Do not restructure `createUser`'s transaction. Leave a TODO comment instead; the plan says why.
- Do not change any success response body, and do not change `POST /books` or `POST /bookmarks`
  from 200 to 201.
- `gofmt` must be clean.

## Git

- Stay on the current branch. Do not create, switch, merge, or rebase.
- Commit with `git add backend/ && git commit -m "..."`. Never `git add -A`, `git add .`, or
  `git commit -a` — they would stage the frontend agent's uncommitted work into your commit.
- Never `git checkout`, `git restore`, `git reset`, `git stash`, `git clean`, or `git rebase`.
  Repo-wide and destructive to the other agent's in-flight work.

## Definition of done

- Every phase in the plan is ticked off or explained.
- `cd backend && go build ./... && go vet ./... && go test ./...` all pass. Paste the output.
- `gofmt -l backend/` prints nothing.
- Commits are per-phase with clear messages.

## Report back

- Baseline test result, and any pre-existing failure.
- Any task you did not complete, and why.
- Anything in the plan that turned out to be wrong, and what you did instead.
- Any bug you found in `frontend/` — describe it, do not fix it.
- Confirm you touched nothing outside `backend/`.
```

---

## Frontend agent prompt

```text
You are the frontend agent on the mybookshelf repo. Work only in `frontend/`.

You own the Expo / React Native app. You do not touch `backend/` — another agent is working
there in parallel right now, and editing it will destroy their work.

## Setup

1. Read `docs/api-error-contract.md` in full. It is frozen and authoritative. The backend agent
   is implementing it concurrently, so code against the contract, never against a running
   server. Do not start the Go server, do not point EXPO_PUBLIC_API_URL anywhere, and do not write
   a test that needs a live server. Everything is verifiable against Jest mocks.
   You may not edit the contract.
2. Read `docs/plans/frontend-error-handling.md` in full. Work through it phase by phase. It has
   checkbox tasks; tick them as you go.
3. You are already on the right branch (`feature/error-handling`), alongside a backend agent
   working in the same checkout. Stay on it. Do not create or switch branches.
4. Run `cd frontend && npm run lint && npx tsc --noEmit && npm test` before changing anything.
   Record the baseline. If something already fails, report it and leave it failing.
5. `frontend/AGENTS.md` mandates reading the versioned Expo docs at
   https://docs.expo.dev/versions/v57.0.0/ before writing code. Do that. Expo Router 57 and
   React Native 0.86 have changed and the details matter.

## What you are doing

Nearly every screen in this app drops errors on the floor. A failed login shows the user nothing
and never navigates; a failed search leaves a spinner running forever; the shelf context
non-null-asserts lookups that can be undefined, so a failed load crashes downstream. The API
client throws three different message formats and parses the response body before checking
whether the request succeeded, so an HTML 502 becomes a confusing parse error.

Your job:

- Add a typed `ApiError` with a single defensive parse path that survives a missing, null, or
  HTML body, and never shows a raw 5xx message to the user.
- Rewrite `apiClient` so every endpoint funnels through one `request` helper. Keep the exported
  names and signatures. The 401 → logout behaviour is load-bearing and has existing tests —
  do not change its semantics.
- Add a `useAsyncAction` hook whose loading flag can never get stuck, and an `ErrorMessage`
  component that follows the existing `theme.errorText` idiom already used in `register.tsx`.
- Guard every async press handler and every loading effect. In priority order: login, search,
  book detail, reviews list, review submit, place bookmark, select shelf.
- Fix `shelf-provider` so a failed load shows an error instead of crashing consumers on
  `currentlyReading.id`.

## Hard constraints

- No new dependency. No toast library, no query library, no axios. Inline `<ErrorMessage>` is
  the established idiom; do not invent a global snackbar.
- Do not change exported names or signatures in `apiClient.ts` other than `login`'s, and keep
  the `"not logged in"` message text — a test asserts on it.
- Do not add offline support, caching, retry backoff, or optimistic updates.
- Do not touch `src/lib/definitions.ts` types to match backend JSON field names; the plan
  explains why that is out of scope and to leave a TODO instead.
- `npm run lint` and `npx tsc --noEmit` must be clean.

## Git

- Stay on the current branch. Do not create, switch, merge, or rebase.
- Commit with `git add frontend/ && git commit -m "..."`. Never `git add -A`, `git add .`, or
  `git commit -a` — they would stage the backend agent's uncommitted work into your commit.
- Never `git checkout`, `git restore`, `git reset`, `git stash`, `git clean`, or `git rebase`.
  Repo-wide and destructive to the other agent's in-flight work.

## Definition of done

- Every phase in the plan is ticked off or explained.
- `cd frontend && npm run lint && npx tsc --noEmit && npm test` all pass. Paste the output.
- No legacy error string survives: `grep -rn "HTTP error!\|Response status:" src/` is empty.
- Commits are per-phase with clear messages.

## Report back

- Baseline test result, and any pre-existing failure.
- Any task you did not complete, and why.
- Anything in the plan that turned out to be wrong, and what you did instead.
- Any bug you found in `backend/` — describe it, do not fix it.
- Confirm you touched nothing outside `frontend/`.
```

---

## After both finish

No merge step. Everything is already on `feature/error-handling`.

Verify the log looks right — you should see each agent's phase commits landing on the one branch,
each touching only its own directory:

```bash
git log --oneline --stat -20
```

If either agent used `git add -A` and swept up the other's files, you will see it here. Nothing is
lost; the content is correct either way, only the commit boundaries are wrong.

Then run both gates:

```bash
cd backend && go build ./... && go vet ./... && go test ./...
cd ../frontend && npm run lint && npx tsc --noEmit && npm test
```

Finally, run the real backend and app together and walk the failure paths that Jest can only
simulate: wrong password, double registration, a 502 from Open Library, and airplane mode. That is
the only way to confirm the two halves actually agree.