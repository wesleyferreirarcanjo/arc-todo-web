import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';
import type { TaskRef } from '../lib/api/conversations';
import {
  formatTaskChipLabel,
  formatTaskRefToken,
  parseTaskRefsFromText,
} from '../lib/chat/taskRefTokens';

export interface ChatComposerHandle {
  insertRef: (ref: TaskRef) => void;
  removeRef: (taskId: string) => void;
  containsRef: (taskId: string) => boolean;
  getContent: () => { text: string; taskRefs: TaskRef[] };
  clear: () => void;
  focus: () => void;
}

interface ChatComposerProps {
  placeholder?: string;
  disabled?: boolean;
  onSubmit: () => void;
}

function createBadgeElement(ref: TaskRef): HTMLSpanElement {
  const badge = document.createElement('span');
  badge.className = 'chat-composer-badge';
  badge.contentEditable = 'false';
  badge.dataset.taskId = ref.taskId;
  badge.dataset.organizationId = ref.organizationId;
  badge.dataset.projectId = ref.projectId;
  badge.dataset.title = ref.title;
  badge.title = `${ref.title} (${ref.taskId})`;
  badge.textContent = formatTaskChipLabel(ref.title, ref.taskId);
  return badge;
}

function serializeEditor(root: HTMLElement): string {
  let text = '';

  root.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent ?? '';
      return;
    }

    if (!(node instanceof HTMLElement)) {
      return;
    }

    if (node.classList.contains('chat-composer-badge')) {
      const taskId = node.dataset.taskId ?? '';
      const organizationId = node.dataset.organizationId ?? '';
      const projectId = node.dataset.projectId ?? '';
      const title = node.dataset.title ?? node.textContent ?? taskId;
      text += formatTaskRefToken({
        taskId,
        organizationId,
        projectId,
        title,
      });
      return;
    }

    if (node.tagName === 'BR') {
      text += '\n';
      return;
    }

    text += serializeEditor(node);
  });

  return text;
}

function insertNodeAtSelection(node: Node) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return false;
  }

  const range = selection.getRangeAt(0);
  range.deleteContents();
  range.insertNode(node);
  range.setStartAfter(node);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
  return true;
}

export const ChatComposer = forwardRef<ChatComposerHandle, ChatComposerProps>(
  function ChatComposer({ placeholder, disabled = false, onSubmit }, ref) {
    const editorRef = useRef<HTMLDivElement>(null);

    const getContent = useCallback(() => {
      const root = editorRef.current;
      if (!root) {
        return { text: '', taskRefs: [] };
      }

      const text = serializeEditor(root).replace(/\u00a0/g, ' ').trim();
      return {
        text,
        taskRefs: parseTaskRefsFromText(text),
      };
    }, []);

    const clear = useCallback(() => {
      const root = editorRef.current;
      if (!root) {
        return;
      }
      root.innerHTML = '';
    }, []);

    const focus = useCallback(() => {
      editorRef.current?.focus();
    }, []);

    const insertRef = useCallback(
      (taskRef: TaskRef) => {
        const root = editorRef.current;
        if (!root || disabled) {
          return;
        }

        root.focus();

        if (serializeEditor(root).includes(formatTaskRefToken(taskRef))) {
          return;
        }

        const badge = createBadgeElement(taskRef);
        const spacer = document.createTextNode(' ');

        if (!insertNodeAtSelection(badge)) {
          root.appendChild(badge);
        }

        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          range.insertNode(spacer);
          range.setStartAfter(spacer);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
        } else {
          root.appendChild(spacer);
        }
      },
      [disabled],
    );

    const removeRef = useCallback(
      (taskId: string) => {
        const root = editorRef.current;
        if (!root) {
          return;
        }

        root.querySelectorAll('.chat-composer-badge').forEach((node) => {
          if (node instanceof HTMLElement && node.dataset.taskId === taskId) {
            node.remove();
          }
        });
      },
      [],
    );

    const containsRef = useCallback(
      (taskId: string) => {
        const root = editorRef.current;
        if (!root) {
          return false;
        }

        return Array.from(root.querySelectorAll('.chat-composer-badge')).some(
          (node) =>
            node instanceof HTMLElement && node.dataset.taskId === taskId,
        );
      },
      [],
    );

    useImperativeHandle(
      ref,
      () => ({
        insertRef,
        removeRef,
        containsRef,
        getContent,
        clear,
        focus,
      }),
      [clear, containsRef, focus, getContent, insertRef, removeRef],
    );

    useEffect(() => {
      const root = editorRef.current;
      if (!root) {
        return;
      }

      root.dataset.placeholder = placeholder ?? '';
    }, [placeholder]);

    return (
      <div
        ref={editorRef}
        className={`chat-composer-input${disabled ? ' is-disabled' : ''}`}
        contentEditable={disabled ? 'false' : 'true'}
        role="textbox"
        aria-multiline="true"
        aria-label="Message composer"
        data-placeholder={placeholder}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            onSubmit();
          }
        }}
      />
    );
  },
);
