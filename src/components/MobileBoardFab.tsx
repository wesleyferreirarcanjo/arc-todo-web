import { useEffect, useRef, useState } from 'react';
import { useChat } from '../context/ChatContext';
import { SHELL_MOBILE_QUERY, useMediaQuery } from '../hooks/useMediaQuery';
import {
  MobileQuickCreateSheet,
  type MobileQuickCreateScope,
} from './MobileQuickCreateSheet';

interface MobileBoardFabProps {
  onCreated: () => Promise<void>;
  scope?: MobileQuickCreateScope;
}

export function MobileBoardFab({ onCreated, scope }: MobileBoardFabProps) {
  const isMobileShell = useMediaQuery(SHELL_MOBILE_QUERY);
  const { setChatOpen } = useChat();
  const [menuOpen, setMenuOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setMenuOpen(false);
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

  if (!isMobileShell) {
    return null;
  }

  return (
    <>
      <div
        ref={rootRef}
        className={`mobile-board-fab${menuOpen ? ' is-open' : ''}`}
      >
        {menuOpen ? (
          <div className="mobile-board-fab-menu" role="menu">
            <button
              type="button"
              role="menuitem"
              className="mobile-board-fab-menu-item"
              onClick={() => {
                setMenuOpen(false);
                setCreateOpen(true);
              }}
            >
              New task
            </button>
            <button
              type="button"
              role="menuitem"
              className="mobile-board-fab-menu-item"
              onClick={() => {
                setMenuOpen(false);
                setChatOpen(true);
              }}
            >
              Chatbot
            </button>
          </div>
        ) : null}

        <button
          type="button"
          className="mobile-board-fab-button"
          aria-label={menuOpen ? 'Close actions' : 'Open actions'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className="mobile-board-fab-icon" aria-hidden="true">
            {menuOpen ? '×' : '+'}
          </span>
        </button>
      </div>

      <MobileQuickCreateSheet
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={onCreated}
        scope={scope}
      />
    </>
  );
}
