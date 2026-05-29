import { SQL_CORE_KEYWORDS } from '../utils/sqlGenerator';

type TokenKind = 'keyword' | 'comment' | 'string' | 'function' | 'punctuation' | 'plain';

type Token = { kind: TokenKind; text: string };

const KEYWORDS = new Set<string>(
  SQL_CORE_KEYWORDS.filter((keyword) => keyword !== 'DATEADD' && keyword !== 'GETDATE'),
);

const FUNCTIONS = new Set(['DATEADD', 'GETDATE']);

function tokenizeSqlLine(line: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;

  while (index < line.length) {
    if (line.startsWith('--', index)) {
      tokens.push({ kind: 'comment', text: line.slice(index) });
      break;
    }

    if (line[index] === "'") {
      let end = index + 1;
      while (end < line.length && line[end] !== "'") {
        end += 1;
      }
      tokens.push({ kind: 'string', text: line.slice(index, end + 1) });
      index = end + 1;
      continue;
    }

    const rest = line.slice(index);
    const wordMatch = /^[A-Za-z_][\w]*/.exec(rest);
    if (wordMatch) {
      const word = wordMatch[0];
      const upper = word.toUpperCase();
      if (KEYWORDS.has(upper)) {
        tokens.push({ kind: 'keyword', text: word });
      } else if (FUNCTIONS.has(upper)) {
        tokens.push({ kind: 'function', text: word });
      } else {
        tokens.push({ kind: 'plain', text: word });
      }
      index += word.length;
      continue;
    }

    if (/^[(),.=<>]/.test(rest)) {
      tokens.push({ kind: 'punctuation', text: rest[0] });
      index += 1;
      continue;
    }

    const spaceMatch = /^\s+/.exec(rest);
    if (spaceMatch) {
      tokens.push({ kind: 'plain', text: spaceMatch[0] });
      index += spaceMatch[0].length;
      continue;
    }

    tokens.push({ kind: 'plain', text: rest[0] });
    index += 1;
  }

  return tokens;
}

const tokenClass: Record<TokenKind, string> = {
  keyword: 'text-violet-300 font-semibold',
  comment: 'text-slate-500 italic',
  string: 'text-amber-300',
  function: 'text-cyan-300',
  punctuation: 'text-slate-400',
  plain: 'text-emerald-100/95',
};

function CodeLine({ line }: { line: string }) {
  if (line.length === 0) {
    return <span className="text-emerald-100/40">{'\u00a0'}</span>;
  }

  return (
    <>
      {tokenizeSqlLine(line).map((token, tokenIndex) => (
        <span key={tokenIndex} className={tokenClass[token.kind]}>
          {token.text}
        </span>
      ))}
    </>
  );
}

type SqlStyledCodeProps = {
  sql: string;
  className?: string;
};

export function SqlStyledCode({ sql, className = '' }: SqlStyledCodeProps) {
  const lines = sql.split('\n');
  const gutterWidth = Math.max(2, String(lines.length).length);

  return (
    <div
      className={`flex min-h-0 w-full font-mono text-xs leading-[1.65] sm:text-sm ${className}`}
    >
      <div
        className="shrink-0 select-none border-r border-slate-800/80 bg-slate-950 py-0.5 pr-3 text-right text-slate-600"
        aria-hidden
      >
        {lines.map((_, lineIndex) => (
          <div
            key={`gutter-${lineIndex}`}
            className="tabular-nums"
            style={{ minWidth: `${gutterWidth}ch` }}
          >
            {lineIndex + 1}
          </div>
        ))}
      </div>

      <pre className="min-w-0 flex-1 py-0.5 pl-4">
        <code className="block whitespace-pre text-slate-100">
          {lines.map((line, lineIndex) => (
            <div key={`code-${lineIndex}`} className="whitespace-pre">
              <CodeLine line={line} />
            </div>
          ))}
        </code>
      </pre>
    </div>
  );
}
