const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");

function createNotesStore({ filePath }) {
  let writeQueue = Promise.resolve();

  async function init() {
    await fs.mkdir(path.dirname(filePath), { recursive: true });

    try {
      await fs.access(filePath);
    } catch (error) {
      if (error.code === "ENOENT") {
        await writeNotes([]);
        return;
      }

      throw error;
    }

    await readNotes();
  }

  async function getNotes() {
    await writeQueue;
    const notes = await readNotes();

    return notes.sort((left, right) =>
      right.createdAt.localeCompare(left.createdAt),
    );
  }

  async function createNote({ title, content }) {
    return queueWrite(async (notes) => {
      const createdAt = new Date().toISOString();
      const note = {
        id: crypto.randomUUID(),
        title,
        content,
        createdAt,
        updatedAt: createdAt,
      };

      notes.push(note);
      return note;
    });
  }

  async function updateNote(noteId, updates) {
    return queueWrite(async (notes) => {
      const note = notes.find((currentNote) => currentNote.id === noteId);
      if (!note) {
        return null;
      }

      if (Object.hasOwn(updates, "title")) {
        note.title = updates.title;
      }

      if (Object.hasOwn(updates, "content")) {
        note.content = updates.content;
      }

      note.updatedAt = new Date().toISOString();
      return { ...note };
    });
  }

  async function deleteNote(noteId) {
    return queueWrite(async (notes) => {
      const index = notes.findIndex((note) => note.id === noteId);
      if (index === -1) {
        return false;
      }

      notes.splice(index, 1);
      return true;
    });
  }

  function queueWrite(operation) {
    const task = writeQueue.then(async () => {
      const notes = await readNotes();
      const result = await operation(notes);
      await writeNotes(notes);
      return result;
    });

    writeQueue = task.then(
      () => undefined,
      () => undefined,
    );

    return task;
  }

  async function readNotes() {
    const raw = await fs.readFile(filePath, "utf8");
    let notes;

    try {
      notes = JSON.parse(raw);
    } catch (error) {
      throw new Error(
        `Failed to parse notes JSON at ${filePath}: ${error.message}`,
      );
    }

    if (!Array.isArray(notes)) {
      throw new Error(`Notes file at ${filePath} must contain a JSON array`);
    }

    return notes;
  }

  async function writeNotes(notes) {
    const tempFilePath = `${filePath}.tmp`;
    const payload = `${JSON.stringify(notes, null, 2)}\n`;

    await fs.writeFile(tempFilePath, payload, "utf8");
    await fs.rename(tempFilePath, filePath);
  }

  return {
    init,
    getNotes,
    createNote,
    updateNote,
    deleteNote,
  };
}

module.exports = {
  createNotesStore,
};