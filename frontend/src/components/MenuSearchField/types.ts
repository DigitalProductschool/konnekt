import type { KeyboardEvent } from 'react';

export interface MenuSearchFieldProps {
  id: string;
  placeholder: string;
  value: string;
  controls: string;
  onChange: (text: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
}
