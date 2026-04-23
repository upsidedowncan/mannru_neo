import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateEmojiCode(length: number = 5): string {
  const emojis = [
    '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '😊',
    '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '🥲', '😋',
    '�', '�', '🤪', '�', '🤑', '🤗', '🤭', '🫢', '🫣', '🤫',
    '🤔', '🫡', '😐', '😑', '😶', '😏', '�', '�', '😬', '😮',
    '😯', '😲', '😳', '🥺', '😦', '😧', '😨', '😰', '😥', '😢',
  ];
  
  const code: string[] = [];
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * emojis.length);
    code.push(emojis[randomIndex]);
  }
  
  return code.join('');
}

export function validateEmojiCode(input: string): boolean {
  const validEmojis = [
    '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '😊',
    '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '🥲', '😋',
    '�', '�', '🤪', '�', '🤑', '🤗', '🤭', '🫢', '🫣', '🤫',
    '🤔', '🫡', '😐', '😑', '😶', '😏', '�', '�', '😬', '😮',
    '😯', '😲', '😳', '🥺', '😦', '😧', '😨', '😰', '😥', '😢',
  ];
  
  for (const char of input) {
    if (!validEmojis.includes(char)) {
      return false;
    }
  }
  
  return input.length >= 4 && input.length <= 8;
}
