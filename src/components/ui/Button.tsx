import type { ButtonHTMLAttributes } from 'react';
import { theme } from './theme';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'link';
}

export function Button({ variant = 'primary', style, ...props }: ButtonProps) {
  const base = variant === 'primary' ? theme.btn : variant === 'secondary' ? theme.btnSecondary : theme.link;
  return <button style={{ ...base, ...style }} {...props} />;
}
