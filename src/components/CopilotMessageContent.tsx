type MessageSegment =
  | { type: 'text'; content: string }
  | { type: 'sql'; content: string };

const SQL_FENCE_PATTERN = /```(?:sql)?\s*([\s\S]*?)```/gi;

function parseMessageSegments(content: string): MessageSegment[] {
  const segments: MessageSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  SQL_FENCE_PATTERN.lastIndex = 0;
  while ((match = SQL_FENCE_PATTERN.exec(content)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', content: content.slice(lastIndex, match.index) });
    }

    const sql = match[1]?.trim();
    if (sql) {
      segments.push({ type: 'sql', content: sql });
    }

    lastIndex = SQL_FENCE_PATTERN.lastIndex;
  }

  if (lastIndex < content.length) {
    segments.push({ type: 'text', content: content.slice(lastIndex) });
  }

  return segments.length > 0 ? segments : [{ type: 'text', content }];
}

type CopilotMessageContentProps = {
  content: string;
};

export function CopilotMessageContent({ content }: CopilotMessageContentProps) {
  const segments = parseMessageSegments(content);

  return (
    <div className="space-y-2">
      {segments.map((segment, index) => {
        if (segment.type === 'sql') {
          return (
            <pre
              key={`sql-${index}`}
              className="max-w-full overflow-x-auto rounded-lg border border-slate-800/80 bg-[#0d1117] px-3 py-2.5 font-mono text-[11px] leading-relaxed whitespace-pre text-slate-100 shadow-inner"
            >
              <code className="block min-w-max">{segment.content}</code>
            </pre>
          );
        }

        const text = segment.content.trimEnd();
        if (!text) {
          return null;
        }

        return (
          <p key={`text-${index}`} className="whitespace-pre-wrap break-words">
            {text}
          </p>
        );
      })}
    </div>
  );
}
