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

    // 1. Chuẩn hóa chỉ số dưới: m_{1}, a_{2}, v_{0}, F_{ms}... nếu chưa có dấu $
    text = text.replace(/(?<!\$)\b([a-zA-Z])_\{?([0-9a-zA-Z+-]+)\}?(?!\$)/g, '$$$1_{$2}$$');

    // 2. Chuẩn hóa triệt để đơn vị gia tốc: m/s^{2}, m/s^2, m/s2 (có hoặc không có số đi kèm, có hoặc không có dấu câu phía sau)
    // Ví dụ: 10 m/s^{2}, 2 m/s^2, bao nhiêu m/s^{2}?, m/s2...
    text = text.replace(/(\b\d+(?:[.,]\d+)?\s*)?m\/s(?:\^\{?2\}?|2)(?=[.,;?!)\s]|$)/gi, (match) => {
      // Nếu đã nằm trong khối math $...$ thì bỏ qua
      return `$${match.trim().replace(/m\/s(?:\^\{?2\}?|2)/i, '\\text{ m/s}^2')}$`;
    });

    // 3. Chuẩn hóa các đơn vị Vật lí phổ biến khác: m/s, km/h, kg, rad/s, cm/s^2 khi đi kèm với số
    text = text.replace(/(\b\d+(?:[.,]\d+)?)\s*(km\/h|m\/s|rad\/s|cm\/s\^?\{?2\}?|kg|N|J|W|Pa|Hz|V|A|\\Omega)(?=[.,;?!)\s]|$)/gi, (_, num, unit) => {
      let cleanUnit = unit.replace(/\^\{?2\}?/, '^2');
      return `$${num}\\text{ ${cleanUnit}}$`;
    });

    // 4. Khắc phục trường hợp bị lồng 2 lớp dấu $$ sau khi thế
    text = text.replace(/\$\$+/g, '$');

    // 5. Tách và biên dịch KaTeX
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