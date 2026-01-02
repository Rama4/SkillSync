import {clsx, type ClassValue} from 'clsx';
import {twMerge} from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Parse markdown content to plain text preview
export function getMarkdownPreview(content: string) {
  const plainText = content.replace(/[#*`_[\]]/g, '').trim();
  return plainText.length > 100 ? plainText.slice(0, 100) + '...' : plainText;
}
