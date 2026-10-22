export type VideoEditorShortcut =
  | 'play'
  | 'split'
  | 'undo'
  | 'redo'
  | 'delete';

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  // jsdom lacks isContentEditable and contentEditable reflection; check both
  // the property and the attribute (the latter also catches editable parents).
  if (
    target.contentEditable === 'true' ||
    target.contentEditable === 'plaintext-only'
  ) {
    return true;
  }
  const editable = target.closest('[contenteditable]');
  if (editable && editable.getAttribute('contenteditable') !== 'false') {
    return true;
  }
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

export function videoEditorShortcut(
  event: KeyboardEvent,
): VideoEditorShortcut | null {
  if (isEditableTarget(event.target)) return null;

  const mod = event.ctrlKey || event.metaKey;
  const key = event.key.toLowerCase();

  if (mod && !event.altKey) {
    if (key === 'z') return event.shiftKey ? 'redo' : 'undo';
    if (key === 'y') return 'redo';
    return null;
  }
  if (event.altKey) return null;

  if (event.key === ' ') return 'play';
  if (key === 's') return 'split';
  if (event.key === 'Delete' || event.key === 'Backspace') return 'delete';
  return null;
}
