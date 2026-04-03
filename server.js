const path = require("path");

const { createApp } = require("./app");
const { createNotesStore } = require("./storage/notes-store");

const PORT = Number.parseInt(process.env.PORT ?? "3001", 10);
const HOST = "127.0.0.1";
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? "http://localhost:5173";
const NOTES_FILE_PATH =
  process.env.NOTES_FILE_PATH ?? path.join(__dirname, "data", "notes.json");

async function start() {
  const notesStore = createNotesStore({ filePath: NOTES_FILE_PATH });
  await notesStore.init();

  const app = createApp({ notesStore, corsOrigin: CORS_ORIGIN });

  app.listen(PORT, HOST, () => {
    console.log(`Notes API listening on http://${HOST}:${PORT}`);
  });
}

start().catch((error) => {
  console.error("Failed to start Notes API");
  console.error(error);
  process.exitCode = 1;
});
