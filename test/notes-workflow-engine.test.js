const test = require("node:test");
const assert = require("node:assert/strict");

const {
  createNotesWorkflowEngine,
  LOAD_ERROR_MESSAGE,
} = require("../public/notes-workflow-engine");

test("load success populates notes and clears loading state", async () => {
  const engine = createNotesWorkflowEngine({
    api: {
      async listNotes() {
        return [
          {
            id: "one",
            title: "First note",
            content: "",
            createdAt: "2026-04-01T10:00:00.000Z",
            updatedAt: "2026-04-01T10:00:00.000Z",
          },
        ];
      },
    },
  });

  await engine.load();

  assert.deepEqual(engine.getState(), {
    notes: [
      {
        id: "one",
        title: "First note",
        content: "",
        createdAt: "2026-04-01T10:00:00.000Z",
        updatedAt: "2026-04-01T10:00:00.000Z",
      },
    ],
    isLoaded: true,
    isLoading: false,
    activeEditId: null,
    createError: "",
    editError: "",
    globalError: "",
  });
});

test("retry load recovers from startup failure", async () => {
  let shouldFail = true;
  const engine = createNotesWorkflowEngine({
    api: {
      async listNotes() {
        if (shouldFail) {
          throw new Error("boom");
        }

        return [];
      },
    },
  });

  await engine.load();
  assert.equal(engine.getState().globalError, LOAD_ERROR_MESSAGE);
  assert.equal(engine.getState().isLoaded, false);

  shouldFail = false;
  await engine.retryLoad();

  assert.equal(engine.getState().globalError, "");
  assert.equal(engine.getState().isLoaded, true);
});

test("content-only edit preserves title and exits edit mode on success", async () => {
  const engine = createNotesWorkflowEngine({
    api: {
      async listNotes() {
        return [
          {
            id: "one",
            title: "Keep title",
            content: "Old content",
            createdAt: "2026-04-01T10:00:00.000Z",
            updatedAt: "2026-04-01T10:00:00.000Z",
          },
        ];
      },
      async updateNote(noteId, updates) {
        return {
          id: noteId,
          title: "Keep title",
          content: updates.content,
          createdAt: "2026-04-01T10:00:00.000Z",
          updatedAt: "2026-04-03T12:00:00.000Z",
        };
      },
    },
  });

  await engine.load();
  engine.beginEdit("one");

  const updatedNote = await engine.saveEdit("one", { content: "New content" });

  assert.equal(updatedNote.title, "Keep title");
  assert.equal(updatedNote.content, "New content");
  assert.equal(engine.getState().activeEditId, null);
  assert.equal(engine.getState().notes[0].title, "Keep title");
  assert.equal(engine.getState().notes[0].content, "New content");
});
