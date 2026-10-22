import { describe, expect, it } from 'vitest';
import { videoEditorShortcut } from './shortcuts';

function key(
  value: string,
  init: KeyboardEventInit = {},
): KeyboardEvent {
  return new KeyboardEvent('keydown', { key: value, ...init });
}

function shortcutFromTarget(
  element: HTMLElement,
  init: KeyboardEventInit,
): ReturnType<typeof videoEditorShortcut> {
  let result: ReturnType<typeof videoEditorShortcut> = 'unset' as never;
  element.addEventListener('keydown', (event) => {
    result = videoEditorShortcut(event);
  });
  element.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, ...init }));
  return result;
}

describe('videoEditorShortcut', () => {
  it('maps Space to play', () => {
    expect(videoEditorShortcut(key(' '))).toBe('play');
  });

  it('maps s to split', () => {
    expect(videoEditorShortcut(key('s'))).toBe('split');
    expect(videoEditorShortcut(key('S'))).toBe('split');
  });

  it('maps Ctrl/Cmd+Z to undo', () => {
    expect(videoEditorShortcut(key('z', { ctrlKey: true }))).toBe('undo');
    expect(videoEditorShortcut(key('z', { metaKey: true }))).toBe('undo');
  });

  it('maps Ctrl/Cmd+Shift+Z and Ctrl+Y to redo', () => {
    expect(
      videoEditorShortcut(key('z', { ctrlKey: true, shiftKey: true })),
    ).toBe('redo');
    expect(
      videoEditorShortcut(key('Z', { metaKey: true, shiftKey: true })),
    ).toBe('redo');
    expect(videoEditorShortcut(key('y', { ctrlKey: true }))).toBe('redo');
  });

  it('maps Delete and Backspace to delete', () => {
    expect(videoEditorShortcut(key('Delete'))).toBe('delete');
    expect(videoEditorShortcut(key('Backspace'))).toBe('delete');
  });

  it('ignores modified plain keys and unknown keys', () => {
    expect(videoEditorShortcut(key(' ', { ctrlKey: true }))).toBeNull();
    expect(videoEditorShortcut(key('s', { metaKey: true }))).toBeNull();
    expect(videoEditorShortcut(key('s', { altKey: true }))).toBeNull();
    expect(videoEditorShortcut(key('x'))).toBeNull();
    expect(videoEditorShortcut(key('z'))).toBeNull();
  });

  it('returns null when the target is a form field or editable element', () => {
    const input = document.createElement('input');
    const textarea = document.createElement('textarea');
    const select = document.createElement('select');
    const editable = document.createElement('div');
    editable.contentEditable = 'true';
    const plain = document.createElement('div');
    document.body.append(input, textarea, select, editable, plain);

    for (const element of [input, textarea, select, editable]) {
      expect(shortcutFromTarget(element, { key: ' ' })).toBeNull();
      expect(shortcutFromTarget(element, { key: 's' })).toBeNull();
      expect(
        shortcutFromTarget(element, { key: 'z', ctrlKey: true }),
      ).toBeNull();
      expect(shortcutFromTarget(element, { key: 'Delete' })).toBeNull();
    }
    expect(shortcutFromTarget(plain, { key: ' ' })).toBe('play');
  });
});
