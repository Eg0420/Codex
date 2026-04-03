(function bootstrapNotesApp(windowObject, documentObject) {
  const state = {
    notes: [],
    isLoaded: false,
    isLoading: false,
    activeEditId: null,
    globalError: "",
  };

  const elements = {
    createForm: documentObject.getElementById("create-form"),
    createTitle: documentObject.getElementById("create-title"),
    createContent: documentObject.getElementById("create-content"),
    createError: documentObject.getElementById("create-error"),
    createSubmit: documentObject.getElementById("create-submit"),
    globalError: documentObject.getElementById("global-error"),
    retryButton: documentObject.getElementById("retry-button"),
    loadingState: documentObject.getElementById("loading-state"),
    emptyState: documentObject.getElementById("empty-state"),
    notesList: documentObject.getElementById("notes-list"),
  };

  elements.createForm.addEventListener("submit", handleCreateSubmit);
  elements.retryButton.addEventListener("click", () => {
    loadNotes();
  });

  elements.notesList.addEventListener("click", async (event) => {
    const action = event.target.closest("[data-action]");
    if (!action) {
      return;
    }

    const listItem = action.closest("[data-note-id]");
    if (!listItem) {
      return;
    }

    const noteId = listItem.dataset.noteId;

    if (action.dataset.action === "edit") {
      state.activeEditId = noteId;
      render();
      return;
    }

    if (action.dataset.action === "cancel") {
      state.activeEditId = null;
      render();
      return;
    }

    if (action.dataset.action === "delete") {
      if (!windowObject.confirm("Delete this note?")) {
        return;
      }

      try {
        clearGlobalError();
        await windowObject.notesApi.deleteNote(noteId);
        state.notes = state.notes.filter((note) => note.id !== noteId);
        if (state.activeEditId === noteId) {
          state.activeEditId = null;
        }
        render();
      } catch (error) {
        setGlobalError(error.message);
      }
    }
  });

  elements.notesList.addEventListener("submit", async (event) => {
    const form = event.target.closest(".edit-form");
    if (!form) {
      return;
    }

    event.preventDefault();

    const noteId = form.dataset.noteId;
    const title = form.elements.title.value;
    const content = form.elements.content.value;
    const errorElement = form.querySelector(".inline-error");

    hideInlineError(errorElement);

    try {
      const updatedNote = await windowObject.notesApi.updateNote(noteId, {
        title,
        content,
      });
      state.notes = state.notes.map((note) =>
        note.id === noteId ? updatedNote : note,
      );
      state.activeEditId = null;
      render();
    } catch (error) {
      showInlineError(errorElement, error.message);
    }
  });

  loadNotes();

  async function loadNotes() {
    state.isLoading = true;
    state.globalError = "";
    render();

    try {
      state.notes = await windowObject.notesApi.listNotes();
      state.isLoaded = true;
      state.activeEditId = null;
    } catch (error) {
      state.isLoaded = false;
      setGlobalError("Could not load notes. Try again.");
    } finally {
      state.isLoading = false;
      render();
    }
  }

  async function handleCreateSubmit(event) {
    event.preventDefault();
    hideInlineError(elements.createError);

    try {
      const note = await windowObject.notesApi.createNote({
        title: elements.createTitle.value,
        content: elements.createContent.value,
      });

      state.notes = [note, ...state.notes];
      state.isLoaded = true;
      elements.createForm.reset();
      elements.createTitle.focus();
      render();
    } catch (error) {
      showInlineError(elements.createError, error.message);
    }
  }

  function render() {
    elements.createSubmit.disabled = !state.isLoaded || state.isLoading;
    elements.createTitle.disabled = !state.isLoaded || state.isLoading;
    elements.createContent.disabled = !state.isLoaded || state.isLoading;

    toggleHidden(elements.globalError, !state.globalError);
    elements.globalError.textContent = state.globalError;

    toggleHidden(elements.retryButton, state.isLoaded || state.isLoading);
    toggleHidden(elements.loadingState, !state.isLoading);
    toggleHidden(
      elements.emptyState,
      state.isLoading || !state.isLoaded || state.notes.length > 0,
    );
    toggleHidden(elements.notesList, !state.isLoaded || state.notes.length === 0);

    elements.notesList.innerHTML = state.notes
      .map((note) =>
        note.id === state.activeEditId ? renderEditNote(note) : renderReadNote(note),
      )
      .join("");
  }

  function renderReadNote(note) {
    return `
      <li class="note-card" data-note-id="${escapeHtml(note.id)}">
        <div class="note-card-header">
          <div>
            <h3>${escapeHtml(note.title)}</h3>
            <p class="timestamp">${formatTimestamps(note)}</p>
          </div>
          <div class="card-actions">
            <button data-action="edit" type="button">Edit</button>
            <button data-action="delete" class="button-danger" type="button">Delete</button>
          </div>
        </div>
        <pre class="note-body">${escapeHtml(note.content || "")}</pre>
      </li>
    `;
  }

  function renderEditNote(note) {
    return `
      <li class="note-card note-card-editing" data-note-id="${escapeHtml(note.id)}">
        <form class="edit-form" data-note-id="${escapeHtml(note.id)}" novalidate>
          <label class="field">
            <span>Title</span>
            <input name="title" maxlength="50" required value="${escapeAttribute(note.title)}" />
          </label>
          <label class="field">
            <span>Content</span>
            <textarea name="content" maxlength="2000" rows="6">${escapeHtml(note.content || "")}</textarea>
          </label>
          <p class="inline-error hidden" role="alert"></p>
          <div class="card-actions">
            <button type="submit">Save</button>
            <button data-action="cancel" class="button-secondary" type="button">Cancel</button>
          </div>
        </form>
      </li>
    `;
  }

  function formatTimestamps(note) {
    const created = `Created ${formatDate(note.createdAt)}`;
    if (!note.updatedAt || note.updatedAt === note.createdAt) {
      return created;
    }

    return `${created} | Updated ${formatDate(note.updatedAt)}`;
  }

  function formatDate(value) {
    return new Date(value).toLocaleString();
  }

  function setGlobalError(message) {
    state.globalError = message;
    render();
  }

  function clearGlobalError() {
    state.globalError = "";
    render();
  }

  function showInlineError(element, message) {
    element.textContent = message;
    element.classList.remove("hidden");
  }

  function hideInlineError(element) {
    element.textContent = "";
    element.classList.add("hidden");
  }

  function toggleHidden(element, shouldHide) {
    element.classList.toggle("hidden", shouldHide);
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function escapeAttribute(value) {
    return escapeHtml(value);
  }
})(window, document);