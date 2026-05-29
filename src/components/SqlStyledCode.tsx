type TokenKind = 'keyword' | 'comment' | 'string' | 'function' | 'punctuation' | 'plain';

type Token = { kind: TokenKind; text: string };

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
      if (
        ['SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'INNER', 'JOIN', 'ON', 'AS', 'NULL'].includes(
          upper,
        )
      ) {
        tokens.push({ kind: 'keyword', text: word });
      } else if (['DATEADD', 'GETDATE'].includes(upper)) {
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

type SqlStyledCodeProps = {
  sql: string;
  className?: string;
};

export function SqlStyledCode({ sql, className = '' }: SqlStyledCodeProps) {
  const lines = sql.split('\n');

  return (
    <pre
      className={`overflow-auto font-mono text-xs leading-relaxed sm:text-sm ${className}`}
    >
      <code>
        {lines.map((line, lineIndex) => (
          <div key={`${lineIndex}-${line.slice(0, 12)}`} className="table-row">
            <span
              className="table-cell select-none pr-4 text-right text-[10px] text-slate-600 sm:text-xs"
              aria-hidden
            >
              {lineIndex + 1}
            </span>
            <span className="table-cell whitespace-pre">
              {tokenizeSqlLine(line).map((token, tokenIndex) => (
                <span key={tokenIndex} className={tokenClass[token.kind]}>
                  {token.text}
                </span>
              ))}
              {line.length === 0 ? '\u00a0' : null}
            </span>
          </div>
        ))}
      </code>
    </pre>
  );
}
