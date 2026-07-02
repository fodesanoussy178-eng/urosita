import { theme } from './theme';

export function ErrorText({ children }: { children: string }) {
  return <p style={theme.err}>{children}</p>;
}

export function InfoText({ children }: { children: string }) {
  return <p style={theme.ok}>{children}</p>;
}
