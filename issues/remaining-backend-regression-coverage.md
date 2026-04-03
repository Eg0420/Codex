## Parent PRD

#1

## What to build

Expand backend regression coverage for the notes API and file-backed storage behavior described in the parent PRD. This slice should deepen confidence in partial-update semantics, timestamp invariants, malformed data handling, and persistence safety, while continuing to validate behavior through public contracts instead of implementation details.

## Acceptance criteria

- [ ] Backend tests cover partial-update semantics for `PATCH /notes/:id`, including single-field updates and preservation of unchanged fields.
- [ ] Tests verify timestamp invariants and persistence behavior, including `createdAt` immutability and `updatedAt` changes only on successful edits.
- [ ] Tests cover malformed notes-file edge cases and other regression-prone storage behaviors through public interfaces or startup behavior.

## Blocked by

None - can start immediately

## User stories addressed

- User story 15
- User story 16
- User story 17
- User story 33
- User story 36
- User story 37
- User story 40
- User story 41
- User story 45
