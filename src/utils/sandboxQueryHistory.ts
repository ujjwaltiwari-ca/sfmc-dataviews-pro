const HISTORY_STORAGE_KEY = 'sfmc-sandbox-query-history';
const MAX_HISTORY_ENTRIES = 20;

export type SandboxQuerySnapshot = {
  id: string;
  timestamp: number;
  sql: string;
  tableNames: string[];
};

function createSnapshotId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function readSandboxQueryHistory(): SandboxQuerySnapshot[] {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as SandboxQuerySnapshot[];
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(
      (entry) =>
        typeof entry.id === 'string' &&
        typeof entry.timestamp === 'number' &&
        typeof entry.sql === 'string' &&
        Array.isArray(entry.tableNames),
    );
  } catch {
    return [];
  }
}

function writeSandboxQueryHistory(entries: SandboxQuerySnapshot[]): void {
  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_HISTORY_ENTRIES)));
  } catch {
    /* ignore */
  }
}

export function appendSandboxQuerySnapshot(
  sql: string,
  tableNames: string[],
): SandboxQuerySnapshot | null {
  const trimmed = sql.trim();
  if (!trimmed || trimmed.startsWith('-- Select')) {
    return null;
  }

  const history = readSandboxQueryHistory();
  const latest = history[0];
  if (latest && latest.sql === trimmed) {
    return null;
  }

  const snapshot: SandboxQuerySnapshot = {
    id: createSnapshotId(),
    timestamp: Date.now(),
    sql: trimmed,
    tableNames: [...tableNames],
  };

  writeSandboxQueryHistory([snapshot, ...history]);
  return snapshot;
}

export function deleteSandboxQuerySnapshot(id: string): void {
  writeSandboxQueryHistory(readSandboxQueryHistory().filter((entry) => entry.id !== id));
}

export function formatHistoryPreview(sql: string, maxLength = 80): string {
  const oneLine = sql.replace(/\s+/g, ' ').trim();
  return oneLine.length > maxLength ? `${oneLine.slice(0, maxLength)}…` : oneLine;
}

export function formatHistoryTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
