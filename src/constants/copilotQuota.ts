export const DAILY_COPILOT_QUERY_LIMIT = 5;

export const DAILY_COPILOT_LIMIT_MESSAGE =
  '⚠️ Daily limit reached. You have used your 5 free AI queries for today. Please return tomorrow!';

export function isDailyCopilotLimitMessage(content: string): boolean {
  const normalized = content.trim().toLowerCase();
  return (
    normalized.includes('daily limit reached') ||
    normalized.includes('5 free ai queries')
  );
}

export function startOfUtcDayIso(): string {
  const now = new Date();
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0),
  );
  return start.toISOString();
}
