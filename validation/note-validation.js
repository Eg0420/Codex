const MAX_TITLE_LENGTH = 50;
const MAX_CONTENT_LENGTH = 2000;
const ALLOWED_NOTE_FIELDS = new Set(["title", "content"]);

function validateCreateNotePayload(payload) {
  return validateNotePayload(payload, { partial: false });
}

function validatePatchNotePayload(payload) {
  return validateNotePayload(payload, { partial: true });
}

function validateNotePayload(payload, { partial }) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return "Request body must be a JSON object";
  }

  const keys = Object.keys(payload);

  if (partial && keys.length === 0) {
    return "At least one field is required";
  }

  for (const key of keys) {
    if (!ALLOWED_NOTE_FIELDS.has(key)) {
      return `Unexpected field: ${key}`;
    }
  }

  if (!partial || Object.hasOwn(payload, "title")) {
    if (typeof payload.title !== "string") {
      return "Title is required";
    }

    const trimmedTitle = payload.title.trim();
    if (!trimmedTitle) {
      return "Title is required";
    }

    if (trimmedTitle.length > MAX_TITLE_LENGTH) {
      return `Title must be ${MAX_TITLE_LENGTH} characters or fewer`;
    }
  }

  if (Object.hasOwn(payload, "content")) {
    if (typeof payload.content !== "string") {
      return "Content must be a string";
    }

    if (payload.content.length > MAX_CONTENT_LENGTH) {
      return `Content must be ${MAX_CONTENT_LENGTH} characters or fewer`;
    }
  }

  return null;
}

function normalizeCreateNotePayload(payload) {
  return {
    title: payload.title.trim(),
    content: payload.content ?? "",
  };
}

function normalizePatchNotePayload(payload) {
  const normalized = {};

  if (Object.hasOwn(payload, "title")) {
    normalized.title = payload.title.trim();
  }

  if (Object.hasOwn(payload, "content")) {
    normalized.content = payload.content;
  }

  return normalized;
}

module.exports = {
  MAX_TITLE_LENGTH,
  MAX_CONTENT_LENGTH,
  validateCreateNotePayload,
  validatePatchNotePayload,
  normalizeCreateNotePayload,
  normalizePatchNotePayload,
};
