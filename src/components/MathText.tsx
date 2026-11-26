import React, { useEffect, useState } from 'react';
import { normalizeMathFormulasForKatex } from '../utils/examDocumentParser';

declare global {
  interface Window {
    katex?: {
      renderToString: (tex: string, options?: { displayMode?: boolean; throwOnError?: boolean }) => string;
    };
    renderMathInElement?: (element: HTMLElement, options?: unknown) => void;
  }
}

interface MathTextProps {
  text: string;
  className?: string;
  block?: boolean;
}

interface Token {
  type: 'text' | 'inline-math' | 'block-math';
  content: string;
}

function tokenizeMath(input: string): Token[] {
  if (!input) return [];
  const tokens: Token[] = [];
  // Match $$...$$, \[...\], \(...\), and $...$ (including multi-character LaTeX commands like \text{...})
  const regex = /(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\)|\$(?:\\[\s\S]|[^$\\])+\$)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(input)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({
        type: 'text',
        content: input.slice(lastIndex, match.index),
      });
    }

    const raw = match[0];
    if ((raw.startsWith('$$') && raw.endsWith('$$')) || (raw.startsWith('\\[') && raw.endsWith('\\]'))) {
      tokens.push({
        type: 'block-math',
        content: raw.slice(2, -2).trim(),
      });
    } else if (raw.startsWith('\\(') && raw.endsWith('\\)')) {
      tokens.push({
        type: 'inline-math',
        content: raw.slice(2, -2).trim(),
      });
    } else if (raw.startsWith('$') && raw.endsWith('$')) {
      tokens.push({
        type: 'inline-math',
        content: raw.slice(1, -1).trim(),
      });
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < input.length) {
    tokens.push({
      type: 'text',
      content: input.slice(lastIndex),
    });
  }

  return tokens;
}

function renderFormattedPlainText(content: string): React.ReactNode {
  if (!content) return null;
  // Match _{...}, ^{...}, or adjacent/inline _subscript and ^superscript (e.g. p_1V_1 = p_2V_2, c_X, m_nhôm, T_cb, cm^3, 10^-5)
  const subSupRegex =
    /(\_\{([^{}]+)\}|\^\{([^{}]+)\}|([a-zA-Z0-9ĐđΔθ)\]])\_([0-9]+|[a-zA-ZÀ-ỹ]{1,12}(?![a-zA-Z0-9À-ỹ_]))|([a-zA-Z0-9ĐđΔθ)\]])\^([+-]?[0-9]+|[a-zA-Z]{1,4}(?![a-zA-Z0-9À-ỹ_])))/g;
  const parts: React.ReactNode[] = [];
  let lastIdx = 0;
  let m: RegExpExecArray | null;
  let keyCounter = 0;

  while ((m = subSupRegex.exec(content)) !== null) {
    if (m.index > lastIdx) {
      parts.push(content.slice(lastIdx, m.index));
    }
    if (m[2] !== undefined) {
      parts.push(<sub key={`sub-${keyCounter++}`}>{m[2]}</sub>);
    } else if (m[3] !== undefined) {
      parts.push(<sup key={`sup-${keyCounter++}`}>{m[3]}</sup>);
    } else if (m[4] !== undefined && m[5] !== undefined) {
      parts.push(
        <React.Fragment key={`idsub-${keyCounter++}`}>
          {m[4]}
          <sub>{m[5]}</sub>
        </React.Fragment>
      );
    } else if (m[6] !== undefined && m[7] !== undefined) {
      parts.push(
        <React.Fragment key={`idsup-${keyCounter++}`}>
          {m[6]}
          <sup>{m[7]}</sup>
        </React.Fragment>
      );
    }
    lastIdx = subSupRegex.lastIndex;
  }

  if (lastIdx < content.length) {
    parts.push(content.slice(lastIdx));
  }

  return parts.length > 0 ? parts : content;
}

/**
 * Normalize raw inline pipe-tables or flattened measurement tables in already-parsed strings
 * into @@TABLE_START@@...@@TABLE_END@@ so MathText renders them as a structured HTML table.
 */
function upgradeRawTablesInText(raw: string): string {
  if (!raw) return '';
  let text = raw;

  // 1. Convert multi-line pipe tables (e.g. "Lần đo | V (mL) | p (bar)\n1 | 80 | 1,00...")
  if (text.includes('|') && text.includes('\n')) {
    const lines = text.split(/\r?\n/);
    const outLines: string[] = [];
    let i = 0;
    while (i < lines.length) {
      if (lines[i].includes('|') && lines[i].split('|').map((c) => c.trim()).filter(Boolean).length >= 2) {
        const tableGroup: string[][] = [];
        while (i < lines.length && lines[i].includes('|')) {
          const cells = lines[i]
            .split('|')
            .map((c) => c.trim())
            .filter((c, idx, arr) => !(c === '' && (idx === 0 || idx === arr.length - 1)));
          if (cells.length >= 2) {
            // Skip pure markdown separator rows like |---|---|
            if (!cells.every((c) => /^[-:]+$/.test(c))) {
              tableGroup.push(cells);
            }
            i++;
          } else {
            break;
          }
        }
        if (tableGroup.length >= 2) {
          const encoded = tableGroup.map((r) => r.join('@@CELL@@')).join('@@ROW@@');
          outLines.push(`@@TABLE_START@@${encoded}@@TABLE_END@@`);
          continue;
        }
      }
      outLines.push(lines[i]);
      i++;
    }
    text = outLines.join('\n');
  }

  // 2. Convert multi-line 3+ space or tab-aligned data tables if still unencoded
  if (!text.includes('@@TABLE_START@@') && text.includes('\n')) {
    const lines = text.split(/\r?\n/);
    const outLines: string[] = [];
    let i = 0;
    while (i < lines.length) {
      const splitCols = (l: string) =>
        l
          .trim()
          .split(/\s{3,}|\t+/)
          .map((c) => c.trim())
          .filter(Boolean);
      const firstCols = splitCols(lines[i]);
      if (firstCols.length >= 2 && firstCols.every((c) => c.length <= 48)) {
        const tableGroup: string[][] = [firstCols];
        let j = i + 1;
        while (j < lines.length) {
          const nextCols = splitCols(lines[j]);
          if (
            nextCols.length >= 2 &&
            Math.abs(nextCols.length - firstCols.length) <= 1 &&
            nextCols.every((c) => c.length <= 48)
          ) {
            tableGroup.push(nextCols);
            j++;
          } else {
            break;
          }
        }
        const hasNumericRow = tableGroup
          .slice(1)
          .some((r) => r.some((c) => /^[+-]?\d+(?:[.,]\d+)?$/.test(c)));
        if (tableGroup.length >= 2 && hasNumericRow) {
          const encoded = tableGroup.map((r) => r.join('@@CELL@@')).join('@@ROW@@');
          outLines.push(`@@TABLE_START@@${encoded}@@TABLE_END@@`);
          i = j;
          continue;
        }
      }
      outLines.push(lines[i]);
      i++;
    }
    text = outLines.join('\n');
  }

  // 3. Recover flattened inline "Lần đo ... 1 <val> <val> 2 <val> <val> 3 <val> <val>..." table if newlines were collapsed
  if (!text.includes('@@TABLE_START@@') && /Lần\s+đo\b/i.test(text)) {
    const flatMatch = text.match(
      /^(.*?[:.])\s*(Lần\s+đo\b[\s\S]*?)\s+(1\s+[+-]?\d+(?:[.,]\d+)?(?:\s+[+-]?\d+(?:[.,]\d+)?)+(?:\s+2\s+[+-]?\d+(?:[.,]\d+)?(?:\s+[+-]?\d+(?:[.,]\d+)?)+)+)\s*$/i
    );
    if (flatMatch) {
      const intro = flatMatch[1].trim();
      const headerRaw = flatMatch[2].trim();
      const dataRaw = flatMatch[3].trim();
      const dataTokens = dataRaw.split(/\s+/);
      // Determine how many tokens per measurement row (starting with 1, then 2, then 3...)
      const idx2 = dataTokens.findIndex((t, idx) => idx >= 2 && t === '2');
      if (idx2 >= 2 && dataTokens.length % idx2 === 0) {
        const colCount = idx2;
        const rows: string[][] = [];
        for (let r = 0; r < dataTokens.length; r += colCount) {
          rows.push(dataTokens.slice(r, r + colCount));
        }
        // Split headerRaw into colCount headers
        let headerCols = headerRaw
          .split(/\s{2,}|\t+|\|/)
          .map((c) => c.trim())
          .filter(Boolean);
        if (headerCols.length !== colCount && colCount === 3) {
          const h3Match = headerRaw.match(/^(Lần\s+đo)\s+(.+?\([^)]+\))\s+(.+?\([^)]+\))$/i);
          if (h3Match) {
            headerCols = [h3Match[1].trim(), h3Match[2].trim(), h3Match[3].trim()];
          }
        }
        if (headerCols.length === colCount && rows.length >= 2) {
          const allRows = [headerCols, ...rows];
          const encoded = allRows.map((r) => r.join('@@CELL@@')).join('@@ROW@@');
          text = `${intro}\n@@TABLE_START@@${encoded}@@TABLE_END@@`;
        }
      }
    }
  }

  return text;
}

export const MathText: React.FC<MathTextProps> = ({ text, className = '', block = false }) => {
  const [katexReady, setKatexReady] = useState<boolean>(() => Boolean(window.katex));

  useEffect(() => {
    if (window.katex) {
      setKatexReady(true);
      return;
    }
    const timer = window.setInterval(() => {
      if (window.katex) {
        setKatexReady(true);
        window.clearInterval(timer);
      }
    }, 100);
    return () => window.clearInterval(timer);
  }, []);

  const renderMathSegment = (segmentText: string, keyPrefix: string): React.ReactNode => {
    const normalizedSegment = normalizeMathFormulasForKatex(segmentText);
    const tokens = tokenizeMath(normalizedSegment);
    return tokens.map((token, idx) => {
      const key = `${keyPrefix}-${idx}`;
      if (token.type === 'text') {
        return <React.Fragment key={key}>{renderFormattedPlainText(token.content)}</React.Fragment>;
      }

      const isDisplay = token.type === 'block-math';
      if (katexReady && window.katex) {
        try {
          const html = window.katex.renderToString(token.content, {
            displayMode: isDisplay,
            throwOnError: false,
          });
          return (
            <span
              key={key}
              className={
                isDisplay
                  ? 'block my-2 overflow-x-auto max-w-full'
                  : 'inline align-baseline mx-0.5 max-w-full break-words'
              }
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        } catch {
          return (
            <span key={key} className="inline align-baseline mx-0.5">
              {renderFormattedPlainText(
                token.content
                  .replace(/\\text\{([^{}]*)\}/g, '$1')
                  .replace(/\\times/g, '×')
                  .replace(/\\Rightarrow/g, '⇒')
              )}
            </span>
          );
        }
      }

      return (
        <span key={key} className="inline align-baseline mx-0.5">
          {renderFormattedPlainText(
            token.content
              .replace(/\\text\{([^{}]*)\}/g, '$1')
              .replace(/\\times/g, '×')
              .replace(/\\Rightarrow/g, '⇒')
          )}
        </span>
      );
    });
  };

  const processedText = upgradeRawTablesInText(text);
  const hasTable = processedText.includes('@@TABLE_START@@');
  const Wrapper = block || hasTable ? 'div' : 'span';

  if (!hasTable) {
    return <Wrapper className={className}>{renderMathSegment(processedText, 'm')}</Wrapper>;
  }

  // Split around @@TABLE_START@@...@@TABLE_END@@ blocks and render structured academic tables
  const tableRegex = /@@TABLE_START@@([\s\S]*?)@@TABLE_END@@/g;
  const blocks: React.ReactNode[] = [];
  let lastIdx = 0;
  let match: RegExpExecArray | null;
  let blkIdx = 0;

  while ((match = tableRegex.exec(processedText)) !== null) {
    if (match.index > lastIdx) {
      const beforeText = processedText.slice(lastIdx, match.index).trim();
      if (beforeText) {
        blocks.push(
          <span key={`txt-${blkIdx}`} className="block">
            {renderMathSegment(beforeText, `tb-${blkIdx}`)}
          </span>
        );
      }
    }

    const rawTablePayload = match[1];
    const rows = rawTablePayload
      .split('@@ROW@@')
      .map((r) => r.split('@@CELL@@').map((c) => c.trim()))
      .filter((r) => r.some(Boolean));

    if (rows.length > 0) {
      blocks.push(
        <div key={`tbl-${blkIdx}`} className="my-3 overflow-x-auto max-w-full">
          <table className="mx-auto border-collapse border border-slate-400 dark:border-slate-600 text-sm sm:text-base shadow-sm rounded-lg overflow-hidden min-w-[260px] sm:min-w-[440px]">
            <thead>
              <tr className="bg-[#1e3a5f] text-white">
                {rows[0].map((cell, cIdx) => (
                  <th
                    key={`th-${cIdx}`}
                    className="border border-slate-400 dark:border-slate-600 px-3 sm:px-5 py-2 text-center font-bold"
                  >
                    {renderMathSegment(cell, `th-${blkIdx}-${cIdx}`)}
                  </th>
                ))}
              </tr>
            </thead>
            {rows.length > 1 && (
              <tbody>
                {rows.slice(1).map((row, rIdx) => (
                  <tr
                    key={`tr-${rIdx}`}
                    className={
                      rIdx % 2 === 0
                        ? 'bg-white dark:bg-slate-900/90 text-slate-900 dark:text-slate-100'
                        : 'bg-slate-100/90 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100'
                    }
                  >
                    {row.map((cell, cIdx) => (
                      <td
                        key={`td-${rIdx}-${cIdx}`}
                        className="border border-slate-300 dark:border-slate-600 px-3 sm:px-5 py-1.5 text-center font-medium"
                      >
                        {renderMathSegment(cell, `td-${blkIdx}-${rIdx}-${cIdx}`)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            )}
          </table>
        </div>
      );
    }

    lastIdx = tableRegex.lastIndex;
    blkIdx++;
  }

  if (lastIdx < processedText.length) {
    const afterText = processedText.slice(lastIdx).trim();
    if (afterText) {
      blocks.push(
        <span key={`txt-end`} className="block">
          {renderMathSegment(afterText, `ta-end`)}
        </span>
      );
    }
  }

  return <Wrapper className={className}>{blocks}</Wrapper>;
};

