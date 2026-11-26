import React from 'react';
import { CheckCircle2, Flag } from 'lucide-react';

export interface ExamProgressBarProps {
  completedCount: number;
  totalQuestionCount: number;
  flaggedCount?: number;
  part1Completed?: number;
  part1Total?: number;
  part2Completed?: number;
  part2Total?: number;
  part3Completed?: number;
  part3Total?: number;
  compact?: boolean;
}

export const ProgressBar: React.FC<ExamProgressBarProps> = ({
  completedCount,
  totalQuestionCount,
  flaggedCount = 0,
  part1Completed,
  part1Total,
  part2Completed,
  part2Total,
  part3Completed,
  part3Total,
  compact = false,
}) => {
  const safeTotal = Math.max(1, totalQuestionCount);
  const clampedCompleted = Math.min(safeTotal, Math.max(0, completedCount));
  const percentage = Math.round((clampedCompleted / safeTotal) * 100);
  const remainingCount = Math.max(0, totalQuestionCount - clampedCompleted);
  const isAllDone = clampedCompleted >= safeTotal && totalQuestionCount > 0;

  if (compact) {
    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-2 text-xs font-mono font-bold tabular-nums">
          <span className="text-slate-200">
            Tiến độ:{' '}
            <strong className={isAllDone ? 'text-emerald-400' : 'text-violet-300'}>
              {percentage}%
            </strong>
          </span>
          <span className="text-slate-300">
            {remainingCount === 0 ? 'Đã làm đủ' : `Còn ${remainingCount} câu`}
          </span>
        </div>
        <div
          role="progressbar"
          aria-valuenow={clampedCompleted}
          aria-valuemin={0}
          aria-valuemax={safeTotal}
          aria-label="Tiến độ hoàn thành câu hỏi"
          className="w-full h-2 rounded-full bg-slate-950/90 border border-slate-800 overflow-hidden p-0.5"
        >
          <div
            className={`h-full rounded-full transition-all duration-300 ease-out ${
              isAllDone
                ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                : 'bg-gradient-to-r from-indigo-500 via-violet-500 to-emerald-400'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full min-w-0 flex flex-wrap items-center justify-between gap-x-2 sm:gap-x-3 gap-y-1 pt-1 border-t border-slate-800/80">
      <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 text-[11px] sm:text-xs min-w-0">
        <span className="font-extrabold text-white flex items-center gap-1 whitespace-nowrap shrink-0">
          <CheckCircle2
            className={`w-3.5 h-3.5 shrink-0 ${
              isAllDone ? 'text-emerald-400' : 'text-violet-400'
            }`}
          />
          <span className="hidden sm:inline">Tiến Độ Hoàn Thành Bài Thi:</span>
          <span className="sm:hidden">Tiến độ:</span>
        </span>
        <span className="font-mono font-extrabold text-emerald-400 tabular-nums whitespace-nowrap">
          {clampedCompleted}/{totalQuestionCount} câu ({percentage}%)
        </span>
        <span aria-hidden="true" className="text-slate-500">
          ·
        </span>
        <span className="font-mono font-bold text-slate-200 tabular-nums whitespace-nowrap">
          {remainingCount === 0 ? (
            <span className="text-emerald-400 font-extrabold">
              Hoàn thành 100%
            </span>
          ) : (
            `Còn ${remainingCount} câu`
          )}
        </span>
      </div>

      {/* Inline Visual Progress Track (shown on sm+ so mobile doesn't overflow right margin) */}
      <div
        role="progressbar"
        aria-valuenow={clampedCompleted}
        aria-valuemin={0}
        aria-valuemax={safeTotal}
        aria-label="Thanh tiến độ số lượng câu hỏi đã hoàn thành"
        className="hidden sm:block flex-1 min-w-[80px] max-w-[160px] sm:max-w-xs h-2 rounded-full bg-slate-950 border border-slate-800 overflow-hidden p-0.5"
      >
        <div
          className={`h-full rounded-full transition-all duration-300 ease-out ${
            isAllDone
              ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
              : 'bg-gradient-to-r from-indigo-500 via-violet-500 to-emerald-400'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      <div className="flex flex-wrap items-center gap-1 text-[11px] font-mono font-bold tabular-nums shrink-0 max-w-full">
        {typeof part1Completed === 'number' && typeof part1Total === 'number' && part1Total > 0 && (
          <span className="px-1.5 py-0.5 rounded bg-slate-900/90 border border-slate-700 text-slate-200 whitespace-nowrap">
            P.I: <strong className="text-white">{part1Completed}/{part1Total}</strong>
          </span>
        )}
        {typeof part2Completed === 'number' && typeof part2Total === 'number' && part2Total > 0 && (
          <span className="px-1.5 py-0.5 rounded bg-slate-900/90 border border-slate-700 text-slate-200 whitespace-nowrap">
            P.II: <strong className="text-white">{part2Completed}/{part2Total}</strong>
          </span>
        )}
        {typeof part3Completed === 'number' && typeof part3Total === 'number' && part3Total > 0 && (
          <span className="px-1.5 py-0.5 rounded bg-slate-900/90 border border-slate-700 text-slate-200 whitespace-nowrap">
            P.III: <strong className="text-white">{part3Completed}/{part3Total}</strong>
          </span>
        )}
        {flaggedCount > 0 && (
          <span className="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500 text-amber-300 flex items-center gap-1 whitespace-nowrap">
            <Flag className="w-3 h-3" />
            <span>{flaggedCount}</span>
          </span>
        )}
      </div>
    </div>
  );
};
