import React, { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface MathRendererProps {
  content?: string | null;
  className?: string;
}

export const MathRenderer: React.FC<MathRendererProps> = ({ content = '', className = '' }) => {
  const renderedContent = useMemo(() => {
    if (!content) return '';
    let text = String(content);

    // 1. Tự động chuẩn hóa các công thức và đơn vị Vật lí thường gặp chưa có dấu $
    // Ví dụ: m_{1}, a_{2}, v_{0}, m/s^{2}, kg.m/s...
    text = text.replace(/([a-zA-Z])_\{([0-9a-zA-Z+-]+)\}/g, '$$$1_{$2}$$');
    text = text.replace(/(\d+(?:[.,]\d+)?)\s*(m\/s\^\{?2\}?|m\/s|km\/h|kg|N|J|W|Pa|rad\/s|cm\/s\^\{?2\}?)/gi, (_, num, unit) => {
      let cleanUnit = unit.replace(/\^\{?2\}?/, '^2');
      return `${num} $\\text{${cleanUnit}}$`;
    });

    // 2. Tách chuỗi theo các khối công thức $$...$$ (khối lớn) hoặc $...$ (nội dòng)
    const regex = /(\$\$[\s\S]*?\$\$|\$[^$\n]+?\$)/g;
    const parts = text.split(regex);

    return parts.map((part, index) => {
      if (part.startsWith('$$') && part.endsWith('$$')) {
        const math = part.slice(2, -2).trim();
        try {
          const html = katex.renderToString(math, { displayMode: true, throwOnError: false });
          return <span key={index} dangerouslySetInnerHTML={{ __html: html }} className="inline-block my-1" />;
        } catch {
          return <span key={index}>{part}</span>;
        }
      } else if (part.startsWith('$') && part.endsWith('$')) {
        const math = part.slice(1, -1).trim();
        try {
          const html = katex.renderToString(math, { displayMode: false, throwOnError: false });
          return <span key={index} dangerouslySetInnerHTML={{ __html: html }} className="inline-block mx-0.5" />;
        } catch {
          return <span key={index}>{part}</span>;
        }
      }
      return <span key={index}>{part}</span>;
    });
  }, [content]);

  return <span className={`math-rendered ${className}`}>{renderedContent}</span>;
};