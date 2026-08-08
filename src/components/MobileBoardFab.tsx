import { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useBoardMobileShell } from '../context/BoardMobileShellContext';
import { useChat } from '../context/ChatContext';
import { useTheme } from '../context/ThemeContext';
import { SHELL_MOBILE_QUERY, useMediaQuery } from '../hooks/useMediaQuery';
import {
  MobileQuickCreateSheet,
} from './MobileQuickCreateSheet';
import { BoardStatusTabs } from './BoardStatusTabs';

export function MobileBoardFab() {
  const isMobileShell = useMediaQuery(SHELL_MOBILE_QUERY);
  const location = useLocation();
  const isBoardPage = location.pathname === '/board';
  const { logout, isAdmin } = useAuth();
  const { setChatOpen } = useChat();
  const { toggleTheme } = useTheme();
  const { actions, statusTabs } = useBoardMobileShell();
  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [ragMenuOpen, setRagMenuOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const isRagSettingsPage = location.pathname.startsWith('/settings/rag');

  useEffect(() => {
    if (!menuOpen) {
      setSettingsOpen(false);
      setRagMenuOpen(false);
    }
  }, [menuOpen]);

  useEffect(() => {
    if (location.pathname.startsWith('/settings/rag')) {
      setRagMenuOpen(true);
    }
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        if (settingsOpen) {
          setSettingsOpen(false);
          return;
        }
        setMenuOpen(false);
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen, settingsOpen]);

  if (!isMobileShell) {
    return null;
  }

  return (
    <>
      <div
        className={`mobile-bottom-app-bar${statusTabs ? ' has-status-tabs' : ''}`}
        aria-hidden="false"
      >
        <div className="mobile-bottom-app-bar-surface">
          {statusTabs ? (
            <BoardStatusTabs
              columns={statusTabs.columns}
              activeStatus={statusTabs.activeStatus}
              counts={statusTabs.counts}
              onChange={statusTabs.onChange}
            />
          ) : null}
        </div>
        <div
          ref={rootRef}
          className={`mobile-board-fab${menuOpen ? ' is-open' : ''}`}
        >
          {menuOpen ? (
            <div className="mobile-board-fab-menu" role="menu">
              {settingsOpen ? (
                <>
                  <button
                    type="button"
                    role="menuitem"
                    className="mobile-board-fab-menu-item mobile-board-fab-menu-back"
                    onClick={() => setSettingsOpen(false)}
                  >
                    ← Back
                  </button>
                  <p className="mobile-board-fab-menu-category">AI</p>
                  <NavLink
                    to="/settings/chatbot"
                    end
                    role="menuitem"
                    className={({ isActive }) =>
                      `mobile-board-fab-menu-item${isActive ? ' is-active' : ''}`
                    }
                    onClick={() => setMenuOpen(false)}
                  >
                    Chatbot
                  </NavLink>
                  <NavLink
                    to="/settings/chatbot/testing"
                    role="menuitem"
                    className={({ isActive }) =>
                      `mobile-board-fab-menu-item mobile-board-fab-menu-subitem${
                        isActive ? ' is-active' : ''
                      }`
                    }
                    onClick={() => setMenuOpen(false)}
                  >
                    Testing
                  </NavLink>
                  <NavLink
                    to="/settings/mcp-tools"
                    role="menuitem"
                    className={({ isActive }) =>
                      `mobile-board-fab-menu-item${isActive ? ' is-active' : ''}`
                    }
                    onClick={() => setMenuOpen(false)}
                  >
                    MCP Tools
                  </NavLink>
                  <p className="mobile-board-fab-menu-category">RAG</p>
                  <button
                    type="button"
                    role="menuitem"
                    className={`mobile-board-fab-menu-item${
                      ragMenuOpen || isRagSettingsPage ? ' is-active' : ''
                    }`}
                    aria-expanded={ragMenuOpen}
                    onClick={() => setRagMenuOpen((open) => !open)}
                  >
                    RAG {ragMenuOpen ? '▾' : '▸'}
                  </button>
                  {ragMenuOpen ? (
                    <>
                      <NavLink
                        to="/settings/rag/settings"
                        role="menuitem"
                        className={({ isActive }) =>
                          `mobile-board-fab-menu-item mobile-board-fab-menu-subitem${
                            isActive ? ' is-active' : ''
                          }`
                        }
                        onClick={() => setMenuOpen(false)}
                      >
                        Settings
                      </NavLink>
                      <NavLink
                        to="/settings/rag/chunks"
                        role="menuitem"
                        className={({ isActive }) =>
                          `mobile-board-fab-menu-item mobile-board-fab-menu-subitem${
                            isActive ? ' is-active' : ''
                          }`
                        }
                        onClick={() => setMenuOpen(false)}
                      >
                        Chunks
                      </NavLink>
                      <NavLink
                        to="/settings/rag/testing"
                        role="menuitem"
                        className={({ isActive }) =>
                          `mobile-board-fab-menu-item mobile-board-fab-menu-subitem${
                            isActive ? ' is-active' : ''
                          }`
                        }
                        onClick={() => setMenuOpen(false)}
                      >
                        Testing
                      </NavLink>
                    </>
                  ) : null}
                </>
              ) : (
                <>
                  {isBoardPage && actions?.openFilters ? (
                    <button
                      type="button"
                      role="menuitem"
                      className="mobile-board-fab-menu-item"
                      onClick={() => {
                        setMenuOpen(false);
                        actions.openFilters();
                      }}
                    >
                      Filter
                    </button>
                  ) : null}
                  {actions ? (
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
                  ) : null}
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
                  <button
                    type="button"
                    role="menuitem"
                    className="mobile-board-fab-menu-item"
                    onClick={() => {
                      toggleTheme();
                      setMenuOpen(false);
                    }}
                  >
                    Theme
                  </button>
                  {isAdmin ? (
                    <button
                      type="button"
                      role="menuitem"
                      className="mobile-board-fab-menu-item"
                      onClick={() => setSettingsOpen(true)}
                    >
                      Settings
                    </button>
                  ) : null}
                  <button
                    type="button"
                    role="menuitem"
                    className="mobile-board-fab-menu-item mobile-board-fab-menu-danger"
                    onClick={() => {
                      setMenuOpen(false);
                      logout();
                    }}
                  >
                    Logout
                  </button>
                </>
              )}
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
      </div>

      {actions ? (
        <MobileQuickCreateSheet
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onCreated={actions.onCreated}
          scope={actions.scope}
        />
      ) : null}
    </>
  );
}
