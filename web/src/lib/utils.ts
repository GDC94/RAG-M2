// Adapted from beUI (https://beui.dev) — MIT License, Copyright (c) 2026 Saurabh Chauhan. See web/THIRD_PARTY_NOTICES.md.
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
