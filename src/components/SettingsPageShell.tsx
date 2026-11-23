import type { ReactNode } from 'react';

interface SettingsPageShellProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  actions?: ReactNode;
}

export function SettingsPageShell({
  title,
  subtitle,
  children,
  actions,
}: SettingsPageShellProps) {
  return (
    <div className="page-shell is-tight-page">
      <header
        className={
          actions ? 'page-header page-header-with-actions' : 'page-header'
        }
      >
        <div>
          <h1>{title}</h1>
          <p className="page-subtitle">{subtitle}</p>
        </div>
        {actions}
      </header>
      {children}
    </div>
  );
}
