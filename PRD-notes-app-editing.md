# PRD: Single-User Notes App MVP and Editing

## Problem Statement

Users need a simple note-taking app for local development that lets them quickly capture notes, review existing notes, update note content later, and remove notes they no longer need. The app should feel lightweight and predictable, without requiring login, multi-user complexity, or advanced security features that are unnecessary for a single-user prototype.

## Solution

Build a small single-user notes application backed by a local JSON-file API. The product will support creating notes, listing saved notes, editing notes inline, and deleting notes with lightweight confirmation. The frontend will keep note creation visible at all times, show helpful empty and error states, and wait for server-confirmed responses before updating the interface. The backend will provide a strict, simple API contract with file-backed persistence, serialized writes, timestamp tracking, and clear JSON error responses.

## User Stories

1. As a single user, I want to create a note with a title and optional content, so that I can quickly save information.
2. As a single user, I want note titles to be required, so that every saved note has a usable label.
3. As a single user, I want blank or whitespace-only titles to be rejected, so that my note list stays readable.
4. As a single user, I want note content to be optional, so that I can create placeholder notes quickly.
5. As a single user, I want note content to preserve my exact spacing and line breaks, so that formatting I type is not lost.
6. As a single user, I want title length limited to 50 characters, so that note headings stay concise and manageable.
7. As a single user, I want content length limited to 2000 characters, so that the app stays lightweight and the local JSON store does not grow unexpectedly.
8. As a single user, I want newly created notes to appear in my list after the server confirms the save, so that I know the data is actually persisted.
9. As a single user, I want notes returned newest first, so that the most recent work is easiest to find.
10. As a single user, I want to view the full content of each note in the list, so that I do not need an extra detail screen for a small app.
11. As a single user, I want a create-note form always visible above the list, so that the primary action is always easy to reach.
12. As a single user, I want the create form to clear after a successful save, so that I can immediately enter another note.
13. As a single user, I want focus to return to the title field after creating a note, so that rapid note entry feels smooth.
14. As a single user, I want to edit a note inline from the list, so that I can quickly correct or expand saved notes.
15. As a single user, I want note editing to support changing only the fields I care about, so that the frontend does not have to resend unchanged data.
16. As a single user, I want edited notes to keep the same identity and original creation time, so that history stays understandable.
17. As a single user, I want `updatedAt` to change only when an edit succeeds, so that the timestamp reflects actual modifications.
18. As a single user, I want the UI to show when a note was created, so that I have time context for each note.
19. As a single user, I want the UI to optionally show when a note was updated if that differs from creation time, so that I can tell which notes changed later.
20. As a single user, I want to cancel an in-progress inline edit, so that accidental changes do not feel sticky.
21. As a single user, I want validation errors shown near the form I am using, so that I understand what needs fixing without hunting for a generic message.
22. As a single user, I want a simple global error message for unexpected server failures, so that I know when something broader has gone wrong.
23. As a single user, I want to delete a specific note, so that I can remove information I no longer need.
24. As a single user, I want a lightweight confirmation before deletion, so that I do not accidentally remove a note permanently.
25. As a single user, I want the app to show a friendly empty state when there are no notes yet, so that the page still feels intentional.
26. As a single user, I want the empty state to nudge me toward creating my first note, so that the next step is obvious.
27. As a single user, I want the app to disable creation until the initial note load succeeds, so that I do not interact with a broken startup state.
28. As a single user, I want a clear retry path if notes fail to load on startup, so that I can recover from a temporary API issue.
29. As a frontend developer, I want a small, predictable API surface, so that integrating the UI is straightforward.
30. As a frontend developer, I want success responses to return plain note JSON or arrays, so that I do not need to unwrap custom envelopes.
31. As a frontend developer, I want errors returned in a simple `{ "error": "..." }` shape, so that UI error handling stays consistent.
32. As a frontend developer, I want note creation to return the saved note object, so that I can render the canonical server response.
33. As a frontend developer, I want note editing to return the updated note object, so that I can refresh the edited item without an extra fetch.
34. As a frontend developer, I want deleting a missing note to return `404 Not Found`, so that the UI can respond truthfully to stale state.
35. As a frontend developer, I want deleting an existing note to return `204 No Content`, so that the delete contract stays simple.
36. As a backend developer, I want request validation centralized, so that create and edit rules remain consistent over time.
37. As a backend developer, I want unknown fields rejected on create and edit, so that the JSON file does not become a dumping ground for accidental payloads.
38. As a backend developer, I want the notes file created automatically when missing, so that first-run setup is frictionless.
39. As a backend developer, I want malformed JSON to fail fast on startup, so that data corruption is obvious and not silently hidden.
40. As a backend developer, I want writes serialized through one storage helper, so that back-to-back requests do not race and corrupt the file.
41. As a backend developer, I want writes performed through a temp file and rename step, so that persistence is safer if the process dies mid-write.
42. As a backend developer, I want the API to bind to local development use only and skip authentication for now, so that the prototype stays small and focused.
43. As a developer, I want a health endpoint, so that I can verify the API is alive without touching note data.
44. As a developer, I want configurable port, CORS origin, and notes file path values, so that local development and tests remain flexible.
45. As a future maintainer, I want the note model to include both `createdAt` and `updatedAt`, so that later features like editing are supported cleanly.

## Implementation Decisions

- The product remains a single-user local-development application with no authentication in this phase.
- The backend exposes `GET /health`, `GET /notes`, `POST /notes`, `PATCH /notes/:id`, and `DELETE /notes/:id`.
- The note data model includes `id`, `title`, `content`, `createdAt`, and `updatedAt`.
- Note IDs use UUIDs rather than incremental counters.
- Note timestamps are stored as ISO strings.
- `GET /notes` returns full note bodies sorted by `createdAt` descending.
- `POST /notes` requires `title`, trims the title before saving, allows empty `content`, preserves content exactly as entered, and rejects unknown fields.
- `PATCH /notes/:id` performs partial updates, requires at least one allowed field, allows changes to `title`, `content`, or both, rejects unknown fields, trims and validates `title`, preserves `content` formatting exactly, returns the updated note on success, and updates `updatedAt` only after a successful edit.
- `DELETE /notes/:id` deletes a specific note, returns `204 No Content` on success, and returns `404 Not Found` if the note does not exist.
- Success responses use plain note JSON objects or arrays rather than a wrapped response envelope.
- Error responses use a simple JSON shape with an `error` string field.
- The API is built as a small Express application in plain JavaScript using CommonJS.
- App construction is separated from process startup so the server can be tested without opening a port.
- The backend uses a dedicated Notes API module to own routing, validation application, CORS behavior, and error mapping.
- The backend uses a deep Notes storage module to encapsulate file initialization, sorted reads, serialized mutations, atomic-ish file replacement, note creation, note update, and note deletion behind a stable interface.
- A dedicated validation module should own the create/edit rules so validation semantics remain consistent across endpoints.
- Notes are persisted in a local JSON file, with a default path and an environment-variable override for tests and future deployments.
- If the notes file is missing, startup creates it with an empty array.
- If the notes file exists but is malformed or not a JSON array, startup fails fast with a clear error.
- CORS allows only one configured frontend origin rather than broad localhost access.
- The server reads configuration from environment variables, including port, notes file path, and allowed frontend origin, while keeping sensible development defaults.
- The frontend should include a Notes page/module responsible for loading notes on startup, rendering the always-visible create form, handling loading and global error states, and coordinating create/edit/delete actions with the API.
- The frontend should include a focused inline note editing module responsible for per-note edit state, save/cancel interactions, local validation messaging, and timestamp display.
- The frontend should include an API client module that centralizes request methods, response parsing, and user-facing error handling.
- The create form remains visible above the note list at all times.
- After a successful create, the form clears and focus returns to the title field.
- The UI waits for server-confirmed responses rather than performing optimistic updates in this version.
- Validation errors are shown inline near the relevant create or edit form, while unexpected failures use a simple global fallback error message.
- The notes list shows `createdAt`, and shows `updatedAt` only when it differs from `createdAt`.
- The empty state uses custom copy that explicitly nudges users to create their first note.
- If initial note loading fails, the app shows a clear global error state with a retry action and keeps the create form disabled until the load succeeds.
- Delete actions require a lightweight confirmation step in the UI.

## Testing Decisions

- Good tests should verify externally visible behavior and public contracts rather than implementation details.
- Backend tests should cover API behavior end-to-end at the route level, including success cases, validation failures, sort order, edit behavior, delete behavior, startup health, and error contracts.
- The Notes storage module should receive strong test coverage because it is the deepest module and carries the most data integrity risk.
- Validation logic should be tested through public API behavior and, where useful, through a focused validation interface rather than by asserting internals of route handlers.
- Frontend tests should cover key user-visible workflows: initial load success, initial load failure with retry affordance, create note, inline edit with save, inline edit with cancel, delete with confirmation, empty state rendering, and inline validation display.
- Frontend tests should assert user-observable outcomes such as visible note state, disabled controls, and error text, not component implementation structure.
- Existing backend endpoint tests in the codebase provide prior art for route-level behavior testing around create, list, delete, and validation. The editing tests should follow the same external-behavior style.

## Out of Scope

- Multi-user support
- Login or authentication flows
- Encryption of notes at rest or in transit beyond normal local-development transport
- Public internet exposure or production hardening
- Search, tags, folders, or categorization
- Rich-text editing
- Bulk delete operations
- Optimistic UI updates
- Separate detail pages or modal-based editing flows
- Real database storage

## Further Notes

- This PRD intentionally extends the current MVP by adding note editing and the minimal frontend behavior needed to make the notes app feel complete.
- The architecture should favor a small number of deep modules over many shallow helpers, especially around storage and API integration.
- The current implemented backend already covers health, list, create, and delete behavior; the primary backend extension described here is partial note editing.
