---
name: prepare-pr
description: Prepare or create a pull request whenever a user asks to open, draft, ready, or summarize a PR for a branch. Use to produce a comprehensive, evidence-based PR description that explains exactly what will be merged, how it was verified, risks, and reviewer focus.
---

# Prepare Pull Request

Create a reviewable pull request; do not treat the PR as a terse changelog.

## 1. Confirm the merge target

- Identify the repository, source branch, base branch, and desired PR state (draft or ready for review).
- Inspect the actual branch comparison and changed files before drafting the description.
- Respect repository-specific and user-provided Git restrictions. Do not run shell Git commands other than explicitly allowed pulls, fetches, or branch creation. Do not commit, push, merge, rebase, reset, stash, or change Git configuration unless the user explicitly authorizes that action.
- Do not merge the pull request. Opening a PR and merging one are separate actions.

## 2. Gather concrete merge evidence

Capture enough evidence for a reviewer to understand the change without reconstructing it from the diff:

- Files and modules changed, added, renamed, or removed.
- User-visible behavior, API/database/schema changes, and operational effects.
- Important implementation decisions and why they were made.
- Tests, builds, linters, migrations, or manual verification actually run, including outcomes.
- Items deliberately excluded, remaining follow-ups, assumptions, and known limitations.
- Risk areas, compatibility concerns, configuration/secrets, rollout needs, and rollback considerations.

Never claim a test, deployment, migration, review, or verification that did not happen.

## 3. Write the pull-request description

Use this structure unless the repository has a required template. Replace sections that do not apply with a short explicit statement rather than silently omitting material information.

```markdown
## Summary

<2–4 sentences explaining the outcome and why it matters.>

## What is being merged

- <Concrete change 1, including affected area and behavior>
- <Concrete change 2>
- <Concrete change 3>

## Implementation details

### <Logical area or feature>

- <Detailed implementation note>
- <Important design decision and rationale>

### Data, API, and configuration impact

- **Database/migrations:** <none, or exact impact>
- **API/contracts:** <none, or exact impact>
- **Configuration/secrets:** <none, or exact impact>

## Validation

- <Exact command or manual check>: <result>
- <Exact command or manual check>: <result>

## Reviewer focus

- <Area needing close review, reasoning, or product confirmation>

## Risks and follow-ups

- **Risk:** <risk and mitigation>, or `None identified.`
- **Follow-up:** <remaining task>, or `None.`

## Scope exclusions

- <Intentionally deferred item>, or `None.`
```

Use clear, specific language. Name the routes, components, services, database tables, scripts, or user flows affected when known.

## 4. Create and verify the PR

- Use the repository's approved PR workflow and the confirmed base/source branches.
- Set a specific title that describes the outcome, not a vague title such as "updates."
- Make the PR draft when work or validation remains incomplete; otherwise create it ready for review.
- Verify that the created PR points to the intended branches and that its description includes the required details.
- Return the PR link, base and source branches, concise summary, validation result, and any reviewer decisions still needed.
