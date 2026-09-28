/** Utilities for generating and validating meeting room IDs. */

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Crockford-ish, no ambiguous chars.
const GROUP_LEN = 4;

/**
 * Generate a cryptographically random room ID like "AB7K-XP29".
 * Uses Web Crypto (crypto.getRandomValues) with a rejection-sampling loop to
 * avoid modulo bias.
 */
export function generateRoomId(): string {
  const total = GROUP_LEN * 2;
  const chars: string[] = [];
  const max = 256 - (256 % ALPHABET.length);
  const buf = new Uint8Array(1);
  while (chars.length < total) {
    crypto.getRandomValues(buf);
    const v = buf[0];
    if (v >= max) continue; // reject to keep distribution uniform
    chars.push(ALPHABET[v % ALPHABET.length]);
  }
  return `${chars.slice(0, GROUP_LEN).join('')}-${chars.slice(GROUP_LEN).join('')}`;
}

const ROOM_RE = /^[A-Z0-9]{4}-[A-Z0-9]{4}$/;

export function isValidRoomId(roomId: string): boolean {
  return ROOM_RE.test(roomId);
}

/**
 * Accept either a raw room ID ("AB7K-XP29") or a full URL containing
 * "/meeting/AB7K-XP29" and return the normalized room ID, or null if invalid.
 */
export function parseRoomInput(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Try to extract from a URL path first.
  const urlMatch = trimmed.match(/\/meeting\/([A-Za-z0-9-]+)/);
  const candidate = (urlMatch ? urlMatch[1] : trimmed).toUpperCase();

  return isValidRoomId(candidate) ? candidate : null;
}
