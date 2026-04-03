## Problem

The frontend notes experience is currently implemented as a single broad page script that owns API calls, async workflow state, DOM querying, event wiring, HTML rendering, retry logic, edit-mode behavior, and user-facing error handling. The product behavior is simple, but the implementation is shallow in the wrong place: understanding one note workflow requires tracing through multiple concerns in one module instead of interacting with a clear application boundary.

This creates architectural friction in a few ways:

- The workflow rules for load, create, edit, cancel, retry, and delete are tightly coupled to DOM structure and rendering details.
- The API client and page script jointly own the note workflow concept, so the seam between “business behavior” and “UI wiring” is blurry.
- Tests naturally drift toward DOM-level and event-level assertions because there is no deeper boundary that owns workflow behavior.
- The codebase is harder to navigate because the highest-risk logic lives in scattered event handlers and state mutations rather than behind a single interface.

## Proposed Interface

Introduce a deep frontend module: a `NotesWorkflowEngine` that owns note workflow state and behavior, with a thin page adapter layered on top for DOM integration.

Interface signature:

```js
const engine = createNotesWorkflowEngine({ api });

engine.getState();
engine.subscribe(listener);

await engine.load();
await engine.retryLoad();
await engine.createNote({ title, content });

engine.beginEdit(noteId);
engine.cancelEdit();
await engine.saveEdit(noteId, { title, content });
await engine.deleteNote(noteId, { confirm });
```

Usage example:

```js
const engine = createNotesWorkflowEngine({ api: notesApi });

engine.subscribe((state) => {
  renderNotesPage(document, state);
});

wireNotesPageEvents(document, {
  onRetry: () => engine.retryLoad(),
  onCreate: (input) => engine.createNote(input),
  onEditStart: (noteId) => engine.beginEdit(noteId),
  onEditCancel: () => engine.cancelEdit(),
  onEditSave: (noteId, input) => engine.saveEdit(noteId, input),
  onDelete: (noteId, confirm) => engine.deleteNote(noteId, { confirm }),
});

engine.load();
```

Complexity hidden internally:

- startup loading and retry state
- API-to-state transitions
- create/edit/delete workflow rules
- inline error and global error decisions
- active edit state and cancel behavior
- note list updates after successful server responses
- disabled/empty/loading state coordination

## Dependency Strategy

- **Category**: Ports & adapters
- The workflow engine depends on a small owned API port for note operations.
- Production uses the existing browser-backed API client as the adapter.
- Tests use an in-memory fake API adapter to drive workflow behavior without depending on DOM event wiring or real network calls.
- The DOM page layer becomes an adapter that renders state and forwards user actions into the engine.

## Testing Strategy

- **New boundary tests to write**:
  - initial load success and failure
  - retry after failed startup load
  - create note success and validation failure
  - begin edit, cancel edit, save edit
  - delete note with confirmation gate
  - empty state and disabled-create behavior
- **Old tests to delete**:
  - any future shallow tests that target isolated DOM helpers, individual event listeners, or one-off render utilities once equivalent workflow-engine boundary tests exist
- **Test environment needs**:
  - a fake API adapter implementing the note API port
  - a lightweight state-subscriber harness for asserting observable workflow state transitions

## Implementation Recommendations

- The workflow engine should own note-related application state and all user-visible workflow decisions.
- The engine should hide async sequencing, error mapping, optimistic-vs-confirmed update policy, and edit-mode coordination.
- The engine should expose a small, behavior-oriented interface rather than raw setter-style mutation points.
- The page adapter should only translate DOM events into engine calls and render the latest engine state.
- Rendering concerns should stay replaceable so the workflow engine can be tested independently from the DOM.
- Callers should migrate by replacing direct API-and-state manipulation in page scripts with engine method calls and state subscription.
