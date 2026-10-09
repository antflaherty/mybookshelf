# Plans

Planning documents for work on this repo. These are written for agents to execute from, not for
people to read top to end.

| Document | Audience | Purpose |
| -------- | -------- | ------- |
| [`api-error-contract.md`](../api-error-contract.md) | Both agents | **Frozen.** The single source of truth for every error status, code, and message. Neither agent may edit it. |
| [`backend-error-handling.md`](backend-error-handling.md) | Backend agent | Phased checkbox tasks for `backend/`. |
| [`frontend-error-handling.md`](frontend-error-handling.md) | Frontend agent | Phased checkbox tasks for `frontend/`. |
| [`AGENT-PROMPTS.md`](AGENT-PROMPTS.md) | Human | The prompts to paste into each agent session, plus the verification steps. |

## Running the two agents

The backend and frontend plans were written to run **simultaneously** without either blocking the
other. That works because the frontend agent codes against `api-error-contract.md` rather than
against a live backend, and the two plans touch disjoint directories.

Both agents work on the branch you are already on (`feature/error-handling`). No branch setup, no
merge step. Run them in separate sessions against the same checkout, one per plan, using the
prompts in `AGENT-PROMPTS.md`.

Two things follow from sharing a checkout, and both agents are told about them:

- Commits must be path-scoped (`git add backend/ && git commit`). A `git commit -a` would sweep
  the other agent's uncommitted work into your commit.
- Repo-wide git commands (`checkout`, `restore`, `reset`, `stash`, `clean`, `rebase`) are banned.
  They would destroy the other agent's in-flight work with no way to recover it.

## Why a contract document

Two agents editing one repo in parallel will drift unless the interface between them is fixed in
advance and neither side is allowed to move it. The contract does that: it pins the envelope, the
code strings, the status for every endpoint and failure mode, and the exact messages that user-
facing tests assert on. When implementation and contract disagree, the contract is right and the
implementation is the bug — so an agent that finds a discrepancy has a clear rule to follow
instead of a judgement call.

## Adding scope later

Add work to the relevant plan as a new phase, bump the contract's "Last updated" line, and
re-issue the affected agent prompt. Do not append ad-hoc instructions to a running agent; if one
is already mid-phase, let it finish and pick up the new phase after.