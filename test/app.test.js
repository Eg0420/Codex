const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

const request = require("supertest");

const { createApp } = require("../app");
const { createNotesStore } = require("../storage/notes-store");

async function createTestApp(initialNotes = []) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "notes-api-"));
  const notesFilePath = path.join(tempDir, "notes.json");
  await fs.writeFile(notesFilePath, JSON.stringify(initialNotes), "utf8");

  const notesStore = createNotesStore({ filePath: notesFilePath });
  await notesStore.init();

  const app = createApp({
    notesStore,
    corsOrigin: "http://localhost:5173",
  });

  return {
    app,
    notesFilePath,
    cleanup: async () => {
      await fs.rm(tempDir, { recursive: true, force: true });
    },
  };
}

test("GET /health returns ok status", async () => {
  const fixture = await createTestApp();

  try {
    const response = await request(fixture.app).get("/health");

    assert.equal(response.status, 200);
    assert.deepEqual(response.body, { status: "ok" });
  } finally {
    await fixture.cleanup();
  }
});

test("POST /notes creates a note and GET /notes returns newest first", async () => {
  const fixture = await createTestApp([
    {
      id: "older-note",
      title: "Older",
      content: "First note",
      createdAt: "2026-04-01T10:00:00.000Z",
      updatedAt: "2026-04-01T10:00:00.000Z",
    },
  ]);

  try {
    const createResponse = await request(fixture.app)
      .post("/notes")
      .send({ title: "  New note  ", content: "Exact body\n  spacing" });

    assert.equal(createResponse.status, 201);
    assert.equal(createResponse.body.title, "New note");
    assert.equal(createResponse.body.content, "Exact body\n  spacing");
    assert.ok(createResponse.body.id);
    assert.match(
      createResponse.body.createdAt,
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/,
    );
    assert.equal(createResponse.body.updatedAt, createResponse.body.createdAt);

    const listResponse = await request(fixture.app).get("/notes");

    assert.equal(listResponse.status, 200);
    assert.equal(listResponse.body.length, 2);
    assert.equal(listResponse.body[0].id, createResponse.body.id);
    assert.equal(listResponse.body[1].id, "older-note");
  } finally {
    await fixture.cleanup();
  }
});

test("POST /notes rejects missing or blank titles", async () => {
  const fixture = await createTestApp();

  try {
    const missingTitleResponse = await request(fixture.app)
      .post("/notes")
      .send({ content: "No title" });

    assert.equal(missingTitleResponse.status, 400);
    assert.deepEqual(missingTitleResponse.body, { error: "Title is required" });

    const blankTitleResponse = await request(fixture.app)
      .post("/notes")
      .send({ title: "   " });

    assert.equal(blankTitleResponse.status, 400);
    assert.deepEqual(blankTitleResponse.body, { error: "Title is required" });
  } finally {
    await fixture.cleanup();
  }
});

test("POST /notes rejects unknown fields", async () => {
  const fixture = await createTestApp();

  try {
    const response = await request(fixture.app)
      .post("/notes")
      .send({ title: "Valid", tags: ["unexpected"] });

    assert.equal(response.status, 400);
    assert.deepEqual(response.body, { error: "Unexpected field: tags" });
  } finally {
    await fixture.cleanup();
  }
});

test("PATCH /notes/:id updates title and content and refreshes updatedAt", async () => {
  const fixture = await createTestApp([
    {
      id: "edit-me",
      title: "Old title",
      content: "Old content",
      createdAt: "2026-04-01T10:00:00.000Z",
      updatedAt: "2026-04-01T10:00:00.000Z",
    },
  ]);

  try {
    const response = await request(fixture.app)
      .patch("/notes/edit-me")
      .send({ title: "  New title  ", content: "New content" });

    assert.equal(response.status, 200);
    assert.equal(response.body.id, "edit-me");
    assert.equal(response.body.title, "New title");
    assert.equal(response.body.content, "New content");
    assert.equal(response.body.createdAt, "2026-04-01T10:00:00.000Z");
    assert.notEqual(response.body.updatedAt, "2026-04-01T10:00:00.000Z");

    const listResponse = await request(fixture.app).get("/notes");
    assert.equal(listResponse.body[0].title, "New title");
    assert.equal(listResponse.body[0].content, "New content");
  } finally {
    await fixture.cleanup();
  }
});

test("PATCH /notes/:id rejects empty payloads and unknown fields", async () => {
  const fixture = await createTestApp([
    {
      id: "edit-me",
      title: "Old title",
      content: "Old content",
      createdAt: "2026-04-01T10:00:00.000Z",
      updatedAt: "2026-04-01T10:00:00.000Z",
    },
  ]);

  try {
    const emptyPayload = await request(fixture.app).patch("/notes/edit-me").send({});
    assert.equal(emptyPayload.status, 400);
    assert.deepEqual(emptyPayload.body, { error: "At least one field is required" });

    const unknownField = await request(fixture.app)
      .patch("/notes/edit-me")
      .send({ tags: ["unexpected"] });
    assert.equal(unknownField.status, 400);
    assert.deepEqual(unknownField.body, { error: "Unexpected field: tags" });
  } finally {
    await fixture.cleanup();
  }
});

test("PATCH /notes/:id returns 404 for a missing note", async () => {
  const fixture = await createTestApp();

  try {
    const response = await request(fixture.app)
      .patch("/notes/missing-note")
      .send({ title: "New title" });

    assert.equal(response.status, 404);
    assert.deepEqual(response.body, { error: "Note not found" });
  } finally {
    await fixture.cleanup();
  }
});

test("DELETE /notes/:id removes an existing note", async () => {
  const fixture = await createTestApp([
    {
      id: "delete-me",
      title: "Delete me",
      content: "",
      createdAt: "2026-04-01T10:00:00.000Z",
      updatedAt: "2026-04-01T10:00:00.000Z",
    },
  ]);

  try {
    const deleteResponse = await request(fixture.app).delete("/notes/delete-me");
    assert.equal(deleteResponse.status, 204);

    const listResponse = await request(fixture.app).get("/notes");
    assert.deepEqual(listResponse.body, []);
  } finally {
    await fixture.cleanup();
  }
});

test("DELETE /notes/:id returns 404 for a missing note", async () => {
  const fixture = await createTestApp();

  try {
    const response = await request(fixture.app).delete("/notes/missing-note");

    assert.equal(response.status, 404);
    assert.deepEqual(response.body, { error: "Note not found" });
  } finally {
    await fixture.cleanup();
  }
});

test("GET / serves the notes frontend", async () => {
  const fixture = await createTestApp();

  try {
    const response = await request(fixture.app).get("/");

    assert.equal(response.status, 200);
    assert.match(response.text, /<title>Notes Desk<\/title>/);
    assert.match(response.text, /Save note/);
  } finally {
    await fixture.cleanup();
  }
});