import type { ReactNode } from 'react';

export function ErrorAlert({
  children,
  code,
}: {
  children: ReactNode;
  code?: string;
}) {
  if (!children) return null;
  return (
    <div className="alert alert-error" role="alert" data-error-code={code}>
      {children}
    </div>
  );
}
