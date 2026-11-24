import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Standard tailwind class merge helper (clsx + tailwind-merge). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
