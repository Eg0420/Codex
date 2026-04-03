## Parent PRD

#1

## What to build

Add key user-visible frontend workflow tests for the notes app described in the parent PRD. This slice should verify the existing end-to-end UI behavior around startup loading and failure recovery, note creation feedback, inline edit save and cancel flows, delete confirmation, and empty-state rendering. Focus on the behaviors already described in the PRD and currently implemented in the app, rather than adding new product scope.

## Acceptance criteria

- [ ] Frontend-facing tests cover initial load failure with a retry path and confirm the create form stays disabled until the load succeeds.
- [ ] Tests cover create success, inline validation visibility, inline edit save, and inline edit cancel from a user-observable perspective.
- [ ] Tests cover delete confirmation behavior and empty-state rendering without asserting component implementation details.

## Blocked by

None - can start immediately

## User stories addressed

- User story 8
- User story 14
- User story 20
- User story 21
- User story 23
- User story 24
- User story 25
- User story 27
- User story 28
