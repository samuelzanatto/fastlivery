// Re-export everything from the new utils folder + legacy cn function
export * from './utils/index'
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
} 
