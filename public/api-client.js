(function attachApiClient(globalObject) {
  async function requestJson(path, options = {}) {
    const response = await fetch(path, {
      headers: {
        "Content-Type": "application/json",
        ...(options.headers ?? {}),
      },
      ...options,
    });

    if (response.status === 204) {
      return null;
    }

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message =
        typeof payload.error === "string"
          ? payload.error
          : "Unexpected server error";
      throw new Error(message);
    }

    return payload;
  }

  globalObject.notesApi = {
    listNotes() {
      return requestJson("/notes");
    },
    createNote(note) {
      return requestJson("/notes", {
        method: "POST",
        body: JSON.stringify(note),
      });
    },
    updateNote(noteId, updates) {
      return requestJson(`/notes/${encodeURIComponent(noteId)}`, {
        method: "PATCH",
        body: JSON.stringify(updates),
      });
    },
    deleteNote(noteId) {
      return requestJson(`/notes/${encodeURIComponent(noteId)}`, {
        method: "DELETE",
      });
    },
  };
})(window);