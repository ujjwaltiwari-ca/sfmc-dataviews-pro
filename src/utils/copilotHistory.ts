const STORAGE_KEY_PREFIX = 'sfmc-copilot-history-v1:';
const MAX_STORED_MESSAGES = 24;

export type StoredCopilotMessage = {
  role: 'user' | 'assistant';
  content: string;
};

function storageKey(userId: string): string {
  return `${STORAGE_KEY_PREFIX}${userId}`;
}

export function loadCopilotHistory(userId: string): StoredCopilotMessage[] {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) {
      return [];
    }

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      (entry): entry is StoredCopilotMessage =>
        typeof entry === 'object' &&
        entry !== null &&
        (entry.role === 'user' || entry.role === 'assistant') &&
        typeof entry.content === 'string' &&
        entry.content.trim().length > 0,
    );
  } catch {
    return [];
  }
}

export function saveCopilotHistory(userId: string, messages: StoredCopilotMessage[]): void {
  try {
    const trimmed = messages
      .filter((message) => message.content.trim().length > 0)
      .slice(-MAX_STORED_MESSAGES);

    if (trimmed.length === 0) {
      localStorage.removeItem(storageKey(userId));
      return;
    }

    localStorage.setItem(storageKey(userId), JSON.stringify(trimmed));
  } catch {
    /* ignore quota / privacy mode */
  }
}

export function clearCopilotHistory(userId: string): void {
  try {
    localStorage.removeItem(storageKey(userId));
  } catch {
    /* ignore */
  }
}
