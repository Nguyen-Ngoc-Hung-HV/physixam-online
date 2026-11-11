import React, { useEffect, useState } from 'react';

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
  // Match $$...$$ first, then $...$
  const regex = /(\$\$[\s\S]+?\$\$|\$(?:\\.|[^$\\])+\$)/g;
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
    if (raw.startsWith('$$') && raw.endsWith('$$')) {
      tokens.push({
        type: 'block-math',
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
  // Match _{...}, ^{...}, or identifier_subscript (e.g. c_X, m_nhôm, T_cb, c_nước, P_hp)
  const subSupRegex = /(\_\{([^{}]+)\}|\^\{([^{}]+)\}|\b([a-zA-ZĐđΔθ]+)\_([a-zA-Z0-9À-ỹ]+)\b)/g;
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
    }
    lastIdx = subSupRegex.lastIndex;
  }

  if (lastIdx < content.length) {
    parts.push(content.slice(lastIdx));
  }

  return parts.length > 0 ? parts : content;
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

  const tokens = tokenizeMath(text);
  const Wrapper = block ? 'div' : 'span';

  return (
    <Wrapper className={className}>
      {tokens.map((token, idx) => {
        if (token.type === 'text') {
          return <React.Fragment key={idx}>{renderFormattedPlainText(token.content)}</React.Fragment>;
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
                key={idx}
                className={isDisplay ? 'block my-2 overflow-x-auto' : 'inline-block align-baseline mx-0.5'}
                dangerouslySetInnerHTML={{ __html: html }}
              />
            );
          } catch {
            return (
              <code key={idx} className="font-mono text-violet-300 bg-violet-950/50 px-1 rounded">
                {token.content}
              </code>
            );
          }
        }

        return (
          <code key={idx} className="font-mono text-violet-600 dark:text-violet-300 px-1">
            {isDisplay ? `$$${token.content}$$` : `$${token.content}$`}
          </code>
        );
      })}
    </Wrapper>
  );
};
