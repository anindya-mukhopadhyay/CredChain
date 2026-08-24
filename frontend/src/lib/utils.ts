import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return "—";
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateString;
  }
}

export function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return "—";
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateString;
  }
}

export function truncateHash(hash: string | null | undefined, head = 6, tail = 4): string {
  if (!hash) return "—";
  if (hash.length <= head + tail + 2) return hash;
  return `${hash.slice(0, head)}...${hash.slice(-tail)}`;
}

export function extractCredentialId(input: string | null | undefined): string {
  if (!input) return "";
  let clean = input.trim();
  try {
    clean = decodeURIComponent(clean);
  } catch {
    // Keep as is
  }

  // Handle repeated URL encoding (e.g. http%3A%2F%2F...)
  if (clean.includes("%3A") || clean.includes("%2F")) {
    try {
      clean = decodeURIComponent(clean);
    } catch {
      // Keep as is
    }
  }

  // If input contains a URL or path (e.g. http://localhost:3000/verify/1949feb2... or /verify/1949feb2...)
  if (clean.includes("/") || clean.startsWith("http://") || clean.startsWith("https://")) {
    const withoutQuery = clean.split(/[?#]/)[0];
    const segments = withoutQuery.split("/").filter(Boolean);
    if (segments.length > 0) {
      return segments[segments.length - 1].trim();
    }
  }

  return clean;
}
