(function defineNotesWorkflowEngine(globalObject) {
  const LOAD_ERROR_MESSAGE = "Could not load notes. Try again.";

  function createNotesWorkflowEngine({ api }) {
    let state = createInitialState();
    const listeners = new Set();

    function getState() {
      return cloneState(state);
    }

    function subscribe(listener) {
      listeners.add(listener);
      listener(getState());

      return () => {
        listeners.delete(listener);
      };
    }

    async function load() {
      setState({
        ...state,
        isLoading: true,
        globalError: "",
      });

      try {
        const notes = await api.listNotes();
        setState({
          ...state,
          notes,
          isLoaded: true,
          isLoading: false,
          activeEditId: null,
          createError: "",
          editError: "",
          globalError: "",
        });
      } catch (error) {
        setState({
          ...state,
          isLoaded: false,
          isLoading: false,
          globalError: LOAD_ERROR_MESSAGE,
        });
      }
    }

    async function retryLoad() {
      return load();
    }

    async function createNote(input) {
      setState({
        ...state,
        createError: "",
      });

      try {
        const note = await api.createNote(input);
        setState({
          ...state,
          notes: [note, ...state.notes],
          isLoaded: true,
          createError: "",
          globalError: "",
        });
        return note;
      } catch (error) {
        setState({
          ...state,
          createError: error.message,
        });
        return null;
      }
    }

    function beginEdit(noteId) {
      setState({
        ...state,
        activeEditId: noteId,
        editError: "",
      });
    }

    function cancelEdit() {
      setState({
        ...state,
        activeEditId: null,
        editError: "",
      });
    }

    async function saveEdit(noteId, input) {
      setState({
        ...state,
        editError: "",
      });

      try {
        const updatedNote = await api.updateNote(noteId, input);
        setState({
          ...state,
          notes: state.notes.map((note) =>
            note.id === noteId ? updatedNote : note,
          ),
          activeEditId: null,
          editError: "",
          globalError: "",
        });
        return updatedNote;
      } catch (error) {
        setState({
          ...state,
          editError: error.message,
        });
        return null;
      }
    }

    async function deleteNote(noteId, { confirm } = {}) {
      if (typeof confirm === "function" && !confirm()) {
        return false;
      }

      try {
        await api.deleteNote(noteId);
        setState({
          ...state,
          notes: state.notes.filter((note) => note.id !== noteId),
          activeEditId: state.activeEditId === noteId ? null : state.activeEditId,
          globalError: "",
        });
        return true;
      } catch (error) {
        setState({
          ...state,
          globalError: error.message,
        });
        return false;
      }
    }

    function setState(nextState) {
      state = nextState;
      for (const listener of listeners) {
        listener(getState());
      }
    }

    return {
      getState,
      subscribe,
      load,
      retryLoad,
      createNote,
      beginEdit,
      cancelEdit,
      saveEdit,
      deleteNote,
    };
  }

  function createInitialState() {
    return {
      notes: [],
      isLoaded: false,
      isLoading: false,
      activeEditId: null,
      createError: "",
      editError: "",
      globalError: "",
    };
  }

  function cloneState(state) {
    return {
      ...state,
      notes: state.notes.map((note) => ({ ...note })),
    };
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = {
      createNotesWorkflowEngine,
      LOAD_ERROR_MESSAGE,
    };
    return;
  }

  globalObject.createNotesWorkflowEngine = createNotesWorkflowEngine;
})(typeof window !== "undefined" ? window : globalThis);
