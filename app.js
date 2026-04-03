const path = require("path");
const express = require("express");
const cors = require("cors");
const {
  validateCreateNotePayload,
  validatePatchNotePayload,
  normalizeCreateNotePayload,
  normalizePatchNotePayload,
  MAX_TITLE_LENGTH,
  MAX_CONTENT_LENGTH,
} = require("./validation/note-validation");

function createApp({ notesStore, corsOrigin }) {
  const app = express();

  app.disable("x-powered-by");

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || origin === corsOrigin) {
          callback(null, true);
          return;
        }

        callback(new Error("Not allowed by CORS"));
      },
    }),
  );
  app.use(express.json({ limit: "16kb" }));
  app.use(express.static(path.join(__dirname, "public")));

  app.get("/health", (_request, response) => {
    response.json({ status: "ok" });
  });

  app.get("/notes", async (_request, response, next) => {
    try {
      const notes = await notesStore.getNotes();
      response.json(notes);
    } catch (error) {
      next(error);
    }
  });

  app.post("/notes", async (request, response, next) => {
    try {
      const validationError = validateCreateNotePayload(request.body);
      if (validationError) {
        response.status(400).json({ error: validationError });
        return;
      }

      const note = await notesStore.createNote(
        normalizeCreateNotePayload(request.body),
      );

      response.status(201).json(note);
    } catch (error) {
      next(error);
    }
  });

  app.patch("/notes/:id", async (request, response, next) => {
    try {
      const validationError = validatePatchNotePayload(request.body);
      if (validationError) {
        response.status(400).json({ error: validationError });
        return;
      }

      const note = await notesStore.updateNote(
        request.params.id,
        normalizePatchNotePayload(request.body),
      );

      if (!note) {
        response.status(404).json({ error: "Note not found" });
        return;
      }

      response.json(note);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/notes/:id", async (request, response, next) => {
    try {
      const deleted = await notesStore.deleteNote(request.params.id);
      if (!deleted) {
        response.status(404).json({ error: "Note not found" });
        return;
      }

      response.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  app.use((error, _request, response, _next) => {
    if (error?.message === "Not allowed by CORS") {
      response.status(403).json({ error: error.message });
      return;
    }

    if (error instanceof SyntaxError && "body" in error) {
      response.status(400).json({ error: "Invalid JSON body" });
      return;
    }

    console.error(error);
    response.status(500).json({ error: "Internal server error" });
  });

  return app;
}

module.exports = {
  createApp,
  MAX_TITLE_LENGTH,
  MAX_CONTENT_LENGTH,
};