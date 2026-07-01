/**
 * Shared clipboard state to coordinate between:
 * - copyCommand (store): marks text as "already counted" when we write to clipboard
 * - clipboard monitor (App.tsx): skips already-counted text to avoid double count
 *
 * This ensures:
 * - Click copy → +1 (from copyCommand), monitor skips (already known)
 * - Manual Ctrl+C from other apps → monitor detects new text → +1
 */
let lastKnownText = "";

export function getLastKnownText(): string {
  return lastKnownText;
}

export function setLastKnownText(text: string): void {
  lastKnownText = text;
}
