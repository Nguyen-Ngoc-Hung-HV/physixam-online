import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';

export interface HelpTooltipProps {
  title?: string;
  description: string;
  position?: 'top' | 'bottom';
  align?: 'center' | 'start' | 'end';
  children?: React.ReactNode;
  className?: string;
}

export const HelpTooltip: React.FC<HelpTooltipProps> = ({
  title,
  description,
  position = 'top',
  align = 'center',
  children,
  className = '',
}) => {
  const [isVisible, setIsVisible] = useState(false);

  const verticalClasses =
    position === 'top'
      ? 'bottom-full mb-2'
      : 'top-full mt-2';

  const horizontalClasses =
    align === 'start'
      ? 'left-0'
      : align === 'end'
      ? 'right-0'
      : 'left-1/2 -translate-x-1/2';

  return (
    <div
      className={`relative inline-flex items-center ${className}`}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      {children || (
        <button
          type="button"
          aria-label={title || description}
          className="inline-flex items-center justify-center p-1 rounded-full text-slate-400 hover:text-violet-300 focus:outline-none transition-colors"
        >
          <HelpCircle className="w-3.5 h-3.5" />
        </button>
      )}

      {isVisible && (
        <div
          role="tooltip"
          className={`no-print pointer-events-none absolute z-50 w-64 sm:w-72 p-3 rounded-xl bg-[#141728]/98 border border-violet-500/80 text-left shadow-2xl backdrop-blur-md transition-opacity duration-150 ${verticalClasses} ${horizontalClasses}`}
        >
          {title && (
            <div className="flex items-center gap-1.5 text-xs font-extrabold text-violet-300 mb-1">
              <HelpCircle className="w-3.5 h-3.5 text-violet-400 shrink-0" />
              <span>{title}</span>
            </div>
          )}
          <p className="text-[11px] sm:text-xs font-medium text-slate-200 leading-relaxed whitespace-normal">
            {description}
          </p>
        </div>
      )}
    </div>
  );
};
