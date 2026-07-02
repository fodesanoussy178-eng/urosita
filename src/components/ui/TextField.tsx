import type { InputHTMLAttributes } from 'react';
import { theme } from './theme';

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export function TextField({ label, id, ...props }: TextFieldProps) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-');
  return (
    <>
      <label style={theme.label} htmlFor={inputId}>
        {label}
      </label>
      <input id={inputId} style={theme.input} {...props} />
    </>
  );
}
