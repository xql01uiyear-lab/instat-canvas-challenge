// The active space id, so a reload reopens the same canvas instead of creating a new one.
const SPACE_KEY = 'canvas.spaceId';

export function getSpaceId(): string | null {
  try {
    return localStorage.getItem(SPACE_KEY);
  } catch {
    return null;
  }
}

export function setSpaceId(id: string): void {
  try {
    localStorage.setItem(SPACE_KEY, id);
  } catch {
    /* ignore unavailable storage */
  }
}

export function clearSpaceId(): void {
  try {
    localStorage.removeItem(SPACE_KEY);
  } catch {
    /* ignore */
  }
}
