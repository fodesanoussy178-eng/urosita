import type { ReactNode } from 'react';
import { theme } from './theme';

export function PageShell({ children }: { children: ReactNode }) {
  return <div style={theme.page}>{children}</div>;
}

export function Centered({ children }: { children: ReactNode }) {
  return (
    <PageShell>
      <div style={{ ...theme.card, marginTop: 60, textAlign: 'center' }}>{children}</div>
    </PageShell>
  );
}
