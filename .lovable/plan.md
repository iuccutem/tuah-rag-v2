## Goal
Let users preview any prompt's full content directly from the selector list, not just the one already selected.

## Change
In `src/routes/_authenticated/index.tsx`, enhance each row inside the Prompt `SelectContent` list with an inline **eye** preview button:

- Wrap each `SelectItem` in a flex row: the item on the left, a small `Eye` icon button on the right.
- Clicking the eye sets a new `previewPromptId` state and opens the existing prompt preview dialog — without changing the currently selected `systemPromptId`.
- Use `e.stopPropagation()` + `e.preventDefault()` on the eye button so the Select doesn't treat it as a selection.
- Tooltip on hover: "Preview this prompt".

Refactor the preview dialog to use a derived `previewPrompt`:
- `const previewPrompt = prompts.find(p => p.id === previewPromptId) ?? selectedPrompt;`
- The top-right Info button (already there) keeps working — it previews the currently selected prompt by opening the dialog with `previewPromptId = systemPromptId`.
- On dialog close, clear `previewPromptId`.

Add a small "Use this prompt" button in the dialog footer that calls `setSystemPromptId(previewPrompt.id)` and closes the dialog, so users can preview → confirm → select in one flow.

## Why this over hover
- Hover tooltips truncate/overflow for long multi-KB system prompts and are hard to scroll/copy.
- Eye-in-list keeps the dropdown open, requires one click, and reuses the existing scrollable/monospace dialog which already handles long prompts, model, vector, and updated-at metadata.

## Out of scope
- No backend / webhook changes.
- No change to prompt sorting, search, or storage of selection.
- No change to the vector store selector.
