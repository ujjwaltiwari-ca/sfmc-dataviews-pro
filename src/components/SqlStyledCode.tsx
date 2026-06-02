import { SQL_CORE_KEYWORDS } from '../utils/sqlGenerator';
import {
  SYNTAX_COMMENT_EDITOR,
  SYNTAX_COMMENT_LIGHT,
  SYNTAX_IDENTIFIER_EDITOR,
  SYNTAX_IDENTIFIER_LIGHT,
  SYNTAX_KEYWORD_EDITOR,
  SYNTAX_KEYWORD_LIGHT,
  SYNTAX_PUNCTUATION_EDITOR,
  SYNTAX_PUNCTUATION_LIGHT,
  IDE_DARK_EDITOR_ROOT,
  MONO_EDITOR_TYPO,
  getIdentifierSyntaxClass,
  type SqlSyntaxTheme,
} from '../utils/typeSyntax';

type TokenKind =
  | 'keyword'
  | 'comment'
  | 'string'
  | 'function'
  | 'number'
  | 'identifier'
  | 'punctuation'
  | 'plain';

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
    const numberMatch = /^\d+(?:\.\d+)?/.exec(rest);
    if (numberMatch) {
      tokens.push({ kind: 'number', text: numberMatch[0] });
      index += numberMatch[0].length;
      continue;
    }

    const wordMatch = /^[A-Za-z_][\w]*/.exec(rest);
    if (wordMatch) {
      const word = wordMatch[0];
      const upper = word.toUpperCase();
      if (KEYWORDS.has(upper) || FUNCTIONS.has(upper)) {
        tokens.push({ kind: 'keyword', text: word });
      } else {
        tokens.push({ kind: 'identifier', text: word });
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

function buildTokenClass(theme: SqlSyntaxTheme): Record<TokenKind, string> {
  if (theme === 'editor-dark') {
    const identifier = SYNTAX_IDENTIFIER_EDITOR;
    return {
      keyword: SYNTAX_KEYWORD_EDITOR,
      comment: SYNTAX_COMMENT_EDITOR,
      string: identifier,
      function: SYNTAX_KEYWORD_EDITOR,
      number: identifier,
      identifier,
      punctuation: SYNTAX_PUNCTUATION_EDITOR,
      plain: identifier,
    };
  }

  if (theme === 'editor-light') {
    const identifier = SYNTAX_IDENTIFIER_LIGHT;
    return {
      keyword: SYNTAX_KEYWORD_LIGHT,
      comment: SYNTAX_COMMENT_LIGHT,
      string: identifier,
      function: SYNTAX_KEYWORD_LIGHT,
      number: identifier,
      identifier,
      punctuation: SYNTAX_PUNCTUATION_LIGHT,
      plain: identifier,
    };
  }

  return {
    keyword: SYNTAX_KEYWORD_LIGHT,
    comment: SYNTAX_COMMENT_LIGHT,
    string: SYNTAX_IDENTIFIER_LIGHT,
    function: SYNTAX_KEYWORD_LIGHT,
    number: SYNTAX_IDENTIFIER_LIGHT,
    identifier: SYNTAX_IDENTIFIER_LIGHT,
    punctuation: SYNTAX_PUNCTUATION_LIGHT,
    plain: SYNTAX_IDENTIFIER_LIGHT,
  };
}

function CodeLine({ line, theme }: { line: string; theme: SqlSyntaxTheme }) {
  const tokenClass = buildTokenClass(theme);
  const useUniformIdentifiers = theme === 'editor-dark' || theme === 'editor-light';

  if (line.length === 0) {
    return (
      <span className={theme === 'editor-dark' ? 'text-slate-600' : 'text-slate-400'}>
        {'\u00a0'}
      </span>
    );
  }

  return (
    <>
      {tokenizeSqlLine(line).map((token, tokenIndex) => (
        <span
          key={tokenIndex}
          className={
            token.kind === 'identifier' && !useUniformIdentifiers
              ? getIdentifierSyntaxClass(token.text, theme)
              : tokenClass[token.kind]
          }
        >
          {token.text}
        </span>
      ))}
    </>
  );
}

type SqlStyledCodeProps = {
  sql: string;
  className?: string;
  showGutter?: boolean;
  theme?: SqlSyntaxTheme;
};

export function SqlStyledCode({
  sql,
  className = '',
  showGutter = true,
  theme = 'editor-dark',
}: SqlStyledCodeProps) {
  const lines = sql.split('\n');
  const gutterWidth = Math.max(2, String(lines.length).length);
  const isDarkIde = theme === 'editor-dark';

  const editorTypo = isDarkIde ? IDE_DARK_EDITOR_ROOT : MONO_EDITOR_TYPO;

  return (
    <div className={`flex min-h-0 w-max min-w-full ${editorTypo} ${className}`}>
      {showGutter && (
        <div
          className={`shrink-0 select-none border-r border-slate-800/80 py-0.5 pr-3 text-right tabular-nums ${
            isDarkIde ? 'bg-[#0d1117] text-slate-600' : 'bg-slate-50 text-slate-400'
          }`}
          aria-hidden
        >
          {lines.map((_, lineIndex) => (
            <div key={`gutter-${lineIndex}`} style={{ minWidth: `${gutterWidth}ch` }}>
              {lineIndex + 1}
            </div>
          ))}
        </div>
      )}

      <pre className={`min-w-0 flex-1 py-0.5 ${showGutter ? 'pl-4' : 'px-0'} ${editorTypo}`}>
        <code className={`block whitespace-pre ${editorTypo}`}>
          {lines.map((line, lineIndex) => (
            <div key={`code-${lineIndex}`} className="whitespace-pre">
              <CodeLine line={line} theme={theme} />
            </div>
          ))}
        </code>
      </pre>
    </div>
  );
}

/** Compact inline SQL snippet for sidebar labels and utility previews. */
export function SqlSyntaxSnippet({ text, className = '' }: { text: string; className?: string }) {
  return (
    <span className={`block leading-snug ${className}`}>
      <SqlStyledCode
        sql={text}
        showGutter={false}
        theme="editor-light"
        className="text-[10px] leading-snug sm:text-[10px]"
      />
    </span>
  );
}

/** Sidebar field expression with card-aligned identifier syntax coloring. */
export function FieldExpressionLabel({
  expression,
  className = '',
}: {
  expression: string;
  className?: string;
}) {
  const fieldToken = expression.split('.').pop()?.trim().split(/\s+/)[0] ?? expression;

  return (
    <span
      className={`truncate font-mono text-[10px] font-semibold tracking-tight ${getIdentifierSyntaxClass(fieldToken, 'card')} ${className}`}
      title={expression}
    >
      {expression}
    </span>
  );
}
